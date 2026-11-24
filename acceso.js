/* Pantalla de entrada */
let codigoNuevo = '',
  trasCodigo = null;
/* Captcha contra bots en el registro (Cloudflare Turnstile). Solo se activa si en config.js hay
   «turnstile: 'clave del sitio'» y la función «cuentas» tiene el secreto TURNSTILE_SECRET. */
function captchaHTML() {
  const k = CFG && CFG.turnstile;
  if (!k) return '';
  if (!document.getElementById('cf-ts')) {
    const sc = document.createElement('script');
    sc.id = 'cf-ts';
    sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    sc.async = true;
    sc.defer = true;
    document.head.appendChild(sc);
  }
  return '<div class="cf-turnstile" data-sitekey="' + esc(k) + '" data-language="es"></div>';
}
const captchaTok = () => {
  const i = document.querySelector('#acceso [name="cf-turnstile-response"]');
  return i ? i.value : '';
};
const OJO =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
function acceso(modo, msg) {
  const a = $('acceso');
  a.hidden = false;
  let h =
    '<div class="ac-caja"><div class="ac-logo"><img src="logo-oro.png" alt="Boom Boom Ciao" width="150" height="63"></div>';
  if (modo === 'entrar')
    h +=
      '<h2>Entrar</h2><form id="form-entrar" class="col" novalidate><div class="field"><label for="ac-email">Usuario o correo</label><input id="ac-email" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>' +
      '<div class="field"><label for="ac-pass">Contraseña</label><input id="ac-pass" type="password" autocomplete="current-password" required></div><button class="btn primary" type="submit">Entrar</button></form>' +
      '<div class="ac-pie"><button class="link" type="button" data-ac="crear">Soy nuevo: crear mi cuenta</button><button class="link" type="button" data-ac="olvido">He olvidado mi contraseña</button>' +
      (cacheYo() ? '<button class="link" type="button" data-ac="sinred">Trabajar sin conexión</button>' : '') +
      '</div>';
  else if (modo === 'olvido')
    h +=
      '<h2>Recuperar contraseña</h2>' +
      '<details class="ac-rec" open><summary><b>Entro con usuario</b> (sin correo)</summary><p class="hint">Usa tu <b>código de recuperación</b> (lo creas en Menú › Mi cuenta). Si no tienes, pide al encargado que te ponga una contraseña nueva desde Usuarios.</p><form id="form-recuperar" class="col" novalidate>' +
      '<div class="field"><label for="ac-usu">Usuario</label><input id="ac-usu" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>' +
      '<div class="field"><label for="ac-rcod">Código de recuperación</label><input id="ac-rcod" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" required></div>' +
      '<div class="field"><label for="ac-pass">Contraseña nueva (8 caracteres o más)</label><input id="ac-pass" type="password" autocomplete="new-password" minlength="8" required></div>' +
      '<div class="field"><label for="ac-pass2">Repítela</label><input id="ac-pass2" type="password" autocomplete="new-password" required></div>' +
      '<button class="btn primary" type="submit">Poner contraseña nueva</button></form></details>' +
      '<details class="ac-rec"><summary><b>Entro con correo</b></summary><p class="hint">Escríbelo y te enviamos un enlace.</p><form id="form-olvido" class="col" novalidate><div class="field"><label for="ac-email">Correo</label><input id="ac-email" type="email" autocomplete="email" inputmode="email" required></div><button class="btn primary" type="submit">Enviar enlace</button></form></details>' +
      '<button class="link" type="button" data-ac="entrar">Volver a entrar</button>';
  else if (modo === 'codigo')
    h +=
      '<h2>Guarda tu código de recuperación</h2><p>Si algún día olvidas la contraseña, con tu usuario y este código pones una nueva tú solo.</p><p class="mc-codigo"><code>' + esc(codigoNuevo) + '</code></p><p class="hint"><b>Hazle una foto o apúntalo ahora:</b> no se vuelve a enseñar. Puedes crear otro cuando quieras en Menú › Mi cuenta.</p><button class="btn primary" type="button" data-ac="seguir">Ya lo he guardado: entrar</button>';
  else if (modo === 'nueva')
    h +=
      '<h2>Contraseña nueva</h2><form id="form-nueva" class="col" novalidate><div class="field"><label for="ac-pass">Contraseña nueva (8 caracteres o más)</label><input id="ac-pass" type="password" autocomplete="new-password" minlength="8" required></div><div class="field"><label for="ac-pass2">Repítela</label><input id="ac-pass2" type="password" autocomplete="new-password" required></div><button class="btn primary" type="submit">Guardar contraseña</button></form>' +
      (nubeViva ? '<button class="link" type="button" data-ac="cerrar">Cancelar</button>' : '');
  else if (modo === 'crear')
    h +=
      '<h2>Crear mi cuenta</h2><p class="hint">No hace falta correo. Pide el <b>código del restaurante</b> a tu encargado; cuando te apruebe, ya puedes entrar.</p><form id="form-unirse" class="col" novalidate>' +
      '<div class="field"><label for="ac-cod">Código del restaurante</label><input id="ac-cod" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-2345" required></div>' +
      '<div class="field"><label for="ac-nombre">Tu nombre y apellido</label><input id="ac-nombre" type="text" autocomplete="name" required></div>' +
      '<div class="field"><label for="ac-email">Usuario para entrar</label><input id="ac-email" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="sandra.perez" required><span class="hint">Sin espacios. Si prefieres, puedes poner tu correo.</span></div>' +
      '<div class="field"><label for="ac-pass">Contraseña (8 caracteres o más)</label><input id="ac-pass" type="password" autocomplete="new-password" minlength="8" required></div>' + casillaLegalHTML() + captchaHTML() + '<button class="btn primary" type="submit">Crear cuenta</button></form>' +
      '<button class="link" type="button" data-ac="entrar">Ya tengo cuenta: entrar</button><button class="link" type="button" data-ac="crear-dueno">Soy el dueño y aún no hay restaurante</button>';
  else if (modo === 'crear-dueno')
    h +=
      '<h2>Cuenta del dueño</h2><form id="form-crear" class="col" novalidate><div class="field"><label for="ac-nombre">Tu nombre</label><input id="ac-nombre" type="text" autocomplete="name" required></div>' +
      '<div class="field"><label for="ac-email">Correo</label><input id="ac-email" type="email" autocomplete="email" inputmode="email" required></div>' +
      '<div class="field"><label for="ac-pass">Contraseña (8 caracteres o más)</label><input id="ac-pass" type="password" autocomplete="new-password" minlength="8" required></div>' + casillaLegalHTML() + '<button class="btn primary" type="submit">Crear cuenta</button></form>' +
      '<button class="link" type="button" data-ac="crear">Volver</button>';
  else if (modo === 'espera')
    h +=
      '<h2>Hola, ' +
      esc(yo.nombre) +
      '</h2>' +
      (esPlat
        ? '<p>Todavía no hay ningún restaurante. Crea el primero y quedarás como dueño.</p><form id="form-rest0" class="col" novalidate><div class="field"><label for="ac-rest">Nombre del restaurante</label><input id="ac-rest" type="text" autocomplete="off" value="Boom Boom Ciao" required></div><button class="btn primary" type="submit">Crear restaurante</button></form>'
        : pendientes.length
          ? '<p><b>Tu solicitud está enviada.</b> El dueño de ' + esc(pendientes.join(', ')) + ' tiene que aprobarte y decir si eres de cocina o de barra. Cuando lo haga, entra de nuevo.</p><button class="btn primary" type="button" data-ac="reintentar">Comprobar de nuevo</button>'
          : '<p>Tu cuenta está creada, pero aún no perteneces a ningún restaurante. Escribe el código que te dé tu encargado:</p><form id="form-codigo" class="col" novalidate><div class="field"><label for="ac-cod">Código del restaurante</label><input id="ac-cod" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-2345" required></div><button class="btn primary" type="submit">Pedir acceso</button></form><button class="link" type="button" data-ac="reintentar">Comprobar de nuevo</button>') +
      '<button class="link" type="button" data-ac="salir">Salir de esta cuenta</button>';
  else if (modo === 'error')
    h +=
      '<h2>No se pudo entrar</h2><button class="btn primary" type="button" data-ac="reintentar">Reintentar</button><button class="link" type="button" data-ac="salir">Salir de esta cuenta</button>';
  else h += '<p class="hint">Cargando…</p>';
  a.innerHTML =
    h +
    '<p class="hint" id="ac-msg" role="status">' +
    esc(msg || '') +
    '</p>' +
    (modo === 'entrar'
      ? '<button class="link" type="button" data-ac="legal" style="font-weight:500">Privacidad, términos y cookies</button>'
      : '') +
    '</div>';
  /* Ojo para ver u ocultar la contraseña mientras se escribe */
  a.querySelectorAll('input[type=password]').forEach((inp) => {
    const caja = document.createElement('div'),
      b = document.createElement('button');
    caja.className = 'clave';
    inp.parentNode.insertBefore(caja, inp);
    caja.appendChild(inp);
    b.type = 'button';
    b.className = 'ojo';
    b.dataset.ac = 'ojo';
    b.setAttribute('aria-label', 'Mostrar contraseña');
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = OJO;
    caja.appendChild(b);
  });
  const f = a.querySelector('input');
  if (f && modo !== 'espera') f.focus({ preventScroll: true });
}
const acMsg = (t) => {
  const m = $('ac-msg');
  if (m) m.textContent = t || '';
};
$('acceso').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ac]');
  if (!b) return;
  const a = b.dataset.ac;
  if (a === 'ojo') {
    const inp = b.parentNode.querySelector('input'),
      ver = inp.type === 'password';
    inp.type = ver ? 'text' : 'password';
    b.setAttribute('aria-pressed', String(ver));
    b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
    inp.focus();
    return;
  }
  if (a === 'crear' || a === 'entrar' || a === 'olvido' || a === 'crear-dueno') acceso(a);
  else if (a === 'legal') verLegal();
  else if (a === 'seguir' && trasCodigo) {
    const f = trasCodigo;
    trasCodigo = null;
    codigoNuevo = '';
    acceso('cargando');
    f().then((q) => q && q.error && acceso('entrar', errTxt(q.error)));
  }
  else if (a === 'sinred') entrarSinRed(cacheYo());
  else if (a === 'cerrar') {
    $('acceso').hidden = true;
    $('acceso').innerHTML = '';
  } else if (a === 'salir') salirNube();
  else if (a === 'reintentar') {
    acceso('cargando');
    entrarNube();
  }
});
$('acceso').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target,
    bt = f.querySelector('button[type=submit]');
  if (bt.disabled) return;
  const v = (id) => {
    const el = $(id);
    return el ? el.value.trim() : '';
  };
  try {
    if (f.id === 'form-unirse') {
      const cod = v('ac-cod').toUpperCase().replace(/[^A-Z0-9]/g, ''),
        usu = v('ac-email'),
        pass = $('ac-pass').value;
      if (cod.length < 6) return acMsg('Escribe el código del restaurante (te lo da tu encargado).');
      if (!v('ac-nombre')) return acMsg('Escribe tu nombre.');
      if (!usu.includes('@') && usuarioLimpio(usu).length < 3) return acMsg('Elige un usuario de 3 letras o más, sin espacios.');
      if (pass.length < 8) return acMsg('La contraseña debe tener 8 caracteres o más.');
      if (!$('ac-legal').checked) return acMsg('Para crear la cuenta, lee y acepta los términos de uso y la política de privacidad.');
      bt.disabled = true;
      acMsg('Creando la cuenta…');
      const r = await llamarCuentas({ accion: 'registro', codigo: cod, usuario: usu, nombre: v('ac-nombre'), clave: pass, acepta: true, legal: LEGAL_V, captcha: captchaTok() });
      /* Antes de entrar se enseña el código de recuperación (solo esta vez) */
      if (r.codigo) {
        codigoNuevo = r.codigo;
        trasCodigo = () => sb.auth.signInWithPassword({ email: r.email, password: pass });
        acceso('codigo');
        return;
      }
      acMsg('Cuenta creada. Entrando…');
      const q = await sb.auth.signInWithPassword({ email: r.email, password: pass });
      if (q.error) throw q.error;
      return;
    }
    if (f.id === 'form-recuperar') {
      const usu = v('ac-usu'),
        cod = v('ac-rcod'),
        p1 = $('ac-pass').value;
      if (usuarioLimpio(usu).length < 3) return acMsg('Escribe tu usuario.');
      if (cod.replace(/[^A-Za-z0-9]/g, '').length < 12) return acMsg('Escribe el código de recuperación completo.');
      if (p1.length < 8) return acMsg('La contraseña debe tener 8 caracteres o más.');
      if (p1 !== $('ac-pass2').value) return acMsg('Las dos contraseñas no coinciden.');
      bt.disabled = true;
      acMsg('Comprobando…');
      const r = await llamarCuentas({ accion: 'recuperar', usuario: usu, codigo: cod, clave: p1 });
      acMsg('Contraseña cambiada. Entrando…');
      const q = await sb.auth.signInWithPassword({ email: r.email, password: p1 });
      if (q.error) throw q.error;
      toast('Contraseña cambiada. Crea un código de recuperación nuevo en Mi cuenta: el que usaste ya no vale.');
      return;
    }
    if (f.id === 'form-codigo') {
      const cod = v('ac-cod');
      if (cod.replace(/[^A-Za-z0-9]/g, '').length < 6) return acMsg('Escribe el código del restaurante.');
      bt.disabled = true;
      acMsg('Enviando…');
      const q = await sb.rpc('solicitar_union', { p_codigo: cod, p_nombre: yo.nombre });
      if (q.error) throw q.error;
      acceso('cargando');
      await entrarNube();
      return;
    }
    if (f.id === 'form-rest0') {
      if (!v('ac-rest')) {
        acMsg('Escribe el nombre del restaurante.');
        return;
      }
      bt.disabled = true;
      acMsg('Creando…');
      const q = await sb.rpc('crear_restaurante', { p_nombre: v('ac-rest') });
      if (q.error) throw q.error;
      mem('bbc.rest', q.data);
      acceso('cargando');
      await entrarNube();
      return;
    }
    if (f.id === 'form-nueva') {
      const p1 = $('ac-pass').value;
      if (p1.length < 8) {
        acMsg('La contraseña debe tener 8 caracteres o más.');
        return;
      }
      if (p1 !== $('ac-pass2').value) {
        acMsg('Las dos contraseñas no coinciden.');
        return;
      }
      bt.disabled = true;
      acMsg('Guardando…');
      const q = await sb.auth.updateUser({ password: p1 });
      if (q.error) throw q.error;
      recup = false;
      toast('Contraseña cambiada.');
      if (nubeViva) {
        $('acceso').hidden = true;
        $('acceso').innerHTML = '';
      } else {
        acceso('cargando');
        await entrarNube();
      }
      return;
    }
    if (f.id === 'form-olvido') {
      const em = v('ac-email');
      if (!/^\S+@\S+\.\S+$/.test(em)) {
        acMsg('Escribe un correo válido.');
        return;
      }
      bt.disabled = true;
      acMsg('Enviando…');
      const q = await sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname });
      if (q.error) throw q.error;
      acceso(
        'entrar',
        'Si ese correo tiene cuenta, te llegará un enlace en unos minutos. Mira también en correo no deseado.',
      );
      return;
    }
    const email = emailDe(v('ac-email')),
      pass = $('ac-pass').value;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      acMsg(f.id === 'form-crear' ? 'Escribe un correo válido.' : 'Escribe tu usuario o tu correo.');
      return;
    }
    if (f.id === 'form-crear') {
      if (!v('ac-nombre')) {
        acMsg('Escribe tu nombre.');
        return;
      }
      if (pass.length < 8) {
        acMsg('La contraseña debe tener 8 caracteres o más.');
        return;
      }
      if (!$('ac-legal').checked) return acMsg('Para crear la cuenta, lee y acepta los términos de uso y la política de privacidad.');
      /* La aceptación se registra en el servidor al entrar por primera vez (con fecha del servidor) */
      mem('bbc.legalPend', LEGAL_V);
      bt.disabled = true;
      acMsg('Creando la cuenta…');
      const q = await sb.auth.signUp({
        email: email,
        password: pass,
        options: { data: { nombre: v('ac-nombre'), acepta_privacidad: new Date().toISOString() } },
      });
      if (q.error) throw q.error;
      if (!q.data || !q.data.session)
        acceso('entrar', 'Cuenta creada. Revisa tu correo, confirma con el enlace y entra con tu contraseña.');
    } else {
      if (!pass) {
        acMsg('Escribe tu contraseña.');
        return;
      }
      bt.disabled = true;
      acMsg('Entrando…');
      const q = await sb.auth.signInWithPassword({ email: email, password: pass });
      if (q.error) throw q.error;
    }
  } catch (er) {
    acMsg(errTxt(er));
    if (bt.isConnected) bt.disabled = false;
  }
});
/* Las cuentas sin correo usan un correo interno que no existe en internet: usuario@equipo.boomboomciao.invalid */
const DOM_EQUIPO = 'equipo.boomboomciao.invalid';
const usuarioLimpio = (u) =>
  String(u || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '');
