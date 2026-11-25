/* ---- Pintado general ---- */
const listo = () => !db || COLS.every((c) => cargado[c]);
const proveedores = () => {
  const pv = {};
  S.productos.forEach((p) => {
    if (p.proveedor) pv[p.proveedor] = 1;
  });
  return Object.keys(pv).sort((a, z) => a.localeCompare(z, 'es'));
};
function pintarListas() {
  if (!dlSucio) return;
  dlSucio = false;
  const ops = ordenados(S.productos)
    .map(
      (p) =>
        '<option value="' +
        esc(p.nombre) +
        '" label="' +
        esc(fEur.format(p.precio) + ' ' + UDP[p.unidad].slice(1) + (p.proveedor ? ' · ' + p.proveedor : '')) +
        '"></option>',
    )
    .join('');
  $('dl-solo-prod').innerHTML = ops;
  $('dl-productos').innerHTML =
    ops +
    ordenados(S.platos.filter((b) => b.base && b.nombre))
      .map(
        (b) =>
          '<option value="' +
          esc(b.nombre) +
          '" label="' +
          esc(fEur.format(costeUd(b)) + ' ' + UDP[b.unidadBase].slice(1) + ' · Elaboración de la casa') +
          '"></option>',
      )
      .join('');
  $('dl-proveedores').innerHTML = proveedores()
    .map((n) => '<option value="' + esc(n) + '"></option>')
    .join('');
  $('dl-grupos').innerHTML = gruposCarta()
    .map((n) => '<option value="' + esc(n) + '"></option>')
    .join('');
  if ($('dl-gelab'))
    $('dl-gelab').innerHTML = gruposElab()
      .map((n) => '<option value="' + esc(n) + '"></option>')
      .join('');
}
function pintar() {
  pintarMenu();
  document.body.dataset.sec = vista;
  if (typeof pintarTabbar === 'function') pintarTabbar();
  delete $('vista').dataset.area;
  const ss = SUBS[vista],
    sn = $('subs');
  sn.hidden = ss.length < 2;
  sn.innerHTML = ss
    .map(
      (x) =>
        '<a href="#' +
        vista +
        '-' +
        x[0] +
        '"' +
        (x[0] === sub[vista] ? ' aria-current="page"' : '') +
        '>' +
        x[1] +
        '</a>',
    )
    .join('');
  pant = LEG[vista + '/' + sub[vista]] || sub[vista];
  if (typeof chatFab === 'function') chatFab();
  if (typeof pintaRecordatorio === 'function') pintaRecordatorio();
  if (!listo()) return;
  pintarListas();
  // Por nombre: si un módulo no llegó a cargar (p. ej. un 503 de GitHub Pages), se avisa en vez de lanzar ReferenceError.
  const fn =
    pant === 'panel'
      ? puede(2)
        ? window.vPanel
        : window.vTablon
      : window[
          ({
              carta: 'vCarta',
              precios: 'vPrecios',
              recetas: 'vRecetas',
              inventario: 'vInventario',
              mermas: 'vMermas',
              sala: 'vSala',
              ingenieria: 'vIng',
              eventos: 'vEventos',
              comparar: 'vComparar',
              alertas: 'vAlertas',
              produccion: 'vProduccion',
              etiquetas: 'vEtiquetas',
              appcc: 'vAppcc',
              pedidos: 'vPedidos',
              compras: 'vCompras',
              asistente: 'vAsistente',
              proveedores: 'vProveedores',
              historial: 'vHistorial',
              grupo: 'vGrupo',
              manual: 'vManual',
              turnos: 'vTurnos',
              consumo: 'vConsumo',
          })[pant]
        ];
  if (typeof fn !== 'function') {
    $('vista').innerHTML =
      '<section class="card estado"><strong>No se pudo cargar esta sección</strong><span>Revisa la conexión y recarga la página.</span></section>';
    return;
  }
  fn();
}
function refrescar() {
  const a = document.activeElement,
    ed = a && $('vista').contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName);
  if (!ed) {
    pintar();
    return;
  }
  if (pant === 'carta' && abierta) calcular();
  else if (pant === 'inventario') calcInv();
}
const vacio = (t, d, btn) =>
  '<section class="card estado"><strong>' + t + '</strong><span>' + d + '</span>' + (btn || '') + '</section>';
/* Un solo botón desplegable para las acciones secundarias de cada pantalla y para exportar.
   «extra» son otras opciones (botones con data-act) que van arriba; «etq» es el texto del botón. */
const mOp = (act, txt, attrs) => '<button type="button" data-act="' + act + '"' + (attrs || '') + '>' + txt + '</button>';
const expHTML = (varios, extra, etq) =>
  '<div class="exp"><button class="btn" type="button" data-act="exp-menu" aria-haspopup="true" aria-expanded="false">' +
  (etq || (extra ? 'Más' : 'Exportar')) +
  '<svg class="flecha" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button><div class="exp-m" hidden>' +
  (extra ? extra + '<span class="exp-sep">Exportar</span>' : '') +
  '<button type="button" data-exp="png">Imagen PNG</button><button type="button" data-exp="pdf">PDF</button><button type="button" data-exp="xlsx">Excel</button>' +
  (varios ? '<button type="button" data-act="multi">Varios a la vez…</button>' : '') +
  '</div></div>';
const masHTML = (k, total) =>
  total > lim[k]
    ? '<button class="btn small mas" type="button" data-act="mas" data-k="' +
      k +
      '">Ver más (' +
      (total - lim[k]) +
      ' restantes)</button>'
    : '';
function opcionesPlatos(sel) {
  const g = {};
  ordenados(S.platos).forEach((p) => {
    if (!enArea(p) && p.id !== sel) return;
    const n = grupoDe(p);
    (g[n] || (g[n] = [])).push(p);
  });
  const ks = Object.keys(g).sort((a, z) => (a === G_BASE) - (z === G_BASE) || a.localeCompare(z, 'es'));
  return ks
    .map(
      (n) =>
        '<optgroup label="' +
        esc(n) +
        '">' +
        g[n]
          .map(
            (p) =>
              '<option value="' +
              esc(p.id) +
              '"' +
              (p.id === sel ? ' selected' : '') +
              '>' +
              esc(p.nombre || 'Sin nombre') +
              '</option>',
          )
          .join('') +
        '</optgroup>',
    )
    .join('');
}
