/* Pantalla de entrada */
const OJO =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
function acceso(modo, msg) {
  const a = $('acceso');
  a.hidden = false;
  let h =
    '<div class="ac-caja"><div class="ac-logo"><img src="img/logo-oro.png" alt="Boom Boom Ciao" width="150" height="63"></div>';
  if (modo === 'entrar')
    h +=
      '<h2>Entrar</h2><form id="form-entrar" class="col" novalidate><div class="field"><label for="ac-email">Correo</label><input id="ac-email" type="email" autocomplete="email" inputmode="email" required></div>' +
      '<div class="field"><label for="ac-pass">Contraseña</label><input id="ac-pass" type="password" autocomplete="current-password" required></div><button class="btn primary" type="submit">Entrar</button></form>' +
      '<div class="ac-pie"><button class="link" type="button" data-ac="crear">No tengo cuenta: crear una</button><button class="link" type="button" data-ac="olvido">He olvidado mi contraseña</button>' +
      (cacheYo() ? '<button class="link" type="button" data-ac="sinred">Trabajar sin conexión</button>' : '') +
      '</div>';
  else if (modo === 'olvido')
    h +=
      '<h2>Recuperar contraseña</h2><p>Escribe tu correo y te enviamos un enlace para poner una contraseña nueva.</p><form id="form-olvido" class="col" novalidate><div class="field"><label for="ac-email">Correo</label><input id="ac-email" type="email" autocomplete="email" inputmode="email" required></div><button class="btn primary" type="submit">Enviar enlace</button></form><button class="link" type="button" data-ac="entrar">Volver a entrar</button>';
  else if (modo === 'nueva')
    h +=
      '<h2>Contraseña nueva</h2><form id="form-nueva" class="col" novalidate><div class="field"><label for="ac-pass">Contraseña nueva (8 caracteres o más)</label><input id="ac-pass" type="password" autocomplete="new-password" minlength="8" required></div><div class="field"><label for="ac-pass2">Repítela</label><input id="ac-pass2" type="password" autocomplete="new-password" required></div><button class="btn primary" type="submit">Guardar contraseña</button></form>' +
      (nubeViva ? '<button class="link" type="button" data-ac="cerrar">Cancelar</button>' : '');
  else if (modo === 'crear')
    h +=
      '<h2>Crear cuenta</h2><form id="form-crear" class="col" novalidate><div class="field"><label for="ac-nombre">Tu nombre</label><input id="ac-nombre" type="text" autocomplete="name" required></div>' +
      '<div class="field"><label for="ac-email">Correo</label><input id="ac-email" type="email" autocomplete="email" inputmode="email" required></div>' +
      '<div class="field"><label for="ac-pass">Contraseña (8 caracteres o más)</label><input id="ac-pass" type="password" autocomplete="new-password" minlength="8" required></div><button class="btn primary" type="submit">Crear cuenta</button><p class="hint">Al crear la cuenta aceptas el <button class="link" type="button" data-ac="legal">aviso legal y de privacidad</button>.</p></form>' +
      '<button class="link" type="button" data-ac="entrar">Ya tengo cuenta: entrar</button>';
  else if (modo === 'espera')
    h +=
      '<h2>Hola, ' +
      esc(yo.nombre) +
      '</h2>' +
      (esPlat
        ? '<p>Todavía no hay ningún restaurante. Crea el primero y quedarás como dueño.</p><form id="form-rest0" class="col" novalidate><div class="field"><label for="ac-rest">Nombre del restaurante</label><input id="ac-rest" type="text" autocomplete="off" value="Boom Boom Ciao" required></div><button class="btn primary" type="submit">Crear restaurante</button></form>'
        : '<p>Tu cuenta está creada, pero aún no tienes acceso a ningún restaurante. Pide a tu encargado que te añada con este correo:</p><p><b style="overflow-wrap:anywhere">' +
          esc(yo.email) +
          '</b></p><button class="btn primary" type="button" data-ac="reintentar">Comprobar de nuevo</button>') +
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
      ? '<button class="link" type="button" data-ac="legal" style="font-weight:500">Aviso legal y privacidad</button>'
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
  if (a === 'crear' || a === 'entrar' || a === 'olvido') acceso(a);
  else if (a === 'legal') verLegal();
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
    const email = v('ac-email'),
      pass = $('ac-pass').value;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      acMsg('Escribe un correo válido.');
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
  acceso('cargando');
  entrarNube();
}
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
async function entrarNube() {
  try {
    const m = await sb.from('miembros').select('restaurante_id,rol').eq('user_id', yo.id);
    if (m.error) throw m.error;
    const q = await sb.from('restaurantes').select('id,nombre');
    if (q.error) throw q.error;
    const nm = {};
    (q.data || []).forEach((x) => {
      nm[x.id] = x.nombre;
    });
    mios = (m.data || [])
      .map((x) => ({ id: x.restaurante_id, rol: x.rol, nombre: nm[x.restaurante_id] || 'Restaurante' }))
      .sort((a, z) => a.nombre.localeCompare(z.nombre, 'es'));
    const p = await sb.rpc('puedo_crear');
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
    if (esRed(e) && cacheYo() && cacheYo().id === yo.id) {
      entrarSinRed(yo);
      return;
    }
    acceso('error', errTxt(e));
  }
}
let nubeViva = false;
function iniciarNube(mio) {
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
  $('rol').textContent = mio.nombre + ' · ' + ROLES[mio.rol];
  $('btn-restaurar').hidden = nivel !== 'admin';
  $('m-cuenta').hidden = false;
  $('cu-nombre').textContent = yo.nombre;
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
function cargarMiembros() {
  return sb
    .from('miembros')
    .select('user_id,rol,nombre,email')
    .eq('restaurante_id', rid)
    .then(
      (q) => {
        if (!q.error) {
          miembros = (q.data || []).sort((a, z) => a.nombre.localeCompare(z.nombre, 'es'));
          nombres.clear();
          refrescar();
        }
      },
      () => {},
    );
}
$('cu-rest').addEventListener('change', (e) => {
  mem('bbc.rest', e.target.value);
  location.reload();
});
$('btn-salir').addEventListener('click', () => {
  if (sb) salirNube();
});
$('btn-clave').addEventListener('click', () => {
  if (sinRed) {
    toast('Necesitas conexión para cambiar la contraseña.');
    return;
  }
  menu(false);
  acceso('nueva');
});
$('btn-legal').addEventListener('click', verLegal);
$('btn-copias').addEventListener('click', () => {
  copias = null;
  verCopias();
});
