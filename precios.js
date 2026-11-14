/* ---- Precios de proveedores ---- */
function filtradosProd(k) {
  const f = norm(fil[k]),
    pk = idx().pk;
  return ordenados(S.productos).filter(
    (p) => (k !== 'precios' || !prov || p.proveedor === prov) && (!f || pk.get(p.id).indexOf(f) >= 0),
  );
}
const metaProd = (p) => (p.proveedor || 'Sin proveedor') + (p.actualizado ? ' · ' + fFecha(p.actualizado) : '');
function listaProd() {
  const l = filtradosProd('precios');
  $('lista-prod').innerHTML = l.length
    ? l.slice(0, lim.precios).map(filaProd).join('') + masHTML('precios', l.length)
    : '<p class="hint" style="padding:10px 0">' +
      (S.productos.length ? 'Ningún producto coincide.' : 'Todavía no hay productos. Añade el primero.') +
      '</p>';
  $('n-prod').textContent =
    l.length + (l.length === 1 ? ' producto' : ' productos') + ' · toca uno para cambiar su precio';
}
function vPrecios() {
  if (tarifa) {
    vTarifa();
    return;
  }
  $('vista').innerHTML =
    '<div class="bar"><div class="field"><label for="b-prod">Buscar producto</label><input id="b-prod" type="search" data-buscar="precios" autocomplete="off" value="' +
    esc(fil.precios) +
    '"></div>' +
    '<div class="field corto"><label for="f-prov">Proveedor</label><select id="f-prov"><option value="">Todos</option>' +
    proveedores()
      .map((n) => '<option' + (n === prov ? ' selected' : '') + '>' + esc(n) + '</option>')
      .join('') +
    '</select></div>' +
    '<button class="btn" type="button" data-act="tf-importar">Importar tarifa</button>' +
    '<button class="btn primary" type="button" data-act="add-prod">' +
    (addProd ? 'Cerrar' : 'Añadir') +
    '</button>' +
    expHTML() +
    '</div>' +
    (addProd
      ? '<form id="form-prod" class="editor" style="margin:0" novalidate>' +
        '<div class="field"><label for="np-nombre">Producto</label><input id="np-nombre" type="text" autocomplete="off" placeholder="Ej. Fior di latte"></div>' +
        '<div class="field"><label for="np-proveedor">Proveedor</label><input id="np-proveedor" type="text" list="dl-proveedores" autocomplete="off" placeholder="Ej. Makro"></div>' +
        '<div class="field"><label for="np-precio">Precio</label><div class="precio"><input class="num" id="np-precio" type="text" inputmode="decimal" placeholder="0,00"><select id="np-unidad" aria-label="Unidad"><option value="kg">€/kg</option><option value="l">€/L</option><option value="ud">€/ud</option></select></div></div>' +
        '<button class="btn primary" type="submit">Guardar</button><span class="hint wide" id="np-msg" aria-live="polite"></span></form>'
      : '') +
    '<section class="card"><span class="hint" id="n-prod"></span><div class="rows" id="lista-prod"></div></section>';
  listaProd();
}
function inputPrecios(e) {
  const t = e.target,
    f = t.closest('.editor[data-id]'),
    c = t.dataset.c;
  if (!f || !c) return;
  const p = prod(f.dataset.id);
  if (!p) return;
  if (c === 'precio') {
    p.precio = parse(t.value);
    p.actualizado = new Date().toISOString();
  } else if (c === 'unidad') p.unidad = uni(t.value);
  else if (c === 'minimo') p.minimo = parse(t.value);
  else p[c] = t.value;
  guardar('productos', p);
}
function crearProd(nombre, proveedor, precio, unidad) {
  const p = nProd({
    id: nuevoId('productos'),
    nombre: nombre.trim(),
    proveedor: proveedor.trim(),
    precio: precio,
    unidad: unidad,
    actualizado: new Date().toISOString(),
  });
  S.productos.push(p);
  guardar('productos', p, true);
  return p;
}
