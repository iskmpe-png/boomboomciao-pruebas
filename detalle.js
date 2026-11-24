/* ---- Informes detallados: compras, mermas, inventarios y ventas por periodo ----
   Cada uno sale en varias hojas de Excel: el detalle línea a línea y los resúmenes. */
const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '');
const quien = (id) => nombre(id) || '';
function infCompras() {
  const l = delMes(S.compras)
      .filter((c) => !filCompra || c.proveedor === filCompra)
      .sort((a, z) => a.fecha.localeCompare(z.fecha) || a.creado.localeCompare(z.creado)),
    tot = suma(l, (c) => c.importe),
    sub = fMes(mesM) + (filCompra ? ' · ' + filCompra : '') + ' · sin IVA';
  const filas = [];
  l.forEach((c) => {
    const base = [T(fFecha(c.fecha)), T(c.proveedor), T(c.albaran)],
      fin = [T(c.recibe), T(quien(c.por)), T(c.archivos.length ? c.archivos.length + (c.archivos.some((a) => a.borrado) ? ' (en ZIP)' : '') : 'No')];
    if (!c.lineas.length) filas.push(base.concat([T('(sin desglose)'), T(''), T(''), T(''), E(c.importe)], fin));
    else c.lineas.forEach((x) => filas.push(base.concat([T(x.nombre), N(x.cantidad), T(UDI[x.unidad]), E(x.precio), E(importeLinea(x))], fin)));
  });
  const pm = {},
    pp = {};
  l.forEach((c) => {
    const k = c.proveedor || 'Sin proveedor';
    pm[k] = pm[k] || { n: 0, imp: 0 };
    pm[k].n++;
    pm[k].imp += c.importe;
    c.lineas.forEach((x) => {
      const kk = norm(x.nombre) + '|' + x.unidad;
      const o = pp[kk] || (pp[kk] = { nombre: x.nombre, prov: c.proveedor, u: x.unidad, q: 0, imp: 0 });
      o.q += x.cantidad;
      o.imp += importeLinea(x);
    });
  });
  return [
    {
      titulo: 'Compras',
      hoja: 'Detalle · ',
      sub: sub + ' · ' + l.length + (l.length === 1 ? ' albarán' : ' albaranes'),
      cols: [
        { t: 'Fecha', w: 1.3 },
        { t: 'Proveedor', w: 2 },
        { t: 'Albarán', w: 1.2 },
        { t: 'Producto', w: 2.6 },
        { t: 'Cantidad', w: 1, r: 1 },
        { t: 'Ud.', w: 0.5 },
        { t: 'Precio', w: 1, r: 1 },
        { t: 'Importe', w: 1.1, r: 1 },
        { t: 'Recibió', w: 1.4 },
        { t: 'Subió', w: 1.4 },
        { t: 'Prueba', w: 0.9 },
      ],
      filas: filas,
      pie: [['Total de compras', E(tot)]],
    },
    {
      titulo: 'Compras por proveedor',
      sub: sub,
      cols: [
        { t: 'Proveedor', w: 3 },
        { t: 'Albaranes', w: 1, r: 1 },
        { t: 'Importe', w: 1.4, r: 1 },
        { t: '% del total', w: 1.1, r: 1 },
      ],
      filas: Object.keys(pm)
        .sort((a, z) => pm[z].imp - pm[a].imp)
        .map((k) => [T(k), N(pm[k].n, 0), E(pm[k].imp), T(fNum(tot ? (pm[k].imp / tot) * 100 : 0, 1) + ' %')]),
      pie: [['Total', E(tot)]],
    },
    {
      titulo: 'Compras por producto',
      sub: sub + ' · solo albaranes con desglose',
      cols: [
        { t: 'Producto', w: 3 },
        { t: 'Proveedor', w: 2 },
        { t: 'Cantidad', w: 1.1, r: 1 },
        { t: 'Ud.', w: 0.5 },
        { t: 'Precio medio', w: 1.2, r: 1 },
        { t: 'Importe', w: 1.2, r: 1 },
      ],
      filas: Object.keys(pp)
        .sort((a, z) => pp[z].imp - pp[a].imp)
        .map((k) => {
          const o = pp[k];
          return [T(o.nombre), T(o.prov), N(o.q), T(UDI[o.u]), E(o.q ? o.imp / o.q : 0), E(o.imp)];
        }),
      pie: [],
    },
  ];
}
function infMermas() {
  const l = mermasMes().slice().reverse(),
    tot = suma(l, valM),
    porMot = {},
    porProd = {};
  l.forEach((m) => {
    porMot[m.motivo] = (porMot[m.motivo] || 0) + valM(m);
    const k = norm(m.nombre) + '|' + m.unidad;
    const o = porProd[k] || (porProd[k] = { nombre: m.nombre, u: m.unidad, q: 0, v: 0, n: 0 });
    o.q += m.cantidad;
    o.v += valM(m);
    o.n++;
  });
  return [
    {
      titulo: 'Mermas',
      hoja: 'Detalle · ',
      sub: fMes(mesM) + ' · ' + l.length + ' apuntes',
      cols: [
        { t: 'Fecha', w: 1.3 },
        { t: 'Hora', w: 0.7 },
        { t: 'Producto', w: 2.6 },
        { t: 'Proveedor', w: 1.7 },
        { t: 'Motivo', w: 1.6 },
        { t: 'Cantidad', w: 1, r: 1 },
        { t: 'Ud.', w: 0.5 },
        { t: 'Precio', w: 1, r: 1 },
        { t: 'Valor', w: 1.1, r: 1 },
        { t: 'Apuntó', w: 1.4 },
      ],
      filas: l.map((m) => [T(fFecha(m.fecha)), T(hora(m.creado)), T(m.nombre), T(m.proveedor), T(m.motivo), N(m.cantidad), T(UDI[m.unidad]), E(m.precio), E(valM(m)), T(quien(m.por))]),
      pie: [['Total de mermas', E(tot)]],
    },
    {
      titulo: 'Mermas por motivo',
      sub: fMes(mesM),
      cols: [
        { t: 'Motivo', w: 3 },
        { t: 'Valor', w: 1.3, r: 1 },
        { t: '% del total', w: 1.1, r: 1 },
      ],
      filas: Object.keys(porMot)
        .sort((a, z) => porMot[z] - porMot[a])
        .map((k) => [T(k), E(porMot[k]), T(fNum(tot ? (porMot[k] / tot) * 100 : 0, 1) + ' %')]),
      pie: [['Total', E(tot)]],
    },
    {
      titulo: 'Mermas por producto',
      sub: fMes(mesM),
      cols: [
        { t: 'Producto', w: 3 },
        { t: 'Veces', w: 0.8, r: 1 },
        { t: 'Cantidad', w: 1.1, r: 1 },
        { t: 'Ud.', w: 0.5 },
        { t: 'Valor', w: 1.2, r: 1 },
      ],
      filas: Object.keys(porProd)
        .sort((a, z) => porProd[z].v - porProd[a].v)
        .map((k) => {
          const o = porProd[k];
          return [T(o.nombre), N(o.n, 0), N(o.q), T(UDI[o.u]), E(o.v)];
        }),
      pie: [],
    },
  ];
}
/* Un inventario cerrado, producto a producto */
function infInventario(v) {
  const l = v.lineas.slice().sort((a, z) => (a.proveedor || '').localeCompare(z.proveedor || '', 'es') || a.nombre.localeCompare(z.nombre, 'es'));
  return {
    titulo: 'Inventario del ' + fFecha(v.fecha),
    hoja: '',
    sub: PER[v.periodo] + ' · ' + l.length + ' productos' + (quien(v.por) ? ' · cerró ' + quien(v.por) : ''),
    cols: [
      { t: 'Producto', w: 3 },
      { t: 'Proveedor', w: 2 },
      { t: 'Cantidad', w: 1.1, r: 1 },
      { t: 'Ud.', w: 0.5 },
      { t: 'Precio', w: 1.1, r: 1 },
      { t: 'Valor', w: 1.2, r: 1 },
    ],
    filas: l.map((x) => [T(x.nombre), T(x.proveedor || ''), N(x.cantidad), T(UDI[uni(x.unidad)]), E(x.precio), E(x.cantidad * x.precio)]),
    pie: [['Valor del stock', E(v.total)]],
  };
}
/* Ventas de un día, una semana o un mes, plato a plato */
function ventasRango(desde, hasta) {
  const u = {};
  let n = 0,
    viejas = 0;
  S.ventas.forEach((v) =>
    v.importes.forEach((im) => {
      if (!im.desde || im.desde < desde || (im.hasta || im.desde) > hasta) return;
      n++;
      if (!Array.isArray(im.lineas)) {
        viejas++;
        return;
      }
      im.lineas.forEach(([pid, q]) => (u[pid] = (u[pid] || 0) + q));
    }),
  );
  return { u, n, viejas };
}
function infVentas(desde, hasta, etq) {
  const r = ventasRango(desde, hasta),
    filas = [];
  let ud = 0,
    ven = 0,
    cos = 0;
  ordenados(S.platos.filter((p) => r.u[p.id] > 0)).forEach((p) => {
    const q = r.u[p.id],
      c = costeUd(p),
      vt = q * (p.pvp / 1.1);
    ud += q;
    ven += vt;
    cos += q * c;
    filas.push([T(p.nombre), T(p.grupo || ''), N(q, 0), E(p.pvp), E(vt), E(c), E(q * c), E(vt - q * c), T(p.pvp > 0 ? fNum(((q * c) / vt) * 100, 1) + ' %' : '')]);
  });
  return {
    titulo: 'Ventas · ' + etq,
    hoja: '',
    sub: r.n + (r.n === 1 ? ' informe' : ' informes') + ' del TPV · ventas sin IVA (10 %)' + (r.viejas ? ' · ' + r.viejas + ' informes antiguos sin detalle no entran' : ''),
    cols: [
      { t: 'Plato', w: 2.8 },
      { t: 'Grupo', w: 1.4 },
      { t: 'Unidades', w: 0.9, r: 1 },
      { t: 'PVP', w: 0.9, r: 1 },
      { t: 'Ventas', w: 1.1, r: 1 },
      { t: 'Coste ud.', w: 1, r: 1 },
      { t: 'Coste', w: 1, r: 1 },
      { t: 'Margen', w: 1.1, r: 1 },
      { t: 'Food cost', w: 0.9, r: 1 },
    ],
    filas: filas,
    pie: [
      ['Platos vendidos', N(ud, 0)],
      ['Ventas sin IVA', E(ven)],
      ['Coste teórico', E(cos)],
      ['Margen', E(ven - cos)],
    ],
  };
}
/* Diálogo para elegir el periodo de las ventas */
function abrirVentasExp() {
  capa(
    capaTop('Exportar ventas', 'Un día, una semana o un mes. Para que salga un día concreto, el informe del TPV de ese día tiene que estar subido por separado.') +
      '<form id="form-vexp" class="editor" novalidate><div class="field"><label for="vx-tipo">Periodo</label><select id="vx-tipo"><option value="dia">Un día</option><option value="semana">Una semana</option><option value="mes" selected>Un mes</option></select></div>' +
      '<div class="field"><label for="vx-fecha">Fecha</label><input id="vx-fecha" type="date" value="' + hoy() + '"></div>' +
      '<p class="hint wide" id="vx-res" aria-live="polite"></p>' +
      '<div class="acciones wide"><button class="btn primary" type="submit" data-f="xlsx">Excel</button><button class="btn" type="submit" data-f="pdf">PDF</button><button class="btn" type="button" data-capa="cerrar">Cancelar</button></div></form>',
  );
  vxCalc();
}
function vxRango() {
  const t = $('vx-tipo').value,
    f = $('vx-fecha').value || hoy(),
    d = new Date(f + 'T12:00:00');
  if (t === 'dia') return { desde: f, hasta: f, etq: fFecha(f) };
  if (t === 'mes') {
    const m = f.slice(0, 7),
      fin = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
    return { desde: m + '-01', hasta: m + '-' + String(fin).padStart(2, '0'), etq: fMes(m) };
  }
  const lu = new Date(d);
  lu.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const dom = new Date(lu);
  dom.setDate(lu.getDate() + 6);
  const iso = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  return { desde: iso(lu), hasta: iso(dom), etq: 'semana del ' + fFecha(iso(lu)) + ' al ' + fFecha(iso(dom)) };
}
function vxCalc() {
  const r = vxRango(),
    v = ventasRango(r.desde, r.hasta),
    n = Object.keys(v.u).length;
  $('vx-res').textContent = v.n
    ? r.etq + ': ' + v.n + (v.n === 1 ? ' informe' : ' informes') + ', ' + n + (n === 1 ? ' plato.' : ' platos.') + (v.viejas ? ' ' + v.viejas + ' son anteriores a esta versión y no tienen el detalle por plato.' : '')
    : 'No hay informes de ventas que caigan entero dentro de ' + r.etq + '.';
}
$('capa').addEventListener('change', (e) => {
  if (e.target.closest('#form-vexp')) vxCalc();
});
$('capa').addEventListener('submit', (e) => {
  if (!e.target.closest('#form-vexp')) return;
  e.preventDefault();
  const r = vxRango(),
    f = (e.submitter && e.submitter.dataset.f) || 'xlsx';
  cerrarCapa();
  exportarInf(infVentas(r.desde, r.hasta, r.etq), f);
});
