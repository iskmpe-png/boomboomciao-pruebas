/* Usuarios y restaurantes */
function abrirUsuarios() {
  menu(false);
  $('usuarios').hidden = false;
  document.body.style.overflow = 'hidden';
  pintarUsuarios();
  cargarMiembros().then(() => {
    if (!$('usuarios').hidden) pintarUsuarios();
  });
  cargarUsoIA().then(() => {
    if (!$('usuarios').hidden) pintarUsuarios();
  });
}
function cerrarUsuarios() {
  $('usuarios').hidden = true;
  $('usuarios').innerHTML = '';
  document.body.style.overflow = '';
  $('btn-menu').focus();
}
/* Cómo se llama el rol de cada persona: en barra, «Bartender»; en cocina, «Cocinero» */
const AREAS = { cocina: 'Cocina', barra: 'Barra', todas: 'Cocina y barra' };
function rolTxt(rol, area) {
  if (rol === 'cocina') return area === 'barra' ? 'Bartender' : area === 'cocina' ? 'Cocinero' : 'Cocina y barra';
  return ROLES[rol] || rol;
}
/* Opciones de rol según el área elegida */
function opsRol(sel, area, soyD) {
  const l = [['cocina', area === 'barra' ? 'Bartender' : area === 'cocina' ? 'Cocinero' : 'Equipo (cocina y barra)']];
  if (soyD) l.push(['encargado', 'Encargado'], ['dueno', 'Dueño']);
  l.push(['consulta', 'Solo consulta']);
  return l.map((x) => '<option value="' + x[0] + '"' + (x[0] === sel ? ' selected' : '') + '>' + x[1] + '</option>').join('');
}
const opsArea = (sel) => Object.keys(AREAS).map((k) => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + AREAS[k] + '</option>').join('');
const hace = (iso) => {
  const m = Math.round((Date.now() - Date.parse(iso || '')) / 60000);
  if (!(m >= 0)) return '';
  return m < 60 ? 'hace ' + Math.max(1, m) + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' días';
};
let codigoRest = '',
  claveDe = null;
