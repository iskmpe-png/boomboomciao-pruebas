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
      throw E(r.status === 429 ? 'rate_limited' : 'unavailable', m || 'La IA no está disponible ahora mismo.');
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
  f.json = async (prompt, opts) => {
    opts = opts || {};
    const imgs = await Promise.all((opts.images || []).map(b64));
    const r = await llamar({ modo: 'json', texto: prompt, imagenes: imgs }, opts.signal),
      j = await r.json().catch(() => null);
    let t = String((j && j.text) || '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '');
    const a = t.indexOf('{'),
      z = t.lastIndexOf('}');
    try {
      return JSON.parse(a >= 0 && z > a ? t.slice(a, z + 1) : t);
    } catch (e) {
      throw E('invalid_json');
    }
  };
  f.limits = () => Promise.resolve({ images: { mediaTypes: ['image/jpeg', 'image/png', 'image/webp'], maxCount: 4 } });
  return f;
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
        S.ajustes = {
          id: 'empresa',
          nombre: String(d.ajustes.nombre || ''),
          periodo: PER[d.ajustes.periodo] ? d.ajustes.periodo : 'mensual',
        };
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
      S.ajustes = { id: 'empresa', nombre: String(x.nombre || ''), periodo: PER[x.periodo] ? x.periodo : 'mensual' };
    },
    () => {},
  );
  ruta();
}
const CU =
  window.claude && typeof window.claude.use === 'function'
    ? (n) => Promise.resolve(window.claude.use(n)).catch(() => null)
    : () => Promise.resolve(null);
