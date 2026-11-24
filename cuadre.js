/* ---- Cuadre albarán–pedido y alerta de subidas de precio ----
   Al enviar un pedido a un proveedor se guarda lo que se pidió. Cuando llega su albarán, la app
   compara línea a línea: lo que falta, lo que viene de más y lo que no se pidió.
   Al revisar un albarán escaneado, avisa también de los precios que han subido y a cuántos platos afecta. */
const DIAS_CUADRE = 10;
/* Guarda (o actualiza) el pedido enviado hoy a ese proveedor */
function registrarPedido(k) {
  const ls = (pedGrupos()[k] || []).filter((x) => x.p);
  if (!ls.length || !puede(1)) return;
  let p = S.pedidos.find((x) => x.fecha === hoy() && norm(x.proveedor) === norm(k) && !x.compraId);
  if (!p) {
    p = nPedido({ id: nuevoId('pedidos'), fecha: hoy(), proveedor: k });
    S.pedidos.push(p);
  }
  p.lineas = ls.map((x) => ({ nombre: x.p.nombre, productoId: x.p.id, cantidad: x.q, unidad: x.p.unidad }));
  p.enviado = new Date().toISOString();
  p.por = miId || '';
  guardar('pedidos', p, true);
  if (pant === 'pedidos') setTimeout(() => pant === 'pedidos' && vPedidos(), 300);
}
/* El pedido que corresponde a una compra: el mismo proveedor, enviado en los 10 días anteriores */
function pedidoDe(proveedor, fecha, compraId) {
  const desde = masDias(fecha, -DIAS_CUADRE);
  return (
    S.pedidos
      .filter((p) => norm(p.proveedor) === norm(proveedor) && p.fecha <= fecha && p.fecha >= desde && (!p.compraId || p.compraId === compraId))
      .sort((a, z) => (z.compraId === compraId) - (a.compraId === compraId) || z.fecha.localeCompare(a.fecha) || z.enviado.localeCompare(a.enviado))[0] || null
  );
}
function cuadre(ped, lineas) {
  const clave = (l) => l.productoId || 'n:' + norm(l.nombre),
    llego = {},
    filas = [];
  lineas.forEach((l) => {
    const k = clave(l);
    (llego[k] || (llego[k] = { nombre: l.nombre, cantidad: 0, unidad: l.unidad })).cantidad += Number(l.cantidad) || 0;
  });
  ped.lineas.forEach((l) => {
    let k = clave(l);
    if (!llego[k] && llego['n:' + norm(l.nombre)]) k = 'n:' + norm(l.nombre);
    const r = llego[k];
    delete llego[k];
    if (!r || !(r.cantidad > 0)) filas.push({ nombre: l.nombre, pedido: l.cantidad, llego: 0, unidad: l.unidad, estado: 'nollego' });
    else {
      const dif = r3(r.cantidad - l.cantidad),
        tol = Math.max(0.001, l.cantidad * 0.02);
      filas.push({ nombre: l.nombre, pedido: l.cantidad, llego: r.cantidad, unidad: l.unidad, estado: Math.abs(dif) <= tol ? 'ok' : dif < 0 ? 'falta' : 'demas', dif: dif });
    }
  });
  Object.keys(llego).forEach((k) => filas.push({ nombre: llego[k].nombre, pedido: 0, llego: llego[k].cantidad, unidad: llego[k].unidad, estado: 'nopedido' }));
  return filas;
}
const CU_TXT = { ok: 'Correcto', falta: 'Falta', demas: 'De más', nollego: 'No ha llegado', nopedido: 'No se pidió' };
const CU_CLS = { ok: 'ok', falta: 'crit', demas: 'warn', nollego: 'crit', nopedido: 'warn' };
function cuadreHTML(proveedor, fecha, lineas, compraId) {
  if (!proveedor || !lineas.length) return '';
  const ped = pedidoDe(proveedor, fecha || hoy(), compraId || '');
  if (!ped) return '';
  const fs = cuadre(ped, lineas.filter((l) => l.nombre)),
    mal = fs.filter((f) => f.estado !== 'ok'),
    cuenta = {};
  fs.forEach((f) => (cuenta[f.estado] = (cuenta[f.estado] || 0) + 1));
  const q3 = (n, u) => fNum(n, 3) + ' ' + UDI[u];
  return (
    '<section class="card cuadre' + (mal.length ? ' con-dif' : '') + '"><h3>Cuadre con el pedido del ' + esc(fFecha(ped.fecha)) + '</h3><p class="cu-res">' +
    Object.keys(CU_TXT)
      .filter((k) => cuenta[k])
      .map((k) => '<span class="pill ' + CU_CLS[k] + '">' + cuenta[k] + ' ' + CU_TXT[k].toLowerCase() + '</span>')
      .join(' ') +
    '</p>' +
    (mal.length
      ? '<div class="rows">' +
        mal
          .map(
            (f) =>
              '<div class="row"><span class="n"><b>' + esc(f.nombre) + '</b><span>' +
              (f.estado === 'nopedido' ? 'Llegó ' + q3(f.llego, f.unidad) + ' sin pedirlo' : f.estado === 'nollego' ? 'Pedido ' + q3(f.pedido, f.unidad) + ', no viene en el albarán' : 'Pedido ' + q3(f.pedido, f.unidad) + ' · llegó ' + q3(f.llego, f.unidad)) +
              '</span></span><span class="d">' + (f.dif ? '<b>' + (f.dif > 0 ? '+' : '') + q3(f.dif, f.unidad) + '</b>' : '') + '<span class="pill ' + CU_CLS[f.estado] + '">' + CU_TXT[f.estado] + '</span></span></div>',
          )
          .join('') +
        '</div><p class="hint">Si falta algo, reclámalo al proveedor y pide que lo abone o lo traiga en el próximo reparto.</p>'
      : '<p class="hint">Ha llegado todo lo que se pidió.</p>') +
    '</section>'
  );
}
function enlazarPedido(c) {
  const p = pedidoDe(c.proveedor, c.fecha, c.id);
  if (p && p.compraId !== c.id) {
    p.compraId = c.id;
    guardar('pedidos', p, true);
  }
}
/* ---- Subidas de precio ---- */
/* Cuánto cambia el coste de un plato si el producto pid cambia su precio en «d» €/unidad */
function deltaPlato(pl, pid, d, prof) {
  if ((prof || 0) > 5) return 0;
  return pl.ingredientes.reduce((t, i) => {
    const cant = un(i) === 'ud' ? bruto(i) : bruto(i) / 1000;
    if (i.productoId === pid) return t + cant * d;
    const b = baseDe(i);
    return b ? t + (cant * deltaPlato(b, pid, d, (prof || 0) + 1)) / (b.raciones > 0 ? b.raciones : 1) : t;
  }, 0);
}
function subidas(lineas) {
  const vistas = {};
  return lineas
    .map((l) => {
      const p = prod(l.pid);
      if (!p || vistas[p.id] || p.unidad !== l.unidad || !(p.precio > 0) || !(l.precio > p.precio * 1.02)) return null;
      vistas[p.id] = 1;
      const d = l.precio - p.precio,
        afect = S.platos
          .filter((x) => !x.base)
          .map((x) => ({ x: x, d: deltaPlato(x, p.id, d) / (x.raciones > 0 ? x.raciones : 1) }))
          .filter((y) => y.d > 0.0005)
          .sort((a, z) => z.d - a.d);
      return { p: p, nuevo: l.precio, pct: (d / p.precio) * 100, afect: afect };
    })
    .filter(Boolean)
    .sort((a, z) => z.pct - a.pct);
}
function subidasHTML(lineas) {
  const l = subidas(lineas);
  if (!l.length) return '';
  return (
    '<section class="card subidas"><h3>' + (l.length === 1 ? 'Ha subido 1 precio' : 'Han subido ' + l.length + ' precios') + '</h3><div class="rows">' +
    l
      .map((s) => {
        const top = s.afect[0],
          fcA = top && top.x.pvp > 0 ? fcDe(top.x) : null,
          fcN = fcA != null ? fcA + (top.d / (top.x.pvp / (1 + (top.x.iva || 0) / 100))) * 100 : null;
        return (
          '<div class="row"><span class="n"><b>' + esc(s.p.nombre) + ' ha subido un ' + fNum(s.pct, 0) + ' %</b><span>' + fEur.format(s.p.precio) + ' → ' + fEur.format(s.nuevo) + UDP[s.p.unidad].slice(1) +
          (s.afect.length
            ? ' · afecta a ' + s.afect.length + (s.afect.length === 1 ? ' plato' : ' platos') + ' · el que más: ' + esc(top.x.nombre) + ' +' + fEur.format(top.d) + ' por ración' + (fcN != null ? ' (food cost ' + fNum(fcA) + ' % → ' + fNum(fcN) + ' %)' : '')
            : ' · no se usa en ningún plato') +
          '</span></span><span class="d"><span class="pill ' + (s.pct >= 10 ? 'crit' : 'warn') + '">+' + fNum(s.pct, 0) + ' %</span></span></div>'
        );
      })
      .join('') +
    '</div><p class="hint">Marca «Actualizar precio» en la línea para que los escandallos usen el precio nuevo.</p></section>'
  );
}
/* En la revisión del albarán escaneado */
const scLineas = () => (escaneo ? escaneo.lineas.map((l) => ({ nombre: l.nombre, productoId: l.pid, cantidad: l.cantidad, unidad: l.unidad })) : []);
const scExtraHTML = () => (escaneo ? subidasHTML(escaneo.lineas) + cuadreHTML(escaneo.proveedor, escaneo.fecha, scLineas(), '') : '');
let tScx = null;
function pintaScExtra() {
  clearTimeout(tScx);
  tScx = setTimeout(() => {
    const el = $('sc-extra');
    if (el) el.innerHTML = scExtraHTML();
  }, 350);
}
/* En Pedidos: los últimos pedidos enviados y si ya llegó su albarán */
function enviadosHTML() {
  const l = S.pedidos.slice().sort((a, z) => z.fecha.localeCompare(a.fecha) || z.enviado.localeCompare(a.enviado)).slice(0, 8);
  if (!l.length) return '';
  return (
    '<section class="card"><h3>Pedidos enviados</h3><div class="rows">' +
    l
      .map((p) => {
        const c = p.compraId && S.compras.find((x) => x.id === p.compraId),
          fs = c ? cuadre(p, c.lineas) : null,
          mal = fs ? fs.filter((f) => f.estado !== 'ok').length : 0;
        return (
          '<div class="row"><span class="n"><b>' + esc(p.proveedor) + '</b><span>' + esc(fFecha(p.fecha) + ' · ' + p.lineas.length + (p.lineas.length === 1 ? ' producto' : ' productos') + (nombre(p.por) ? ' · ' + nombre(p.por) : '')) + '</span></span><span class="d">' +
          (c ? (mal ? '<span class="pill warn">Llegó con ' + mal + (mal === 1 ? ' diferencia' : ' diferencias') + '</span>' : '<span class="pill ok">Llegó completo</span>') : '<span class="pill">Esperando albarán</span>') +
          '</span></div>'
        );
      })
      .join('') +
    '</div></section>'
  );
}
