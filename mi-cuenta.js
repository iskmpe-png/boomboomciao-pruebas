/* ---- Mi cuenta: apariencia, contraseña, código de recuperación, mis datos y legal ----
   Cada persona lo hace todo sola, sin pedírselo al encargado. */
function ponerTema(t) {
  if (t === 'auto') {
    document.documentElement.removeAttribute('data-theme');
    mem('esc2.tema', '');
  } else {
    document.documentElement.setAttribute('data-theme', t);
    mem('esc2.tema', t);
  }
  if (typeof pintarTema === 'function') pintarTema();
}
const temaElegido = () => {
  const t = mem('esc2.tema');
  return t === 'dark' || t === 'light' ? t : 'auto';
};
const conCuenta = () => !!(typeof sb !== 'undefined' && sb && typeof yo !== 'undefined' && yo && yo.id);
function verCuentaPanel(msg) {
  menu(false);
  const t = temaElegido(),
    nom = conCuenta() ? (yo.nombre || '') : '',
    usu = conCuenta() && yo.email ? (esUsuario(yo.email) ? yo.email.split('@')[0] : yo.email) : '';
  capa(
    capaTop('Mi cuenta', nom ? nom + (usu ? ' · ' + usu : '') : 'Ajustes de este dispositivo') +
      '<div class="col mc">' +
      '<section class="card"><h3>Apariencia</h3><div class="seg" role="radiogroup" aria-label="Tema">' +
      [['light', 'Claro'], ['dark', 'Oscuro'], ['auto', 'Automático']].map(([k, n]) => '<button type="button" data-mc-tema="' + k + '" aria-pressed="' + (t === k) + '">' + n + '</button>').join('') +
      '</div><p class="hint">Automático sigue el modo claro u oscuro del móvil.</p></section>' +
      (conCuenta()
        ? '<section class="card"><h3>Contraseña</h3><form id="form-mc-clave" class="col" novalidate>' +
          '<div class="field"><label for="mc-act">Contraseña actual</label><input id="mc-act" type="password" autocomplete="current-password"></div>' +
          '<div class="field"><label for="mc-n1">Contraseña nueva (8 caracteres o más)</label><input id="mc-n1" type="password" autocomplete="new-password" minlength="8"></div>' +
          '<div class="field"><label for="mc-n2">Repítela</label><input id="mc-n2" type="password" autocomplete="new-password"></div>' +
          '<button class="btn primary" type="submit">Cambiar contraseña</button></form></section>' +
          '<section class="card"><h3>Código de recuperación</h3><p class="hint">Si olvidas la contraseña, con tu usuario y este código pones una nueva tú solo, sin pedírselo a nadie. Al crear uno nuevo, el anterior deja de valer.</p>' +
          '<div id="mc-cod"></div><button class="btn" type="button" data-mc="codigo">Crear código de recuperación</button></section>' +
          '<section class="card"><h3>Mis datos</h3><p class="hint">Descarga en un archivo todo lo que hay a tu nombre en la app, o elimina tu cuenta.</p><div class="acciones"><button class="btn" type="button" data-mc="descargar">Descargar mis datos</button><button class="btn danger" type="button" data-mc="borrar">Eliminar mi cuenta</button></div><div id="mc-borrar"></div></section>'
        : '') +
      '<section class="card"><h3>Privacidad y legal</h3><div class="acciones"><button class="link" type="button" data-lg-abrir="privacidad">Privacidad</button><button class="link" type="button" data-lg-abrir="terminos">Términos de uso</button><button class="link" type="button" data-lg-abrir="cookies">Cookies</button><button class="link" type="button" data-lg-abrir="aviso">Aviso legal</button><button class="link" type="button" data-lg-abrir="proveedores">Proveedores</button><button class="link" type="button" data-lg-abrir="licencias">Licencias</button></div></section>' +
      '<p class="hint" id="mc-msg" aria-live="polite">' + esc(msg || '') + '</p></div>',
  );
}
const mcMsg = (t) => {
  if ($('mc-msg')) $('mc-msg').textContent = t;
};
/* Todo lo que hay a mi nombre: cuenta, restaurantes, aceptaciones y lo que subí yo */
async function descargarMisDatos() {
  const out = { generado: new Date().toISOString(), cuenta: { id: yo.id, nombre: yo.nombre || '', acceso: yo.email || '' }, restaurantes: [], aceptaciones: [], subido_por_mi: {} };
  try {
    const m = await sb.from('miembros').select('restaurante_id,rol,area,estado,nombre,creado').eq('user_id', yo.id);
    out.restaurantes = m.data || [];
    const a = await sb.from('aceptaciones').select('documento,version,aceptado').eq('user_id', yo.id);
    out.aceptaciones = a.data || [];
  } catch (e) {}
  COLS.forEach((c) => {
    const l = (S[c] || []).filter((x) => x && x.por === yo.id);
    if (l.length) out.subido_por_mi[c] = l;
  });
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }),
    u = URL.createObjectURL(blob),
    el = document.createElement('a');
  el.href = u;
  el.download = 'mis-datos-' + hoy() + '.json';
  document.body.appendChild(el);
  el.click();
  el.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
  mcMsg('Descargado: mis-datos-' + hoy() + '.json');
}
document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-mc-tema]');
  if (t) {
    ponerTema(t.dataset.mcTema);
    document.querySelectorAll('[data-mc-tema]').forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
    return;
  }
  const b = e.target.closest('[data-mc]');
  if (!b) return;
  const a = b.dataset.mc;
  if (a === 'codigo') {
    b.disabled = true;
    try {
      const r = await llamarCuentas({ accion: 'codigo-rec' });
      $('mc-cod').innerHTML =
        '<p class="mc-codigo"><code>' + esc(r.codigo) + '</code><button class="btn small" type="button" data-mc="copiar" data-c="' + esc(r.codigo) + '">Copiar</button></p><p class="hint"><b>Guárdalo ahora</b> (una foto, una nota del móvil): no se vuelve a enseñar.</p>';
    } catch (er) {
      mcMsg(er.message || 'No se pudo crear el código.');
    }
    b.disabled = false;
  } else if (a === 'copiar') {
    try {
      await navigator.clipboard.writeText(b.dataset.c);
      toast('Código copiado.');
    } catch (er) {
      toast('Mantén pulsado el código para copiarlo.');
    }
  } else if (a === 'descargar') descargarMisDatos();
  else if (a === 'borrar') {
    $('mc-borrar').innerHTML =
      '<form id="form-mc-borrar" class="col" novalidate><p><b>Se eliminará tu cuenta y no podrás volver a entrar.</b> Lo que registraste para el APPCC se conserva para la empresa, sin tu acceso. Si solo quieres dejar de usarla un tiempo, no hace falta.</p>' +
      '<div class="field"><label for="mc-conf">Escribe ELIMINAR para confirmar</label><input id="mc-conf" type="text" autocomplete="off" autocapitalize="characters"></div>' +
      '<div class="field"><label for="mc-pb">Tu contraseña</label><input id="mc-pb" type="password" autocomplete="current-password"></div>' +
      '<button class="btn danger" type="submit">Eliminar mi cuenta para siempre</button></form>';
    $('mc-conf').focus();
  }
});
document.addEventListener('submit', async (e) => {
  const f = e.target;
  if (f.id === 'form-mc-clave') {
    e.preventDefault();
    const act = $('mc-act').value,
      n1 = $('mc-n1').value;
    if (!act) return mcMsg('Escribe tu contraseña actual.');
    if (n1.length < 8) return mcMsg('La contraseña nueva debe tener 8 caracteres o más.');
    if (n1 !== $('mc-n2').value) return mcMsg('Las dos contraseñas nuevas no coinciden.');
    if (n1 === act) return mcMsg('La nueva tiene que ser distinta de la actual.');
    const bt = f.querySelector('[type=submit]');
    bt.disabled = true;
    mcMsg('Comprobando…');
    /* Se comprueba la actual antes: así nadie con tu móvil abierto puede cambiártela */
    const q = await sb.auth.signInWithPassword({ email: yo.email, password: act });
    if (q.error) {
      bt.disabled = false;
      return mcMsg('La contraseña actual no es correcta.');
    }
    const r = await sb.auth.updateUser({ password: n1 });
    bt.disabled = false;
    if (r.error) return mcMsg(/weak|password/i.test(r.error.message || '') ? 'Esa contraseña es demasiado fácil: usa una más larga.' : 'No se pudo cambiar: ' + r.error.message);
    f.reset();
    mcMsg('✓ Contraseña cambiada.');
    toast('Contraseña cambiada.');
  } else if (f.id === 'form-mc-borrar') {
    e.preventDefault();
    if ($('mc-conf').value.trim().toUpperCase() !== 'ELIMINAR') return mcMsg('Escribe ELIMINAR para confirmar.');
    const q = await sb.auth.signInWithPassword({ email: yo.email, password: $('mc-pb').value });
    if (q.error) return mcMsg('La contraseña no es correcta.');
    try {
      await llamarCuentas({ accion: 'borrar-cuenta' });
    } catch (er) {
      return mcMsg(er.message || 'No se pudo eliminar la cuenta.');
    }
    cerrarCapa();
    toast('Tu cuenta se ha eliminado.');
    salirNube();
  }
});