const emailDe = (u) => (String(u).includes('@') ? String(u).trim() : usuarioLimpio(u) + '@' + DOM_EQUIPO);
const esUsuario = (email) => String(email || '').endsWith('@' + DOM_EQUIPO);
const verCuenta = (email) => (esUsuario(email) ? String(email).split('@')[0] : email || '');
/* Llama a la función «cuentas» del servidor (crear cuenta con código, poner contraseña nueva) */
async function llamarCuentas(body) {
  const h = { 'Content-Type': 'application/json', apikey: CFG.key };
  try {
    const s = await sb.auth.getSession();
    const t = s && s.data && s.data.session && s.data.session.access_token;
    if (t && body.accion !== 'registro') h.Authorization = 'Bearer ' + t;
  } catch (e) {}
  let r, j;
  try {
    r = await fetch(CFG.url + '/functions/v1/cuentas', { method: 'POST', headers: h, body: JSON.stringify(body) });
    j = await r.json().catch(() => ({}));
  } catch (e) {
    throw new Error('Sin conexión con el servidor. Comprueba internet.');
  }
  if (r.status === 404) throw new Error('Falta instalar la función «cuentas» en Supabase (paso 2 de la actualización).');
  if (!r.ok || j.error) throw new Error(j.error || 'No se pudo completar.');
  return j;
}
let pendientes = [];
let recup = /type=recovery/.test(location.hash + location.search);
const cacheYo = () => {
  try {
    const y = JSON.parse(mem('bbc.yo') || 'null');
    return y && y.id ? y : null;
  } catch (e) {
    return null;
  }
};
function salirNube() {
  legalMirado = false;
  acMsg('Saliendo…');
  const u = cacheYo();
  try {
    localStorage.removeItem(PFX + 'bbc.yo');
    if (u) localStorage.removeItem(PFX + 'bbc.mios.' + u.id);
  } catch (e) {}
  mios.forEach((m) => idb.del('cache.' + m.id));
  Promise.resolve(sb.auth.signOut())
    .catch(() => {})
    .then(() => {
      location.reload();
    });
}
function cambioSesion(s, ev) {
  const u = s && s.user ? s.user : null,
    id = u ? u.id : null;
  if (ev === 'PASSWORD_RECOVERY' && id) {
    recup = true;
    if (id === uidAct) {
      acceso('nueva');
      return;
    }
  }
  if (id === uidAct) return;
  const antes = uidAct;
  uidAct = id;
  if (!id) {
    if (antes) {
      if (sinRed || navigator.onLine === false) {
        uidAct = antes;
        return;
      }
      location.reload();
      return;
    }
    const y = cacheYo();
    if (y && navigator.onLine === false) {
      entrarSinRed(y);
      return;
    }
    acceso('entrar');
    return;
  }
  if (antes) {
    location.reload();
    return;
  }
  yo = {
    id: id,
    email: u.email || '',
    nombre: (u.user_metadata && u.user_metadata.nombre) || (u.email || '').split('@')[0],
  };
  if (recup) {
    acceso('nueva');
    return;
  }
  /* Arranque rápido: si este móvil ya conoce tu cuenta, abre al momento con lo guardado
     y comprueba tus permisos por detrás (si cambiaron, se recarga sola) */
  const y = cacheYo();
  let l = [];
  try {
    l = (y && y.id === id && JSON.parse(mem('bbc.mios.' + id) || '[]')) || [];
  } catch (e) {}
  if (l.length && !entroRapido) {
    entroRapido = true;
    mios = l;
    esPlat = mem('bbc.plat.' + id) === '1';
    const g = mem('bbc.rest'),
      mio = mios.find((x) => x.id === g) || mios[0];
    rid = mio.id;
    $('acceso').hidden = true;
    $('acceso').innerHTML = '';
    iniciarNube(mio);
    setTimeout(() => entrarNube(true), 1500);
    return;
  }
  acceso('cargando');
  entrarNube();
}
let entroRapido = false;
const firmaMios = (l) => JSON.stringify(l.map((x) => [x.id, x.rol, x.area]).sort());
function entrarSinRed(y) {
  let l = [];
  try {
    l = JSON.parse(mem('bbc.mios.' + y.id) || '[]') || [];
  } catch (e) {}
  if (!l.length) {
    acceso(
      'error',
      'Sin conexión, y este dispositivo aún no tiene datos guardados de tu cuenta. Conéctate a internet una vez para poder trabajar sin conexión.',
    );
    return;
  }
  yo = y;
  uidAct = y.id;
  mios = l;
  esPlat = mem('bbc.plat.' + y.id) === '1';
  const g = mem('bbc.rest'),
    mio = mios.find((x) => x.id === g) || mios[0];
  rid = mio.id;
  $('acceso').hidden = true;
  $('acceso').innerHTML = '';
  iniciarNube(mio);
}
async function entrarNube(verificar) {
  try {
    const pide = (c) => sb.from('miembros').select(c).eq('user_id', yo.id);
    const [m0, q, p] = await Promise.all([pide('restaurante_id,rol,area,estado'), sb.from('restaurantes').select('id,nombre'), sb.rpc('puedo_crear')]);
    let m = m0;
    if (m.error && !esRed(m.error)) m = await pide('restaurante_id,rol,area');
    if (m.error && !esRed(m.error)) m = await pide('restaurante_id,rol');
    if (m.error) throw m.error;
    if (q.error) throw q.error;
    const nm = {};
    (q.data || []).forEach((x) => {
      nm[x.id] = x.nombre;
    });
    const filas = m.data || [];
    pendientes = filas.filter((x) => x.estado === 'pendiente').map((x) => nm[x.restaurante_id] || 'tu restaurante');
    const nuevos = filas
      .filter((x) => !x.estado || x.estado === 'activo')
      .map((x) => ({ id: x.restaurante_id, rol: x.rol, area: x.area || 'todas', nombre: nm[x.restaurante_id] || 'Restaurante' }))
      .sort((a, z) => a.nombre.localeCompare(z.nombre, 'es'));
    if (verificar) {
      /* Comprobación por detrás del arranque rápido */
      const cambio = firmaMios(nuevos) !== firmaMios(mios);
      mios = nuevos;
      esPlat = !p.error && p.data === true;
      mem('bbc.mios.' + yo.id, JSON.stringify(mios));
      mem('bbc.plat.' + yo.id, esPlat ? '1' : '0');
      if (cambio) location.reload();
      return;
    }
    mios = nuevos;
    esPlat = !p.error && p.data === true;
    mem('bbc.yo', JSON.stringify(yo));
    mem('bbc.mios.' + yo.id, JSON.stringify(mios));
    mem('bbc.plat.' + yo.id, esPlat ? '1' : '0');
    if (!mios.length) {
      acceso('espera');
      return;
    }
    const g = mem('bbc.rest'),
      mio = mios.find((x) => x.id === g) || mios[0];
    rid = mio.id;
    mem('bbc.rest', rid);
    $('acceso').hidden = true;
    $('acceso').innerHTML = '';
    iniciarNube(mio);
  } catch (e) {
    if (verificar) return;
    if (esRed(e) && cacheYo() && cacheYo().id === yo.id) {
      entrarSinRed(yo);
      return;
    }
    acceso('error', errTxt(e));
  }
}
let nubeViva = false;
let legalMirado = false;
function iniciarNube(mio) {
  /* Una vez por sesión: comprobar que esta persona aceptó la versión actual de los términos */
  if (!legalMirado) {
    legalMirado = true;
    setTimeout(comprobarLegal, 1500);
  }
  if (nubeViva) {
    location.reload();
    return;
  }
  nubeViva = true;
  miId = yo.id;
  uAPI = {
    profiles: (ids) =>
      Promise.resolve(
        ids.reduce((a, i) => {
          const m = miembros.find((x) => x.user_id === i);
          a[i] = { name: m ? m.nombre : '' };
          return a;
        }, {}),
      ),
  };
  const d = sbDb(rid);
  remoto(d);
  setNivel(ROLNIV[mio.rol]);
  fijarArea(mio.area);
  $('rol').textContent = mio.nombre + ' · ' + (mio.rol === 'cocina' ? rolTxt(mio.rol, mio.area) : ROLES[mio.rol] + (mio.area === 'cocina' || mio.area === 'barra' ? ' de ' + mio.area : ''));
  $('btn-restaurar').hidden = nivel !== 'admin';
  $('m-cuenta').hidden = false;
  $('cu-nombre').textContent = yo.nombre + (esUsuario(yo.email) ? ' · ' + verCuenta(yo.email) : '');
  const sel = $('cu-rest');
  sel.hidden = mios.length < 2;
  sel.innerHTML = mios
    .map(
      (x) =>
        '<option value="' + esc(x.id) + '"' + (x.id === rid ? ' selected' : '') + '>' + esc(x.nombre) + '</option>',
    )
    .join('');
  if (nivel === 'admin' && !SUBS.inicio.some((x) => x[0] === 'historial')) {
    SUBS.inicio.push(['historial', 'Historial']);
    if (gestion().length > 1) SUBS.inicio.splice(1, 0, ['grupo', 'Grupo']);
    construirMenu();
    ruta();
  }
  $('btn-copias').hidden = nivel !== 'admin';
  setTimeout(copiaDeHoy, 4000);
  $('btn-usuarios').hidden = nivel !== 'admin';
  cargarMiembros();
  d.start();
  sAPI = iaNube();
  sLim = { images: { mediaTypes: ['image/jpeg', 'image/png', 'image/webp'], maxCount: 4 } };
  refrescar();
}
/* El dueño y los encargados ven la lista completa (con correo y solicitudes pendientes);
   el resto del equipo solo los nombres, sin correos */
