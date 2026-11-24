/* IA propia: la app llama a la función "ia" del servidor, que es quien habla con Gemini */
function iaNube() {
  const b64 = (bl) =>
    new Promise((ok, ko) => {
      const fr = new FileReader();
      fr.onload = () => ok({ data: String(fr.result).split(',')[1] || '', mime: bl.type || 'image/jpeg' });
      fr.onerror = () => ko(new Error('img'));
      fr.readAsDataURL(bl);
    });
  const E = (code, msg) => {
    const e = new Error(msg || code);
    e.code = code;
    if (msg) e.msgIA = msg;
    return e;
  };
  async function llamar(cuerpo, signal) {
    let tok = '';
    try {
      const q = await sb.auth.getSession();
      tok = (q.data && q.data.session && q.data.session.access_token) || '';
    } catch (e) {}
    if (!tok) throw E('session_expired', 'Tu sesión ha caducado. Sal y vuelve a entrar.');
    let r;
    try {
      r = await fetch(CFG.url + '/functions/v1/ia', {
        method: 'POST',
        signal: signal,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: CFG.key },
        body: JSON.stringify(Object.assign({ rid: rid }, cuerpo)),
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw E('cancelled');
      throw E('red', 'Sin conexión con la IA. Revisa internet y vuelve a intentarlo.');
    }
    if (!r.ok) {
      let m = '';
      try {
        m = (await r.json()).error || '';
      } catch (e) {}
      if (r.status === 404) m = 'La IA todavía no está activada en el servidor.';
      const er = E(r.status === 429 ? 'rate_limited' : 'unavailable', m || 'La IA no está disponible ahora mismo.');
      /* Solo merece la pena repetir si Google estaba saturado o la función se quedó sin tiempo */
      er.pasajero = r.status === 503 || r.status === 504 || r.status === 546 || /saturad|high demand|try again|overloaded/i.test(m);
      throw er;
    }
    return r;
  }
  const plano = (input) =>
    typeof input === 'string'
      ? input
      : input.map((m) => (m.role === 'user' ? 'USUARIO' : 'ASISTENTE') + ':\n' + m.content).join('\n\n') +
        (input.length > 1
          ? '\n\nResponde ahora al último mensaje del USUARIO, teniendo en cuenta la conversación.'
          : '');
  const f = async (input, opts) => {
    opts = opts || {};
    const r = await llamar({ modo: 'chat', texto: plano(input) }, opts.signal);
    let text = '';
    try {
      const rd = r.body.getReader(),
        dec = new TextDecoder();
      for (;;) {
        const x = await rd.read();
        if (x.done) break;
        text += dec.decode(x.value, { stream: true });
        if (opts.onText) opts.onText({ text: text });
      }
    } catch (e) {
      const er = E(
        e && e.name === 'AbortError' ? 'cancelled' : 'red',
        e && e.name === 'AbortError' ? '' : 'Se cortó la conexión con la IA.',
      );
      er.text = text;
      throw er;
    }
    return { text: text, truncated: false };
  };
  async function jsonUnaVez(prompt, imgs, opts) {
    const r = await llamar({ modo: 'json', texto: prompt, imagenes: imgs, nivel: opts.nivel || '' }, opts.signal),
      j = await r.json().catch(() => null);
    const t = String((j && j.text) || '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '');
    const d = leerJSON(t);
    if (d == null) throw E('invalid_json');
    return d;
  }
  /* Si falla por algo pasajero (red, IA saturada, respuesta cortada) se vuelve a intentar sola */
  f.json = async (prompt, opts) => {
    opts = opts || {};
    const imgs = await Promise.all((opts.images || []).map(b64));
    for (let intento = 0; ; intento++) {
      try {
        return await jsonUnaVez(prompt, imgs, opts);
      } catch (e) {
        const max = e && (e.code === 'red' || e.code === 'invalid_json') ? 2 : e && e.code === 'unavailable' && e.pasajero ? 1 : 0;
        if (intento >= max || (opts.signal && opts.signal.aborted)) throw e;
        await new Promise((ok) => setTimeout(ok, 2000 * (intento + 1)));
      }
    }
  };
  f.limits = () => Promise.resolve({ images: { mediaTypes: ['image/jpeg', 'image/png', 'image/webp'], maxCount: 4 } });
  return f;
}
/* Lee el JSON de la IA. Si la respuesta llegó cortada (pasa con listas muy largas),
   se queda con todo lo que estaba completo en vez de perderlo entero. */
function leerJSON(t) {
  const a = t.indexOf('{');
  if (a < 0) return null;
  t = t.slice(a);
  try {
    return JSON.parse(t.slice(0, t.lastIndexOf('}') + 1));
  } catch (e) {}
  let fin = t.length;
  for (let n = 0; n < 60; n++) {
    fin = t.lastIndexOf('}', fin - 1);
    if (fin < 0) return null;
    const trozo = t.slice(0, fin + 1),
      pila = [];
    let enTexto = false,
      esc = false;
    for (const ch of trozo) {
      if (enTexto) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') enTexto = false;
      } else if (ch === '"') enTexto = true;
      else if (ch === '{' || ch === '[') pila.push(ch === '{' ? '}' : ']');
      else if (ch === '}' || ch === ']') pila.pop();
    }
    if (enTexto) continue;
    try {
      return JSON.parse(trozo + pila.reverse().join(''));
    } catch (e) {}
  }
  return null;
}
function nube() {
  try {
    sb = window.supabase.createClient(CFG.url, CFG.key);
  } catch (e) {
    local();
    return;
  }
  if (CFG.entorno === 'pruebas') $('entorno').hidden = false;
  acceso('cargando');
  sb.auth.onAuthStateChange((ev, s) => {
    setTimeout(() => cambioSesion(s, ev), 0);
  });
}
function local() {
  try {
    const d = JSON.parse(mem('esc2.datos') || 'null');
    if (d) {
      COLS.forEach((c) => {
        S[c] = (d[c] || []).map(NORM[c]);
      });
      if (d.ajustes)
        S.ajustes = nAjustes(d.ajustes);
    }
  } catch (e) {}
  sucio();
  COLS.forEach(sombrear);
  esLocal = true;
  $('btn-restaurar').hidden = false;
  $('m-copia').hidden = false;
  aviso('Los datos se guardan solo en este dispositivo. Haz copias desde el menú.');
  const np = mem('bbc.nivelPrueba');
  if (np === 'view' || np === 'interact') setNivel(np);
  else $('rol').textContent = NIVTXT.admin;
  ruta();
}
function remoto(d) {
  db = d;
  const t = setTimeout(() => aviso('Todavía no se pueden cargar los datos guardados. Seguimos intentándolo.'), 10000);
  let falta = COLS.length;
  const hecho = () => {
    if (falta > 0 && --falta === 0) {
      clearTimeout(t);
      if (!soloLectura) aviso('');
    }
  };
  COLS.forEach((col) => {
    let primero = true;
    db.collection(col)
      .limit(1000)
      .onSnapshot(
        (snap) => {
          if (primero && !snap.metadata.fromCache) {
            primero = false;
            hecho();
          }
          recibir(
            col,
            snap.docs.map((x) => {
              const o = JSON.parse(JSON.stringify(x.data() || {}));
              o.id = x.id;
              return o;
            }),
          );
        },
        () => {
          clearTimeout(t);
          cargado[col] = true;
          aviso('No se pudo conectar con los datos guardados. Recarga la página más tarde.');
          pintar();
        },
      );
  });
  db.doc('ajustes/empresa').onSnapshot(
    (s) => {
      if (!s.exists || busy('ajustes', 'empresa')) return;
      const x = s.data() || {};
      const antes = S.ajustes.grupos.join('|');
      S.ajustes = nAjustes(x);
      dlSucio = true;
      /* Si otro dispositivo cambió los grupos de la carta, se vuelve a pintar la lista */
      if (antes !== S.ajustes.grupos.join('|') && pant === 'carta' && !abierta && !escImp) pintar();
    },
    () => {},
  );
  ruta();
}
const CU =
  window.claude && typeof window.claude.use === 'function'
    ? (n) => Promise.resolve(window.claude.use(n)).catch(() => null)
    : () => Promise.resolve(null);
