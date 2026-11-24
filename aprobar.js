/* ---- Cambios pendientes de aprobar ----
   Cuando cocina sube un albarán, la compra se guarda entera, pero lo que cambiaría Precios
   (un producto nuevo, un precio distinto o un formato distinto) queda aquí hasta que el
   encargado de esa área lo apruebe o lo descarte. */
const PEND_NOM = { nuevo: 'Producto nuevo', precio: 'Cambio de precio', formato: 'Cambio de formato' };
const areaPend = (x) => (x.tipo === 'nuevo' ? areaDe(x.area) : areaDe(prod(x.pid) || x.area));
function pendientesTodos() {
  const l = [];
  S.compras.forEach((c) => c.pendientes.forEach((x) => l.push({ c: c, x: x })));
  return l.sort((a, z) => z.c.fecha.localeCompare(a.c.fecha));
}
const pendientesMios = () => pendientesTodos().filter((y) => puedeArea(areaPend(y.x)));
function textoPend(x) {
  const p = prod(x.pid);
  if (x.tipo === 'nuevo') return 'Crear «' + x.nombre + '» a ' + fEur.format(x.precio) + UDP[x.unidad].slice(1);
  if (x.tipo === 'precio') return x.nombre + ': ' + fEur.format(Number(x.de) || (p ? p.precio : 0)) + ' → ' + fEur.format(x.precio) + UDP[x.unidad].slice(1);
  return x.nombre + ': en Precios va en ' + UDI[uni(x.de)] + ' y llegó en ' + UDI[x.unidad] + ' a ' + fEur.format(x.precio) + UDP[x.unidad].slice(1);
}
function filaPend(y, conCompra) {
  const x = y.x,
    p = prod(x.pid),
    sube = x.tipo === 'precio' && Number(x.de) > 0 ? ((x.precio - Number(x.de)) / Number(x.de)) * 100 : null;
  return (
    '<div class="row pend" data-c="' + esc(y.c.id) + '" data-p="' + esc(x.id) + '"><span class="n"><b>' + esc(textoPend(x)) + '</b><span>' +
    esc(PEND_NOM[x.tipo] + (conCompra ? ' · ' + y.c.proveedor + ' · ' + fFecha(y.c.fecha) + (nombre(y.c.por) ? ' · subido por ' + nombre(y.c.por) : '') : '')) +
    (sube != null ? ' · <b style="color:var(' + (sube > 0 ? '--crit' : '--ok') + ')">' + (sube > 0 ? '+' : '') + fNum(sube, 0) + ' %</b>' : '') +
    (x.tipo !== 'nuevo' && p ? ' · se usa en ' + usos(p.id) + (usos(p.id) === 1 ? ' ficha' : ' fichas') : '') +
    '</span></span><span class="d">' +
    (puedeArea(areaPend(x))
      ? '<button class="btn small primary" type="button" data-act="pd-ok">' + (x.tipo === 'formato' ? 'Cambiar formato' : 'Aprobar') + '</button><button class="btn small" type="button" data-act="pd-no">Descartar</button>'
      : '<span class="pill warn">Pendiente</span>') +
    '</span></div>'
  );
}
function pendientesHTML() {
  const l = puede(2) ? pendientesMios() : pendientesTodos();
  if (!l.length) return '';
  return (
    '<section class="card pend-card"><h3>' + (puede(2) ? 'Por aprobar' : 'Pendientes de aprobar') + ' (' + l.length + ')</h3><p class="hint">' +
    (puede(2) ? 'Cambios que llegaron con los albaranes subidos por cocina. Hasta que los apruebes, Precios y los escandallos no cambian.' : 'Lo que pediste al subir albaranes. El encargado lo revisará.') +
    '</p><div class="rows">' + l.slice(0, 30).map((y) => filaPend(y, true)).join('') + '</div></section>'
  );
}
function quitarPend(c, id) {
  c.pendientes = c.pendientes.filter((x) => x.id !== id);
  guardar('compras', c, true);
}
function aprobarPend(c, x) {
  if (!puedeArea(areaPend(x))) return toast('Tu usuario no puede aprobar cambios de esa área.');
  if (x.tipo === 'nuevo') {
    let p = prodPorNombre(x.nombre);
    if (!p) {
      p = nProd({ area: x.area, id: nuevoId('productos'), nombre: x.nombre, proveedor: c.proveedor, precio: x.precio, unidad: x.unidad, actualizado: new Date().toISOString() });
      S.productos.push(p);
      guardar('productos', p, true);
    }
    const l = c.lineas[x.k];
    if (l && !l.productoId) {
      l.productoId = p.id;
      l.nombre = p.nombre;
    }
    quitarPend(c, x.id);
    toast('«' + p.nombre + '» creado en Precios.');
  } else if (x.tipo === 'precio') {
    const p = prod(x.pid);
    if (p) cambiarPrecio(p, x.precio);
    quitarPend(c, x.id);
    toast((p ? p.nombre : x.nombre) + ': precio actualizado.');
  } else {
    const p = prod(x.pid);
    if (!p || p.unidad === x.unidad) {
      quitarPend(c, x.id);
      return pintar();
    }
    /* El cambio de unidad convierte también las fichas: se hace con el asistente de unidades */
    abrirConv({ prodId: p.id });
    if ($('cv-u')) {
      $('cv-u').value = x.unidad;
      cvPintar();
    }
    return;
  }
  dlSucio = true;
  sucio();
  pintar();
}
/* Los cambios de formato se dan por hechos cuando el producto ya está en la unidad nueva */
function repasarFormatos() {
  S.compras.forEach((c) => {
    const ya = c.pendientes.filter((x) => x.tipo === 'formato' && prod(x.pid) && prod(x.pid).unidad === x.unidad);
    if (ya.length && puede(1)) {
      c.pendientes = c.pendientes.filter((x) => ya.indexOf(x) < 0);
      guardar('compras', c, true);
    }
  });
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="pd-ok"],[data-act="pd-no"]');
  if (!b) return;
  const r = b.closest('[data-p]'),
    c = S.compras.find((x) => x.id === r.dataset.c),
    x = c && c.pendientes.find((y) => y.id === r.dataset.p);
  if (!x) return;
  if (!puedeArea(areaPend(x))) return toast('Tu usuario no puede aprobar cambios de esa área.');
  if (b.dataset.act === 'pd-no') {
    if (!confirmar(b, '¿Descartar?')) return;
    quitarPend(c, x.id);
    toast('Descartado. Precios no cambia.');
    pintar();
  } else aprobarPend(c, x);
});