let solicitudes = [];
function cargarMiembros() {
  const pide = (c) => sb.from('miembros').select(c).eq('restaurante_id', rid),
    gestiona = puede(2);
  const lista = gestiona
    ? pide('user_id,rol,nombre,email,area,estado,usuario,pedido')
        .then((q) => (q.error ? pide('user_id,rol,nombre,email,area') : q))
        .then((q) => (q.error ? pide('user_id,rol,nombre,email') : q))
    : sb.rpc('equipo', { p_rid: rid }).then((q) => (q.error ? pide('user_id,rol,nombre,area') : q));
  return lista.then(
    (q) => {
      if (!q.error) {
        const l = (q.data || []).sort((a, z) => String(a.nombre).localeCompare(String(z.nombre), 'es'));
        solicitudes = l.filter((x) => x.estado === 'pendiente');
        miembros = l.filter((x) => x.estado !== 'pendiente');
        nombres.clear();
        avisoSolicitudes();
        refrescar();
      }
    },
    () => {},
  );
}
/* Punto en el botón de Usuarios cuando hay gente esperando aprobación */
function avisoSolicitudes() {
  const b = $('btn-usuarios');
  if (!b) return;
  b.textContent = solicitudes.length ? 'Usuarios · ' + solicitudes.length : 'Usuarios';
}
$('cu-rest').addEventListener('change', (e) => {
  mem('bbc.rest', e.target.value);
  location.reload();
});
$('btn-salir').addEventListener('click', () => {
  if (sb) salirNube();
});
$('btn-clave').addEventListener('click', () => verCuentaPanel());
$('btn-legal').addEventListener('click', () => verLegal());
$('btn-copias').addEventListener('click', () => {
  copias = null;
  verCopias();
});
