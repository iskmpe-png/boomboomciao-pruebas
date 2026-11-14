// @ts-nocheck
// Boom Boom Ciao · función "ia" (Supabase Edge Function)
// Hace de puente entre la app y Gemini. La clave de Gemini vive aquí, en el
// servidor (secreto GEMINI_API_KEY), y nunca llega a la app ni a GitHub.
// Solo responde a usuarios que han entrado y pertenecen al restaurante,
// y respeta el límite diario de consultas de cada restaurante.

const CLAVE = Deno.env.get("GEMINI_API_KEY") || "";
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const API = "https://generativelanguage.googleapis.com/v1beta/models/";
// Modelos por orden de preferencia. Si uno no existe o está saturado, se prueba el siguiente.
// Para fijar uno concreto, guarda el secreto GEMINI_MODEL con su nombre.
const MODELOS = [Deno.env.get("GEMINI_MODEL") || "", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash"]
  .filter((m, i, a) => m && a.indexOf(m) === i);
let preferido = 0;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const textoDe = (j) => {
  const c = j && Array.isArray(j.candidates) ? j.candidates[0] : null;
  const ps = c && c.content && Array.isArray(c.content.parts) ? c.content.parts : [];
  return ps.map((p) => (p && !p.thought && typeof p.text === "string" ? p.text : "")).join("");
};
const errorDe = (j, status) => {
  if (status === 429) return "La IA ha llegado a su límite de uso por ahora. Prueba en unos minutos.";
  const m = j && j.error && j.error.message;
  if (m && /api key/i.test(m)) return "La clave de Gemini no es válida. Revisa el secreto GEMINI_API_KEY en Supabase.";
  if (j && j.promptFeedback && j.promptFeedback.blockReason) return "La IA no pudo responder a esa petición.";
  return "La IA no pudo responder" + (m ? ": " + String(m).slice(0, 300) : ".");
};

// Llama a Gemini probando los modelos en orden. Devuelve la primera respuesta válida.
async function gemini(cuerpo, enDirecto) {
  let ultima = null;
  for (let k = 0; k < MODELOS.length; k++) {
    const i = (preferido + k) % MODELOS.length;
    const r = await fetch(API + MODELOS[i] + (enDirecto ? ":streamGenerateContent?alt=sse" : ":generateContent"), {
      method: "POST",
      headers: { "x-goog-api-key": CLAVE, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    if (r.ok) { preferido = i; return r; }
    if (!ultima || r.status !== 404) ultima = r; // si todos fallan, se informa del fallo más útil
    // 404: el modelo no existe. 429 y 503: sin cupo o saturado. En esos casos se prueba otro.
    if (r.status !== 404 && r.status !== 429 && r.status !== 503) break;
  }
  return ultima;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);
  try {
    if (!CLAVE) return json({ error: "Falta guardar la clave GEMINI_API_KEY en los secretos de Supabase." }, 500);

    // 1. Quién llama: tiene que ser un usuario con sesión iniciada.
    const auth = req.headers.get("Authorization") || "", apikey = req.headers.get("apikey") || "";
    if (!auth.startsWith("Bearer ") || !apikey) return json({ error: "Entra con tu cuenta para usar la IA." }, 401);
    const cab = { Authorization: auth, apikey };
    const ru = await fetch(SB_URL + "/auth/v1/user", { headers: cab });
    if (!ru.ok) return json({ error: "Tu sesión ha caducado. Sal y vuelve a entrar." }, 401);
    const usuario = await ru.json();

    // 2. Qué pide y si pertenece a ese restaurante.
    const b = await req.json().catch(() => null);
    if (!b || typeof b.texto !== "string" || !b.texto.trim()) return json({ error: "Petición vacía." }, 400);
    if (!/^[0-9a-f-]{36}$/i.test(String(b.rid || "")) || !/^[0-9a-f-]{36}$/i.test(String(usuario.id || ""))) return json({ error: "Restaurante no válido." }, 400);
    const rm = await fetch(SB_URL + "/rest/v1/miembros?select=rol&restaurante_id=eq." + b.rid + "&user_id=eq." + usuario.id, { headers: cab });
    const filas = rm.ok ? await rm.json() : [];
    if (!Array.isArray(filas) || !filas.length) return json({ error: "No tienes acceso a este restaurante." }, 403);

    // 3. Cupo diario del restaurante: la base de datos suma una consulta y dice si queda margen.
    //    Si esa parte aún no está instalada (script 4), se deja pasar.
    const rc = await fetch(SB_URL + "/rest/v1/rpc/contar_ia", {
      method: "POST",
      headers: { ...cab, "Content-Type": "application/json" },
      body: JSON.stringify({ p_rid: b.rid }),
    });
    if (rc.ok && (await rc.json().catch(() => true)) === false) {
      return json({ error: "Este restaurante ha llegado a su límite de consultas a la IA por hoy. Mañana se renueva; el administrador puede ampliarlo en Menú › Usuarios." }, 429);
    }

    // 4. Petición a Gemini.
    const imgs = (Array.isArray(b.imagenes) ? b.imagenes : []).slice(0, 4)
      .filter((i) => i && typeof i.data === "string" && /^image\/(jpeg|png|webp)$/.test(i.mime));
    const partes = [{ text: b.texto.slice(0, 400000) }, ...imgs.map((i) => ({ inline_data: { mime_type: i.mime, data: i.data } }))];
    const cuerpo = { contents: [{ role: "user", parts: partes }] };

    if (b.modo === "json") {
      let r = await gemini({ ...cuerpo, generationConfig: { responseMimeType: "application/json", temperature: 0.1 } }, false);
      if (r.status === 400) r = await gemini(cuerpo, false); // por si algún ajuste opcional no se acepta
      const j = await r.json().catch(() => null);
      if (!r.ok) return json({ error: errorDe(j, r.status) }, r.status === 429 ? 429 : 502);
      const t = textoDe(j);
      if (!t) return json({ error: errorDe(j, 200) }, 502);
      return json({ text: t });
    }

    // Chat: la respuesta se envía a la app según se va escribiendo.
    const r = await gemini(cuerpo, true);
    if (!r.ok || !r.body) {
      const j = await r.json().catch(() => null);
      return json({ error: errorDe(j, r.status) }, r.status === 429 ? 429 : 502);
    }
    const dec = new TextDecoder(), enc = new TextEncoder(), lector = r.body.getReader();
    const salida = new ReadableStream({
      async start(c) {
        let buf = "", n = 0;
        const linea = (l) => {
          l = l.trim();
          if (!l.startsWith("data:")) return;
          const d = l.slice(5).trim();
          if (!d || d === "[DONE]") return;
          try { const t = textoDe(JSON.parse(d)); if (t) { n++; c.enqueue(enc.encode(t)); } } catch (_e) { /* línea no JSON */ }
        };
        try {
          for (;;) {
            const { done, value } = await lector.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            let i;
            while ((i = buf.indexOf("\n")) >= 0) { linea(buf.slice(0, i)); buf = buf.slice(i + 1); }
          }
          if (buf) linea(buf);
          if (!n) { // si no llegó texto por partes, se pide la respuesta entera
            const r2 = await gemini(cuerpo, false), j2 = await r2.json().catch(() => null);
            c.enqueue(enc.encode((r2.ok && textoDe(j2)) || errorDe(j2, r2.status)));
          }
        } catch (_e) {
          if (!n) c.enqueue(enc.encode("Se cortó la conexión con la IA. Vuelve a preguntar."));
        }
        c.close();
      },
    });
    return new Response(salida, { headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" } });
  } catch (e) {
    return json({ error: "Error en el servidor de IA: " + String((e && e.message) || e).slice(0, 200) }, 500);
  }
});