function pintarUsuarios(msg) {
  const mio = mios.find((x) => x.id === rid),
    soyD = mio.rol === 'dueno',
    tocaArea = soyD || (mio.rol === 'encargado' && (mio.area || 'todas') === 'todas'),
    hayArea = miembros.some((m) => m.area);
  const cuenta = (m) => (m.usuario ? 'Usuario: ' + m.usuario : verCuenta(m.email));
  $('usuarios').innerHTML =
    '<div class="mx-top"><div><h2>Usuarios</h2><p class="hint">' +
    esc(mio.nombre) +
    '</p></div><button class="btn" type="button" data-us="cerrar">Cerrar</button></div>' +
    /* 1. Solicitudes pendientes */
    (tocaArea
      ? '<section class="us-pend"><h3>Por aprobar' + (solicitudes.length ? ' <span class="pill warn">' + solicitudes.length + '</span>' : '') + '</h3>' +
        (solicitudes.length
          ? solicitudes
              .map(
                (m) =>
                  '<div class="us-sol" data-id="' + esc(m.user_id) + '"><span class="us-n"><b>' + esc(m.nombre || 'Sin nombre') + '</b><small>' + esc(cuenta(m)) + (m.pedido ? ' · ' + hace(m.pedido) : '') + '</small></span>' +
                  '<div class="us-elige"><label>Área<select data-us="s-area" aria-label="Área de ' + esc(m.nombre) + '">' + opsArea('cocina') + '</select></label>' +
                  '<label>Rol<select data-us="s-rol" aria-label="Rol de ' + esc(m.nombre) + '">' + opsRol('cocina', 'cocina', soyD) + '</select></label></div>' +
                  '<div class="acciones"><button class="btn primary small" type="button" data-us="aprobar">Aprobar</button><button class="btn small danger" type="button" data-us="rechazar">Rechazar</button></div></div>',
              )
              .join('')
          : '<p class="hint">Nadie esperando. Cuando alguien cree su cuenta con el código, aparecerá aquí.</p>') +
        '<div class="us-cod"><span class="lbl">Código para que tu equipo se apunte</span>' +
        (codigoRest
          ? '<b class="cod" id="us-codigo">' + esc(codigoRest.slice(0, 4) + '-' + codigoRest.slice(4)) + '</b><span class="acciones"><button class="btn small" type="button" data-us="cod-copiar">Copiar</button><button class="btn small" type="button" data-us="cod-nuevo">Cambiar código</button></span>'
          : '<button class="btn small" type="button" data-us="cod-ver">Ver el código</button>') +
        '<p class="hint">Cada persona abre la app, toca «Soy nuevo: crear mi cuenta», escribe este código, su nombre, un usuario y una contraseña. No hace falta correo. Te aparece aquí y eliges si es de cocina o de barra.</p></div></section>'
      : '') +
    /* 2. Equipo */
    '<h3 class="us-h">Equipo</h3><div class="mx-lista">' +
    (miembros.length
      ? miembros
          .map((m) => {
            const tu = m.user_id === yo.id,
              fijo = tu || (!soyD && (m.rol === 'dueno' || m.rol === 'encargado'));
            return (
              '<div class="us-it" data-id="' + esc(m.user_id) + '"><span class="us-n"><b>' +
              esc(m.nombre || 'Sin nombre') +
              (tu ? ' (tú)' : '') +
              '</b><small>' +
              esc(cuenta(m)) +
              '</small></span>' +
              (fijo
                ? '<span class="pill">' + rolTxt(m.rol, m.area) + (m.rol !== 'cocina' && m.area && m.area !== 'todas' ? ' · ' + AREAS[m.area] : '') + '</span>'
                : (hayArea && tocaArea
                    ? '<select data-us="area" data-id="' + esc(m.user_id) + '" aria-label="Área de ' + esc(m.nombre) + '">' + opsArea(m.area || 'todas') + '</select>'
                    : '') +
                  '<select data-us="rol" data-id="' + esc(m.user_id) + '" aria-label="Rol de ' + esc(m.nombre) + '">' + opsRol(m.rol, m.area || 'todas', soyD) + '</select>' +
                  (m.usuario || esUsuario(m.email) ? '<button class="btn small" type="button" data-us="clave">Contraseña</button>' : '') +
                  '<button class="btn small danger" type="button" data-us="quitar" data-id="' + esc(m.user_id) + '">Quitar</button>') +
              (claveDe === m.user_id
                ? '<form class="us-clave" id="form-clave" novalidate><label for="us-pass">Contraseña nueva para ' + esc(m.nombre) + '</label><input id="us-pass" type="text" autocomplete="off" minlength="8" placeholder="8 caracteres o más"><button class="btn primary small" type="submit">Guardar</button></form>'
                : '') +
              '</div>'
            );
          })
          .join('')
      : '<p class="hint" style="padding:12px 0">Cargando…</p>') +
    '</div>' +
    '<details class="us-mas"><summary>Dar acceso a alguien que ya tiene cuenta con correo</summary><form id="form-us" class="mx-fil" novalidate><div class="field"><label for="us-email">Correo de la persona</label><input id="us-email" type="email" inputmode="email" autocomplete="off"></div><div class="field"><label for="us-rol">Rol</label><select id="us-rol">' +
    opsRol('cocina', 'todas', soyD) +
    '</select></div><button class="btn primary" type="submit">Dar acceso</button></form></details>' +
    '<p class="hint">Cocinero y Bartender apuntan inventario, mermas, compras, APPCC, producción y etiquetas, y no ven precios ni costes (solo en Compras, para revisar las facturas). Solo consulta no cambia nada. ' +
    (hayArea ? 'El área decide qué puede cambiar: alguien de barra no toca productos, platos ni turnos de cocina, y al revés.' : 'Para separar cocina y barra, ejecuta el script 7 en la base de datos.') +
    '</p>' +
    (esPlat
      ? '<form id="form-rest" class="mx-fil" novalidate><div class="field"><label for="us-rest">Nuevo restaurante</label><input id="us-rest" type="text" autocomplete="off" placeholder="Nombre"></div><button class="btn" type="submit">Crear restaurante</button></form>'
      : '') +
    usoIAHTML() +
    '<p class="hint" id="us-msg" role="status">' +
    esc(msg || '') +
    '</p>';
}
const usRpc = (fn, args, ok) =>
  sb
    .rpc(fn, args)
    .then((q) => {
      if (q.error) throw q.error;
      return cargarMiembros().then(() => pintarUsuarios(ok));
    })
    .catch((e) => pintarUsuarios(errTxt(e)));
