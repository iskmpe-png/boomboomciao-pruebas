/* ---- Panel del mes ---- */
function ventasMes(crear) {
  let v = S.ventas.filter((x) => x.id === mesM)[0];
  if (!v && crear) {
    v = nVenta({ id: mesM });
    S.ventas.push(v);
  }
  return v;
}
function costeRealMes() {
  const cer = cerradosInv(),
    ini = cer.filter((c) => c.fecha < mesM + '-01')[0],
    fin = cer.filter((c) => c.fecha.slice(0, 7) === mesM)[0],
    compras = suma(delMes(S.compras), (c) => c.importe),
    v = ventasMes(false);
  let teo = 0,
    uds = 0;
  if (v)
    Object.keys(v.unidades).forEach((id) => {
      const p = idx().pl.get(id),
        n = Number(v.unidades[id]) || 0;
      if (p && n > 0) {
        teo += n * costeUd(p);
        uds += n;
      }
    });
  return {
    ini: ini,
    fin: fin,
    compras: compras,
    teo: teo,
    uds: uds,
    real: ini && fin ? ini.total + compras - fin.total : null,
  };
}
function vPanel() {
  const compras = suma(delMes(S.compras), (c) => c.importe),
    mermas = suma(delMes(S.mermas), valM),
    ult = cerradosInv()[0],
    pl = S.platos.filter((p) => !p.base),
    fcs = pl.map(fcDe).filter((x) => x != null),
    cr = costeRealMes();
  const peores = pl
    .map((p) => ({ p: p, fc: fcDe(p) }))
    .filter((x) => x.fc != null)
    .sort((a, z) => z.fc - a.fc)
    .slice(0, 5);
  const nAl = alertas().length,
    nCo = comparables().filter((c) => c.otros.some((o) => usos(o.id) > 0)).length,
    nPe = porPedir().length,
    nAp = S.appcc.filter((a) => a.fecha === hoy()).length;
  const av = (n, t, h) =>
    '<a class="row" href="#' +
    h +
    '" style="text-decoration:none"><span class="n"><b>' +
    t +
    '</b></span><span class="d"><span class="pill' +
    (n ? ' warn' : '') +
    '">' +
    n +
    '</span></span></a>';
  let real;
  if (cr.real != null) {
    const dif = cr.real - cr.teo;
    real =
      '<ul class="ri" style="grid-template-columns:minmax(0,1fr)"><li><span>Inventario inicial (' +
      esc(fFecha(cr.ini.fecha)) +
      ')</span><b>' +
      fEur.format(cr.ini.total) +
      '</b></li><li><span>+ Compras del mes</span><b>' +
      fEur.format(cr.compras) +
      '</b></li><li><span>− Inventario final (' +
      esc(fFecha(cr.fin.fecha)) +
      ')</span><b>' +
      fEur.format(cr.fin.total) +
      '</b></li><li><span>= Consumo real</span><b>' +
      fEur.format(cr.real) +
      '</b></li>' +
      (cr.uds
        ? '<li><span>Coste teórico de lo vendido (' +
          cr.uds +
          ' platos)</span><b>' +
          fEur.format(cr.teo) +
          '</b></li><li><span>Diferencia sin explicar</span><b>' +
          fEur.format(dif) +
          '</b></li></ul><p class="hint">De esa diferencia, ' +
          fEur.format(mermas) +
          ' son mermas apuntadas. El resto son raciones de más, bases que se tiran sin apuntar, consumo del personal o errores de inventario.</p>'
        : '</ul><p class="hint">Apunta las ventas del mes en Carta › Ingeniería para compararlo con lo que deberías haber gastado.</p>');
  } else
    real =
      '<p class="hint">Para calcularlo hacen falta ' +
      (cr.ini ? '' : 'un inventario cerrado antes de este mes, ') +
      (cr.fin ? '' : 'un inventario cerrado dentro del mes, ') +
      'las compras del mes y las ventas por plato. Compras apuntadas: ' +
      fEur.format(cr.compras) +
      '.</p>';
  $('vista').innerHTML =
    (ppVisible() ? ppHTML() : '') +
    '<div class="bar">' +
    mesHTML() +
    '<span class="grow"></span>' +
    expHTML() +
    '</div>' +
    '<div class="kpis k4"><div class="kpi"><span class="lbl">Compras</span><b>' +
    fEur.format(compras) +
    '</b></div><div class="kpi"><span class="lbl">Mermas</span><b>' +
    fEur.format(mermas) +
    '</b></div><div class="kpi"><span class="lbl">Stock' +
    (ult ? ' · ' + esc(fFecha(ult.fecha)) : '') +
    '</span><b>' +
    (ult ? fEur.format(ult.total) : '—') +
    '</b></div><div class="kpi"><span class="lbl">Food cost medio</span><b>' +
    (fcs.length ? fNum(suma(fcs, (x) => x) / fcs.length) + ' %' : '—') +
    '</b></div></div>' +
    '<div class="dos"><div class="col"><section class="card"><h3>Coste real del mes</h3>' +
    real +
    '</section>' +
    '<section class="card"><h3>Platos con peor margen</h3><div class="rows">' +
    (peores.length
      ? peores
          .map(
            (x) =>
              '<button class="row" type="button" data-act="abrir" data-id="' +
              esc(x.p.id) +
              '"><span class="n"><b>' +
              esc(x.p.nombre) +
              '</b><span>coste ' +
              fEur.format(costeUd(x.p)) +
              ' · carta ' +
              fEur.format(x.p.pvp) +
              '</span></span><span class="d">' +
              pillFC(x.p) +
              '</span></button>',
          )
          .join('')
      : '<p class="hint">Aún no hay platos con precio de carta.</p>') +
    '</div></section></div>' +
    '<div class="col"><section class="card"><h3>Pendiente</h3><div class="rows">' +
    av(nAl, 'Cambios de precio', 'precios-alertas') +
    av(nCo, 'Productos con proveedor más barato', 'precios-comparar') +
    av(nPe, 'Productos por pedir', 'almacen-pedidos') +
    '<a class="row" href="#cocina-appcc" style="text-decoration:none"><span class="n"><b>Registros APPCC de hoy</b></span><span class="d"><span class="pill' +
    (nAp ? ' ok' : ' warn') +
    '">' +
    nAp +
    '</span></span></a></div></section></div></div>';
}
