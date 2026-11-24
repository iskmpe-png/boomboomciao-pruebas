/* ---- Tablón: la página de inicio del equipo ----
   Anuncios de la empresa (los publican dueño y encargados), lo que te toca hoy, los avisos de la semana,
   las fotos de limpieza de hoy y los albaranes recientes, para que todos puedan comprobarlos. */
const diaCorto = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? '' : pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
};
function anunciosVivos() {
  const lim = Date.now() - 30 * 864e5;
  return S.anuncios
    .filter((a) => a.fijado || Date.parse(a.fecha) > lim)
    .sort((a, z) => (z.fijado - a.fijado) || String(z.fecha).localeCompare(String(a.fecha)));
}
function anunciosHTML() {
  const l = anunciosVivos(),
    edita = puede(2);
  return (
    '<section class="card tb-anun"><h3>Anuncios</h3>' +
    (l.length
      ? '<div class="tb-lista">' +
        l
          .map(
            (a) =>
              '<article class="tb-a' + (a.fijado ? ' fijo' : '') + '" data-an="' + esc(a.id) + '">' +
              '<header><b>' + esc(a.titulo || 'Aviso') + '</b>' + (a.fijado ? '<span class="pill">Fijado</span>' : '') + '</header>' +
              (a.texto ? '<p>' + esc(a.texto).replace(/\n/g, '<br>') + '</p>' : '') +
              '<footer class="hint">' + esc((a.porNombre ? a.porNombre + ' · ' : '') + diaCorto(a.fecha)) +
              (edita ? ' <button class="link" type="button" data-act="an-fijar">' + (a.fijado ? 'Soltar' : 'Fijar') + '</button> <button class="link" type="button" data-act="an-borrar" style="color:var(--crit)">Borrar</button>' : '') +
              '</footer></article>',
          )
          .join('') +
        '</div>'
      : '<p class="hint">' + (edita ? 'Aún no hay anuncios. Lo que publiques aquí lo ve todo el equipo al abrir la app.' : 'No hay anuncios nuevos.') + '</p>') +
    (edita
      ? '<form id="form-anuncio" class="editor m6" novalidate><div class="field wide"><label for="an-tit">Título</label><input id="an-tit" type="text" maxlength="120" placeholder="Reunión de equipo el lunes"></div>' +
        '<div class="field wide"><label for="an-txt">Mensaje</label><textarea id="an-txt" rows="2" maxlength="2000" placeholder="A las 16:00 en sala. Trae el uniforme nuevo."></textarea></div>' +
        '<label class="check"><input type="checkbox" id="an-fij"> Fijar arriba</label><button class="btn primary" type="submit">Publicar</button><span class="hint" id="an-msg" aria-live="polite"></span></form>'
      : '') +
    '</section>'
  );
}
/* Lo que me toca hoy según los turnos */
function miHoyHTML() {
  const d = String(new Date().getDay()),
    mias = [];
  filasHoy().forEach((f) =>
    ['am', 'pm'].forEach((fr) => {
      if (f[fr][d] && soyYo(f[fr][d])) mias.push(f.tarea + ' · ' + (fr === 'am' ? 'mañana' : 'tarde'));
    }),
  );
  return (
    '<section class="card"><h3>Hoy te toca</h3>' +
    (mias.length
      ? '<ul class="tb-mias">' + mias.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>'
      : '<p class="hint">' + (miembros.length ? 'Hoy no tienes tareas en el cuadro de turnos.' : 'Cargando…') + '</p>') +
    '<a class="btn small" href="#inicio-turnos">Ver los turnos de la semana</a></section>'
  );
}
/* Avisos de la semana (los recordatorios que llegan al móvil) */
function avisosSemanaHTML() {
  const yoN = norm((miembros.find((m) => m.user_id === miId) || {}).nombre || ''),
    paraMi = (a) => a.para === 'todos' || (a.para === 'encargados' && puede(2)) || (a.para === 'personas' && partesP(a.personas).some((p) => yoN.indexOf(p) === 0)),
    l = S.ajustes.avisos.filter((a) => a.activo && a.dias.length && paraMi(a));
  if (!l.length) return '';
  return (
    '<section class="card"><h3>Avisos de la semana</h3><div class="rows">' +
    l
      .map(
        (a) =>
          '<div class="row"><span class="n"><b>' + esc(a.titulo || a.texto) + '</b><span>' +
          esc((a.titulo ? a.texto + ' · ' : '') + ORDEN_SEMANA.filter((d) => a.dias.indexOf(d) >= 0).map((d) => DIAS_CORTOS[d]).join(' ') + ' · ' + a.hora) +
          '</span></span></div>',
      )
      .join('') +
    '</div></section>'
  );
}
/* Albaranes de los últimos días con su foto, para revisar que se leen bien */
function albaranesHTML() {
  const l = S.compras
    .filter((c) => c.archivos.some((a) => !a.borrado && a.tipo === 'foto'))
    .sort((a, z) => (z.fecha + z.id).localeCompare(a.fecha + a.id))
    .slice(0, 6);
  if (!l.length) return '';
  return (
    '<section class="card"><h3>Albaranes recientes</h3><p class="hint">Toca uno para ver la foto y comprobar que se lee bien.</p><div class="tb-alb">' +
    l
      .map((c) =>
        c.archivos
          .map((a, k) =>
            a.borrado || a.tipo !== 'foto'
              ? ''
              : '<button class="tb-al" type="button" data-act="tb-alb" data-id="' + esc(c.id) + '" data-k="' + k + '"><b>' + esc(c.proveedor || 'Proveedor') + '</b><span>' + esc(fFecha(c.fecha)) + (c.archivos.length > 1 ? ' · foto ' + (k + 1) : '') + (a.pendiente ? ' · sin subir' : '') + '</span></button>',
          )
          .join(''),
      )
      .join('') +
    '</div><a class="btn small" href="#almacen-compras">Ir a Compras</a></section>'
  );
}
/* Fotos de limpieza de hoy: las ve todo el equipo */
function limpiezaTablonHTML() {
  const hay = S.appcc.some((a) => a.tipo === 'limpieza' && a.fotos.some(fotoViva));
  return hay || filasHoy().some((f) => /limpi/.test(norm(f.tarea))) ? limpiezaHoyHTML() + galeriaHTML() : '';
}
/* El dueño ve arriba quién espera aprobación */
function solicitudesHTML() {
  if (!puede(2) || !solicitudes.length) return '';
  return (
    '<section class="card alerta-roja"><h3>' + (solicitudes.length === 1 ? '1 persona espera' : solicitudes.length + ' personas esperan') + ' tu aprobación</h3><p class="hint">' +
    esc(solicitudes.map((m) => m.nombre).join(', ')) +
    '</p><div class="acciones"><button class="btn primary small" type="button" data-act="tb-usuarios">Revisar y aprobar</button></div></section>'
  );
}
function vTablon() {
  if ($('dl-equipo')) $('dl-equipo').innerHTML = nombresEquipo().map((n) => '<option value="' + esc(n) + '"></option>').join('');
  $('vista').innerHTML =
    tareasHTML() +
    '<div class="tablon"><div class="col">' + anunciosHTML() + avisosSemanaHTML() + '</div><div class="col">' + miHoyHTML() + limpiezaTablonHTML() + albaranesHTML() + '</div></div>';
  pintaGaleria();
}
/* Lo que el dueño ve encima de su panel */
const tablonGestionHTML = () => {
  if ($('dl-equipo')) $('dl-equipo').innerHTML = nombresEquipo().map((n) => '<option value="' + esc(n) + '"></option>').join('');
  return solicitudesHTML() + tareasHTML() + '<div class="tablon">' + '<div class="col">' + anunciosHTML() + '</div><div class="col">' + limpiezaTablonHTML() + albaranesHTML() + '</div></div>';
};

