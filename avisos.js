/* ---- Notificaciones al móvil ----
   Cada persona activa los avisos en su propio móvil. El servidor (función «avisos») los envía
   a su hora aunque la app esté cerrada. En iPhone hace falta iOS 16.4 o superior y tener la app
   añadida a la pantalla de inicio. */
const pushSoporte = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalada = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
let pushSub = null,
  pushMiro = false,
  pushIds = new Set(); // personas del equipo con avisos activados
const b64u = (s) => {
  const b = atob((s + '==='.slice((s.length + 3) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
async function llamarAvisos(cuerpo) {
  let tok = '';
  try {
    const q = await sb.auth.getSession();
    tok = (q.data && q.data.session && q.data.session.access_token) || '';
  } catch (e) {}
  let r;
  try {
    r = await fetch(CFG.url + '/functions/v1/avisos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (tok || CFG.key), apikey: CFG.key },
      body: JSON.stringify(Object.assign({ rid: rid }, cuerpo)),
    });
  } catch (e) {
    throw new Error('Sin conexión. Revisa internet y vuelve a intentarlo.');
  }
  let d = {};
  try {
    d = await r.json();
  } catch (e) {}
  if (r.status === 404) throw new Error('Los avisos todavía no están activados en el servidor (falta la función «avisos»).');
  if (!r.ok) throw new Error(d.error || 'El servidor de avisos no responde.');
  return d;
}
async function pushActual() {
  if (!pushSoporte()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? await reg.pushManager.getSubscription() : null;
  } catch (e) {
    return null;
  }
}
async function activarPush() {
  if (Notification.permission === 'denied') throw new Error('Este móvil tiene bloqueadas las notificaciones de la app. Actívalas en los ajustes del móvil y vuelve a intentarlo.');
  const per = await Notification.requestPermission();
  if (per !== 'granted') throw new Error('Sin permiso no se pueden enviar avisos. Pulsa «Permitir» cuando el móvil lo pregunte.');
  const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, ko) => setTimeout(() => ko(new Error('La app todavía se está instalando en el móvil. Ciérrala, vuelve a abrirla y prueba otra vez.')), 10000)),
    ]),
    k = await llamarAvisos({ accion: 'clave' });
  if (!k.clave) throw new Error('El servidor de avisos no tiene llave.');
  let s = await reg.pushManager.getSubscription();
  if (!s) s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(k.clave) });
  const j = s.toJSON();
  const r = await sb.rpc('guardar_push', { p_rid: rid, p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: navigator.userAgent.slice(0, 200) });
  if (r.error) throw new Error(/function|schema/i.test(r.error.message || '') ? 'Falta ejecutar el script 6 en la base de datos.' : r.error.message);
  pushSub = s;
  if (miId) pushIds.add(miId);
}
async function desactivarPush() {
  const s = await pushActual();
  if (!s) return;
  try {
    await sb.rpc('quitar_push', { p_endpoint: s.endpoint });
  } catch (e) {}
  await s.unsubscribe();
  pushSub = null;
  if (miId) pushIds.delete(miId);
}
function cargarPushIds() {
  if (!enNube()) return;
  sb.rpc('push_activos', { p_rid: rid }).then(
    (r) => {
      if (r && !r.error && Array.isArray(r.data)) {
        pushIds = new Set(r.data.map((x) => (typeof x === 'string' ? x : x.push_activos || x.user_id)));
        if (pant === 'turnos') pintaDestinos();
      }
    },
    () => {},
  );
}
/* Tarjeta «Avisos en este móvil» */
function pushHTML() {
  return '<section class="card" id="push-card" data-libre><h3>Avisos en este móvil</h3><div id="push-est"><p class="hint">Comprobando…</p></div></section>';
}
async function pintaPush() {
  const el = $('push-est');
  if (!el) return;
  let h = '';
  if (window.claude || !enNube()) h = '<p class="hint">Los avisos llegan a la app instalada en el móvil, con la sesión iniciada. En esta vista no se pueden activar.</p>';
  else if (esIOS() && !instalada())
    h = '<p class="hint">En iPhone, primero añade la app a la pantalla de inicio: en Safari pulsa <b>Compartir</b> › <b>Añadir a pantalla de inicio</b>. Ábrela desde ese icono y vuelve aquí para activar los avisos (necesita iOS 16.4 o superior).</p>';
  else if (!pushSoporte()) h = '<p class="hint">Este navegador no admite notificaciones. En Android usa Chrome; en iPhone, la app añadida a la pantalla de inicio.</p>';
  else {
    if (!pushMiro) {
      pushSub = await pushActual();
      pushMiro = true;
    }
    const on = !!pushSub && Notification.permission === 'granted';
    h = on
      ? '<p><span class="pill ok">Activados</span> Te llegarán tus turnos y los recordatorios aunque la app esté cerrada.</p><div class="acciones"><button class="btn small" type="button" data-act="push-probar">Enviar una prueba</button><button class="btn small" type="button" data-act="push-off">Desactivar en este móvil</button></div>'
      : '<p class="hint">Actívalos para que te avise el móvil cuando te toque una tarea o un turno, aunque no tengas la app abierta.</p><div class="acciones"><button class="btn primary" type="button" data-act="push-on">Activar avisos</button></div>';
  }
  el.innerHTML = h;
}
V.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act^="push-"]');
  if (!b) return;
  const a = b.dataset.act;
  b.disabled = true;
  try {
    if (a === 'push-on') {
      await activarPush();
      toast('Avisos activados en este móvil.');
    } else if (a === 'push-off') {
      await desactivarPush();
      toast('Avisos desactivados en este móvil.');
    } else if (a === 'push-probar') {
      const r = await llamarAvisos({ accion: 'prueba' });
      toast(r.enviados ? 'Prueba enviada: debería llegarte en unos segundos.' : 'No se pudo enviar. Desactiva y vuelve a activar los avisos.');
    }
  } catch (er) {
    toast(er.message || 'No se pudo.');
  }
  b.disabled = false;
  pintaPush();
  if (pant === 'turnos') pintaDestinos();
});
