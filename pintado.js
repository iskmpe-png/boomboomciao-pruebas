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
  const gr = {};
  S.platos.forEach((p) => {
    if (p.grupo) gr[p.grupo] = 1;
  });
  $('dl-grupos').innerHTML = Object.keys(gr)
    .sort()
    .map((n) => '<option value="' + esc(n) + '"></option>')
    .join('');
}
function pintar() {
  pintarMenu();
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
  if (!listo()) return;
  pintarListas();
  ({
    carta: vCarta,
    precios: vPrecios,
    recetas: vRecetas,
    inventario: vInventario,
    mermas: vMermas,
    panel: vPanel,
    sala: vSala,
    ingenieria: vIng,
    eventos: vEventos,
    comparar: vComparar,
    alertas: vAlertas,
    produccion: vProduccion,
    etiquetas: vEtiquetas,
    appcc: vAppcc,
    pedidos: vPedidos,
    compras: vCompras,
    asistente: vAsistente,
    proveedores: vProveedores,
    historial: vHistorial,
    grupo: vGrupo,
    manual: vManual,
  })[pant]();
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
const expHTML = (varios) =>
  '<div class="exp"><button class="btn" type="button" data-act="exp-menu" aria-haspopup="true">Exportar</button><div class="exp-m" hidden><button type="button" data-exp="png">Imagen PNG</button><button type="button" data-exp="pdf">PDF</button><button type="button" data-exp="xlsx">Excel</button>' +
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