V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act^="an-"],[data-act^="tb-"]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'tb-alb') verArchivo(b.dataset.id, +b.dataset.k);
  else if (a === 'tb-usuarios') abrirUsuarios();
  else if (a === 'an-borrar' || a === 'an-fijar') {
    if (!puede(2)) return;
    const an = S.anuncios.find((x) => x.id === b.closest('[data-an]').dataset.an);
    if (!an) return;
    if (a === 'an-borrar') {
      if (!confirmar(b, '¿Borrar?')) return;
      borrar('anuncios', an.id);
    } else {
      an.fijado = !an.fijado;
      guardar('anuncios', an, true);
    }
    pintar();
  }
});
V.addEventListener('submit', (e) => {
  if (e.target.id !== 'form-anuncio') return;
  e.preventDefault();
  if (!puede(2)) return;
  const t = $('an-tit').value.trim(),
    x = $('an-txt').value.trim();
  if (!t && !x) {
    $('an-msg').textContent = 'Escribe el título o el mensaje.';
    return;
  }
  const an = nAnuncio({ id: nuevoId('anuncios'), titulo: t, texto: x, fecha: new Date().toISOString(), por: miId || '', porNombre: (yo && yo.nombre) || '', fijado: $('an-fij').checked });
  S.anuncios.push(an);
  guardar('anuncios', an, true);
  toast('Anuncio publicado: lo ve todo el equipo.');
  pintar();
});
