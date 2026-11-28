/* ---- Tablet de fichaje ----
   No tiene usuario: solo una clave propia, que el usuario maestro puede anular. Enseña el código que
   cambia cada 30 segundos, quién está dentro por áreas y permite fichar con PIN a quien no use su móvil. */
const quioscoClave = () => mem('bbc.quiosco') || '';
const Q = { cli: null, d: null, leido: 0, quedan: 0, persona: '', msg: '', pin: false, toca: 0, qr: '', pidiendo: false };
const Q_AREAS = [['cocina', 'Cocina'], ['barra', 'Barra'], ['sala', 'Sala'], ['todas', 'Dirección']];

function iniciarQuiosco() {
  if (Q.cli) return;
  Q.cli = window.supabase.createClient((CFG || {}).url, (CFG || {}).key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'bbc-quiosco' } });
  document.body.classList.add('en-quiosco');
  document.body.style.overflow = 'hidden';
  ['acceso', 'capa', 'usuarios'].forEach((i) => $(i) && ($(i).hidden = true));
  $('quiosco').hidden = false;
  $('quiosco').innerHTML = '<div class="q-izq"><h2>Fichaje</h2><div class="q-qr" id="q-qr"></div><div class="q-cod" id="q-cod">······</div><div class="q-barra"><i id="q-barra"></i></div><p id="q-pie">Conectando…</p></div><div class="q-der" id="q-der"></div>';
  $('quiosco').addEventListener('click', quioscoPulsa);
  $('quiosco').addEventListener('submit', quioscoPin);
  pedirQuiosco();
  setInterval(tictac, 1000);
  despierta();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      despierta();
      pedirQuiosco();
    }
  });
}
/* La pantalla no se apaga */
function despierta() {
  if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {});
}
async function pedirQuiosco() {
  if (Q.pidiendo) return;
  Q.pidiendo = true;
  try {
    const r = await Q.cli.rpc('quiosco_estado', { p_clave: quioscoClave() });
    if (r.error) throw r.error;
    if (!r.data.ok) {
      Q.d = null;
      $('q-qr').innerHTML = '';
      $('q-cod').textContent = '';
      $('q-pie').textContent = r.data.error;
      $('q-der').innerHTML = '<p>' + esc(r.data.error) + '</p><button class="btn primary" type="button" data-q="salir">Salir del modo tablet</button>';
      return;
    }
    Q.d = r.data;
    Q.leido = Date.now();
    Q.quedan = r.data.quedan;
    pintaCodigo();
    if (!Q.persona) pintaPanel();
  } catch (e) {
    if (Date.now() - Q.leido > 45000) {
      $('q-qr').innerHTML = '';
      $('q-cod').textContent = '······';
      $('q-pie').textContent = 'Sin conexión. Usad la hoja de emergencia hasta que vuelva internet.';
      Q.qr = '';
    }
  } finally {
    Q.pidiendo = false;
  }
}
async function pintaCodigo() {
  const d = Q.d;
  if (!d) return;
  $('q-cod').textContent = d.codigo.slice(0, 3) + ' ' + d.codigo.slice(3);
  if (Q.qr === d.qr && $('q-qr').firstChild) return;
  Q.qr = d.qr;
  try {
    await cargarLib('qrcode-generator.js?v=40', 'qrcode');
    const q = window.qrcode(0, 'M');
    q.addData(d.qr);
    q.make();
    $('q-qr').innerHTML = q.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
  } catch (e) {
    $('q-qr').innerHTML = '';
  }
}
function tictac() {
  if (!Q.d) {
    if (Date.now() % 10000 < 1000) pedirQuiosco();
    return;
  }
  const pasado = Math.floor((Date.now() - Q.leido) / 1000),
    queda = Math.max(0, Q.quedan - pasado);
  $('q-barra').style.width = (queda / 30) * 100 + '%';
  $('q-pie').textContent = 'El código cambia en ' + queda + ' s · Escanéalo con tu móvil';
  if ($('q-reloj')) $('q-reloj').textContent = horaMad(Date.now());
  if (queda <= 0 || pasado >= 10) pedirQuiosco();
  /* Si alguien deja a medias el PIN, se vuelve solo a la pantalla principal */
  if (Q.persona && Date.now() - Q.toca > 30000) {
    Q.persona = '';
    Q.pin = false;
    Q.msg = '';
    pintaPanel();
  }
}
function pintaPanel() {
  const d = Q.d,
    o = $('q-der');
  if (!d || !o) return;
  const cab = '<div class="acciones" style="justify-content:space-between"><span class="q-reloj" id="q-reloj">' + horaMad(Date.now()) + '</span><span>' + esc(diaTxt(diaMad())) + ' · ' + esc(d.local) + '</span></div>' + (Q.msg ? '<p class="est ok" role="status">' + esc(Q.msg) + '</p>' : '');
  if (Q.persona) {
    const p = d.personas.find((x) => x.id === Q.persona);
    if (!p) {
      Q.persona = '';
      return pintaPanel();
    }
    const pasos = p.estado === 'fuera' ? [['entrada', 'Entrada']] : p.estado === 'dentro' ? [['pausa', 'Pausa'], ['salida', 'Salida']] : [['vuelta', 'Volver'], ['salida', 'Salida']];
    o.innerHTML = cab + '<h2>' + esc(p.nombre) + '</h2>' +
      (p.pin
        ? '<form id="q-form" class="col" novalidate><label for="q-pin">Tu PIN</label><input id="q-pin" class="fich-cod" type="password" inputmode="numeric" autocomplete="off" maxlength="8">' +
          pasos.map((x, i) => '<button class="btn grande ' + (i === pasos.length - 1 ? 'oro' : 'primary') + '" type="submit" value="' + x[0] + '">Fichar ' + x[1].toLowerCase() + '</button>').join('') + '<p class="hint" id="q-msg" role="status"></p></form>'
        : '<p>Todavía no tienes PIN. Créalo en tu móvil (Fichar) o pídeselo a dirección.</p>') +
      '<button class="btn" type="button" data-q="atras">Volver</button>';
    if ($('q-pin')) $('q-pin').focus();
    return;
  }
  const dentro = (p) => p.estado === 'dentro' || p.estado === 'pausa';
  if (Q.pin) {
    o.innerHTML = cab + '<h3>¿Quién eres?</h3>' +
      Q_AREAS.map((a) => {
        const g = d.personas.filter((p) => p.area === a[0]);
        return g.length ? '<div><span class="area-chip" data-a="' + a[0] + '">' + a[1] + '</span><div class="acciones">' + g.map((p) => '<button class="btn" type="button" data-q="persona" data-id="' + esc(p.id) + '">' + esc(p.nombre) + '</button>').join('') + '</div></div>' : '';
      }).join('') +
      '<button class="btn" type="button" data-q="atras">Volver</button>';
    return;
  }
  o.innerHTML = cab +
    Q_AREAS.map((a) => {
      const g = d.personas.filter((p) => p.area === a[0] && dentro(p) && p.modo !== 'distancia');
      if (a[0] === 'todas' && !g.length) return '';
      return '<section class="card"><div class="acciones" style="justify-content:space-between"><span class="area-chip" data-a="' + a[0] + '">' + a[1] + '</span><b>' + g.length + ' dentro</b></div>' +
        g.map((p) => '<div class="q-persona"><span>' + esc(p.nombre) + '</span><span class="hint">' + (p.estado === 'pausa' ? 'en pausa' : p.desde ? 'desde ' + horaMad(p.desde) : '') + '</span></div>').join('') + '</section>';
    }).join('') +
    '<button class="btn grande primary" type="button" data-q="sinmovil">Fichar sin móvil (con PIN)</button>' +
    '<button class="link" type="button" data-q="salir">Salir del modo tablet</button>';
}
function quioscoPulsa(e) {
  const b = e.target.closest('[data-q]');
  Q.toca = Date.now();
  if (!b) return;
  const a = b.dataset.q;
  if (a === 'sinmovil') {
    Q.pin = true;
    Q.persona = '';
    Q.msg = '';
  } else if (a === 'persona') Q.persona = b.dataset.id;
  else if (a === 'atras') {
    if (Q.persona) Q.persona = '';
    else Q.pin = false;
  } else if (a === 'salir') {
    if (!window.confirm('Esta tablet dejará de enseñar el código y habrá que volver a prepararla. ¿Salir?')) return;
    try {
      localStorage.removeItem(PFX + 'bbc.quiosco');
    } catch (err) {}
    location.reload();
    return;
  }
  pintaPanel();
}
async function quioscoPin(e) {
  e.preventDefault();
  Q.toca = Date.now();
  const paso = e.submitter && e.submitter.value,
    pin = $('q-pin').value.trim(),
    p = Q.d.personas.find((x) => x.id === Q.persona);
  if (!paso || !p) return;
  if (!pin) return ($('q-msg').textContent = 'Escribe tu PIN.');
  $('q-msg').textContent = 'Fichando…';
  const r = await Q.cli.rpc('quiosco_fichar', { p_clave: quioscoClave(), p_user: p.id, p_pin: pin, p_tipo: paso });
  if (r.error || !r.data.ok) {
    if ($('q-msg')) $('q-msg').textContent = r.error ? 'No se ha podido fichar. Revisa la conexión.' : r.data.error;
    if ($('q-pin')) $('q-pin').value = '';
    return;
  }
  Q.msg = '✓ ' + p.nombre + ': ' + TIPO_F[paso].toLowerCase() + ' a las ' + horaMad(Date.now());
  Q.persona = '';
  Q.pin = false;
  await pedirQuiosco();
  setTimeout(() => {
    Q.msg = '';
    if (!Q.persona) pintaPanel();
  }, 8000);
}