$('btn-usuarios').addEventListener('click', abrirUsuarios);
$('usuarios').addEventListener('click', (e) => {
  const b = e.target.closest('[data-us]');
  if (!b || b.tagName === 'SELECT') return;
  const a = b.dataset.us,
    fila = b.closest('[data-id]'),
    uid = fila ? fila.dataset.id : '';
  if (a === 'cerrar') cerrarUsuarios();
  else if (a === 'quitar' && confirmar(b, '¿Quitar?')) usRpc('quitar_miembro', { p_rid: rid, p_user: b.dataset.id }, 'Acceso retirado.');
  else if (a === 'aprobar') {
    const ar = q(fila, '[data-us="s-area"]').value,
      ro = q(fila, '[data-us="s-rol"]').value,
      n = (solicitudes.find((x) => x.user_id === uid) || {}).nombre || '';
    b.disabled = true;
    usRpc('aprobar_miembro', { p_rid: rid, p_user: uid, p_rol: ro, p_area: ar }, n + ' ya puede entrar como ' + rolTxt(ro, ar) + (ro !== 'cocina' ? ' (' + AREAS[ar] + ')' : '') + '.');
  } else if (a === 'rechazar' && confirmar(b, '¿Rechazar?')) usRpc('quitar_miembro', { p_rid: rid, p_user: uid }, 'Solicitud rechazada.');
  else if (a === 'cod-ver' || (a === 'cod-nuevo' && confirmar(b, '¿Cambiar? El anterior dejará de valer'))) {
    sb.rpc('codigo_union', { p_rid: rid, p_nuevo: a === 'cod-nuevo' }).then((r) => {
      if (r.error) return pintarUsuarios(errTxt(r.error));
      codigoRest = r.data || '';
      pintarUsuarios(a === 'cod-nuevo' ? 'Código cambiado. El anterior ya no sirve.' : '');
    });
  } else if (a === 'cod-copiar') {
    const t = 'Para entrar en la app de ' + (mios.find((x) => x.id === rid) || {}).nombre + ': ' + location.origin + location.pathname + ' → «Soy nuevo: crear mi cuenta» → código ' + codigoRest;
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(t))
      .then(
        () => pintarUsuarios('Copiado. Pégalo en el grupo de WhatsApp del equipo.'),
        () => pintarUsuarios('No se pudo copiar: apúntalo, es ' + codigoRest + '.'),
      );
  } else if (a === 'clave') {
    claveDe = claveDe === uid ? null : uid;
    pintarUsuarios();
    const i = $('us-pass');
    if (i) i.focus();
  }
});
$('usuarios').addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.us === 's-area') {
    const f = t.closest('.us-sol'),
      r = q(f, '[data-us="s-rol"]'),
      v = r.value;
    r.innerHTML = opsRol(v, t.value, mios.find((x) => x.id === rid).rol === 'dueno');
    return;
  }
  if (t.dataset.us === 's-rol') return;
  if (t.dataset.us === 'rol')
    usRpc('cambiar_rol', { p_rid: rid, p_user: t.dataset.id, p_rol: t.value }, 'Rol actualizado.');
  else if (t.dataset.us === 'area')
    usRpc('cambiar_area', { p_rid: rid, p_user: t.dataset.id, p_area: t.value }, 'Área actualizada.');
});
$('usuarios').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target,
    m = $('us-msg');
  if (f.id === 'form-clave') {
    const pw = $('us-pass').value;
    if (pw.length < 8) {
      m.textContent = 'La contraseña debe tener 8 caracteres o más.';
      return;
    }
    m.textContent = 'Guardando…';
    llamarCuentas({ accion: 'clave', rid: rid, user: claveDe, clave: pw })
      .then(() => {
        const n = (miembros.find((x) => x.user_id === claveDe) || {}).nombre || '';
        claveDe = null;
        pintarUsuarios('Contraseña cambiada. Díselo a ' + n + ' en persona.');
      })
      .catch((er) => {
        m.textContent = er.message;
      });
    return;
  }
  if (f.id === 'form-us') {
    const em = $('us-email').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      m.textContent = 'Escribe el correo de la persona.';
      return;
    }
    m.textContent = 'Guardando…';
    usRpc('agregar_miembro', { p_rid: rid, p_email: em, p_rol: $('us-rol').value }, 'Acceso dado a ' + em + '.');
  } else if (f.id === 'form-rest') {
    const n = $('us-rest').value.trim();
    if (!n) {
      m.textContent = 'Escribe el nombre del restaurante.';
      return;
    }
    m.textContent = 'Creando…';
    sb.rpc('crear_restaurante', { p_nombre: n })
      .then((q) => {
        if (q.error) throw q.error;
        mem('bbc.rest', q.data);
        location.reload();
      })
      .catch((er) => {
        m.textContent = errTxt(er);
      });
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('usuarios').hidden) cerrarUsuarios();
});
