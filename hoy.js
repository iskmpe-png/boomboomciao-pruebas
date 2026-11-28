/* ---- Cabecera y portada «Hoy» ----
   La cabecera saluda o dice dónde estás. La portada enseña, en este orden: tu turno y el fichaje,
   lo pendiente en cifras y el botón que más usa tu área. Debajo siguen las tareas y los anuncios. */
function nombreLocal() {
  const m = typeof mios !== 'undefined' && mios.find((x) => x.id === rid);
  return (m && m.nombre) || S.ajustes.nombre || 'Boom Boom Ciao';
}
function pintaCabecera() {
  const h = $('saludo'),
    s = $('saludo-sub');
  if (!h) return;
  const quien = typeof yo !== 'undefined' && yo && yo.nombre ? String(yo.nombre).split(' ')[0] : '';
  const sec = (SUBS[vista] || []).find((x) => x[0] === sub[vista]);
  h.textContent = vista === 'inicio' && sub[vista] === 'panel' ? (quien ? 'Hola, ' + quien : 'Hoy') : sec ? sec[1] : SECN[vista];
  const f = new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  s.textContent = f.charAt(0).toUpperCase() + f.slice(1) + ' · ' + nombreLocal();
  const sel = $('area-sel');
  if (sel) sel.dataset.a = area || 'todas';
}
/* El botón protagonista de la portada, según el área */
function accionArea() {
  if (area === 'barra') return { t: 'Registrar una merma', h: 'almacen-mermas' };
  if (area === 'sala') return { t: 'Consultar carta y alérgenos', h: 'cocina-recetas' };
  if (area === 'cocina') return { t: 'Imprimir etiqueta', h: 'cocina-etiquetas' };
  return esMaestro() || puede(2) ? { t: 'Ver las jornadas del equipo', h: 'fichar-jornadas' } : { t: 'Imprimir etiqueta', h: 'cocina-etiquetas' };
}
function hoyHTML() {
  const nAp = S.appcc.filter((a) => a.fecha === hoy()).length,
    pend = tareasDe(hoy()).filter((t) => !t.hecha).length,
    ac = accionArea();
  return (
    '<div class="hoy">' +
    (typeof turnoHoyHTML === 'function' ? turnoHoyHTML() : '') +
    (typeof avisoPapelesHTML === 'function' ? avisoPapelesHTML() : '') +
    '<div class="hoy-dos"><a class="loseta marino" href="#cocina-appcc"><span>Registros APPCC hoy</span><b>' + nAp + '</b></a>' +
    '<a class="loseta oro" href="#cocina-tareas"><span>Tareas pendientes</span><b>' + pend + '</b></a></div>' +
    (SUBS[ac.h.split('-')[0]] && SUBS[ac.h.split('-')[0]].some((x) => x[0] === ac.h.split('-')[1]) ? '<a class="btn primary grande" href="#' + ac.h + '">' + ac.t + '</a>' : '') +
    '</div>'
  );
}
