/* ---- Pedidos ---- */
function stockActual() {
  const v = abierto(false);
  if (v && Object.keys(v.cantidades).some((k) => v.cantidades[k] > 0))
    return { m: v.cantidades, txt: 'el conteo abierto del ' + fFecha(v.fecha) };
  const c = cerradosInv()[0];
  if (!c) return null;
  const m = {};
  c.lineas.forEach((l) => {
    const p = prodPorNombre(l.nombre);
    if (p) m[p.id] = l.cantidad;
  });
  return { m: m, txt: 'el inventario del ' + fFecha(c.fecha) };
}
function porPedir() {
  const s = stockActual();
  if (!s) return [];
  return S.productos
    .filter((p) => p.minimo > 0 && (Number(s.m[p.id]) || 0) < p.minimo)
    .map((p) => ({ p: p, stock: Number(s.m[p.id]) || 0, pedir: r3(p.minimo - (Number(s.m[p.id]) || 0)) }));
}
/* ---- Compras ---- */
function listaCompras() {
  const l = delMes(S.compras).sort((a, z) => z.fecha.localeCompare(a.fecha) || z.creado.localeCompare(a.creado)),
    total = suma(l, (c) => c.importe);
  $('c-total').textContent = fEur.format(total);
  $('c-n').textContent = l.length === 1 ? '1 albarán' : l.length + ' albaranes';
  $('lista-compras').innerHTML = l.length
    ? l
        .slice(0, lim.compras)
        .map(
          (c) =>
            '<div class="row" data-id="' +
            esc(c.id) +
            '"><div class="n"><b>' +
            esc(c.proveedor || 'Sin proveedor') +
            '</b><span>' +
            esc(
              fFecha(c.fecha) +
                (c.albaran ? ' · ' + c.albaran : '') +
                (c.lineas.length ? ' · ' + c.lineas.length + (c.lineas.length === 1 ? ' línea' : ' líneas') : '') +
                porTxt(c.por),
            ) +
            '</span></div><div class="d"><b>' +
            fEur.format(c.importe) +
            '</b><button class="icon" type="button" data-act="co-borrar" aria-label="Eliminar compra" style="width:34px;height:34px">×</button></div></div>',
        )
        .join('') + masHTML('compras', l.length)
    : '<p class="hint" style="padding:10px 0">Sin compras apuntadas en ' + esc(fMes(mesM).toLowerCase()) + '.</p>';
  const pm = {};
  l.forEach((c) => {
    const k = c.proveedor || 'Sin proveedor';
    pm[k] = (pm[k] || 0) + c.importe;
  });
  const ks = Object.keys(pm).sort((a, z) => pm[z] - pm[a]);
  $('c-prov').innerHTML = ks.length
    ? ks
        .map((k) => {
          const pct = total > 0 ? (pm[k] / total) * 100 : 0;
          return (
            '<div class="fila-barra"><span>' +
            esc(k) +
            '</span><span class="v">' +
            fNum(pct, 0) +
            ' % · ' +
            fEur.format(pm[k]) +
            '</span><span class="pista"><i style="width:' +
            pct +
            '%"></i></span></div>'
          );
        })
        .join('')
    : '<p class="hint">Aquí verás cuánto gastas con cada proveedor.</p>';
}
function vCompras() {
  if (escaneo) {
    $('vista').innerHTML = vEscaneo();
    return;
  }
  $('vista').innerHTML =
    '<div class="bar">' +
    mesHTML() +
    '<div class="resumen"><b class="g" id="c-total"></b><span id="c-n"></span></div>' +
    (sLim && sLim.images
      ? '<button class="btn primary" type="button" data-act="escanear">Escanear albarán</button>'
      : '') +
    expHTML() +
    '</div>' +
    '<div class="dos"><div class="col"><section class="card"><form id="form-compra" class="editor m6" style="margin:0" novalidate>' +
    '<div class="field"><label for="co-fecha">Fecha</label><input id="co-fecha" type="date" value="' +
    hoy() +
    '"></div><div class="field"><label for="co-prov">Proveedor</label><input id="co-prov" type="text" list="dl-proveedores" autocomplete="off"></div>' +
    '<div class="field"><label for="co-alb">Nº de albarán</label><input id="co-alb" type="text" autocomplete="off" placeholder="opcional"></div><div class="field"><label for="co-imp">Importe sin IVA €</label><input class="num" id="co-imp" type="text" inputmode="decimal" placeholder="0,00"></div>' +
    '<button class="btn primary full" type="submit">Apuntar compra</button><span class="hint full" id="co-msg" aria-live="polite"></span></form></section>' +
    '<section class="card"><div class="rows" id="lista-compras"></div></section></div>' +
    '<div class="col"><section class="card"><h3>Por proveedor</h3><div class="barras" id="c-prov"></div></section></div></div>';
  listaCompras();
}
