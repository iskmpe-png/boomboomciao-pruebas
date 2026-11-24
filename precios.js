/* ---- Precios de proveedores ---- */
function filtradosProd(k) {
  const f = norm(fil[k]),
    pk = idx().pk;
  return ordenados(S.productos).filter(
    (p) => enArea(p) && (k !== 'precios' || !prov || p.proveedor === prov) && (k !== 'precios' || estadoProd(p)) && (!f || pk.get(p.id).indexOf(f) >= 0),
  );
}
/* Filtro «Mostrar» de Precios */
let estProd = '';
function estadoProd(p) {
  if (!estProd) return true;
  if (estProd === 'sube') return p.anterior > 0 && p.precio > p.anterior + 0.004;
  if (estProd === 'sinuso') return !usos(p.id);
  if (estProd === 'sinenlace') return !p.general && !platosDe(p.id).size;
  if (estProd === 'general') return p.general;
  if (estProd === 'sinprov') return !p.proveedor.trim();
  if (estProd === 'sinprecio') return !(p.precio > 0);
  if (estProd === 'viejo') return !p.actualizado || Date.now() - new Date(p.actualizado) > 90 * 864e5;
  return true;
}
const metaProd = (p) => (p.proveedor || 'Sin proveedor') + (p.actualizado ? ' · ' + fFecha(p.actualizado) : '');
function listaProd() {
  const l = filtradosProd('precios');
  /* Las elaboraciones de la casa se enseñan al final, como un producto más con su coste */
  const f = norm(fil.precios),
    casa = prov || estProd ? [] : ordenados(S.platos.filter((b) => b.base && b.nombre && enArea(b) && (!f || norm(b.nombre).indexOf(f) >= 0)));
  $('lista-casa').hidden = !casa.length;
  $('lista-casa').innerHTML = casa.length
    ? '<span class="hint">' + casa.length + (casa.length === 1 ? ' elaboración de la casa' : ' elaboraciones de la casa') + ' · su precio es lo que cuesta producirla</span><div class="rows">' +
      casa
        .map(
          (b) =>
            '<button class="row" type="button" data-act="abrir" data-id="' + esc(b.id) + '"><span class="n"><b>' + esc(b.nombre) + '</b><span>BB Ciao · rinde ' + rinde(b) + '</span>' +
            (platosDe(b.id, true).size ? '<span class="enl">En ' + platosDe(b.id, true).size + (platosDe(b.id, true).size === 1 ? ' plato' : ' platos') + '</span>' : '<span class="pill crit">Sin enlazar a un plato</span>') + '</span><span class="d"><b>' +
            fEur.format(costeUd(b)) + '</b><span class="hint">' + UDP[b.unidadBase].slice(1) + '</span></span></button>',
        )
        .join('') + '</div>'
    : '';
  $('lista-prod').innerHTML = l.length
    ? l.slice(0, lim.precios).map(selModo === 'precios' ? selFilaProd : filaProd).join('') + masHTML('precios', l.length)
    : '<p class="hint" style="padding:10px 0">' +
      (S.productos.length ? 'Ningún producto coincide.' : 'Todavía no hay productos. Añade el primero.') +
      '</p>';
  $('n-prod').textContent =
    l.length + (l.length === 1 ? ' producto' : ' productos') + (selModo === 'precios' ? ' · toca los que quieras cambiar' : ' · toca uno para cambiar su precio');
  selCuenta();
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
    '<div class="field corto"><label for="f-est">Mostrar</label><select id="f-est">' +
    [['', 'Todos'], ['sinenlace', 'Sin enlazar a un plato'], ['general', 'Uso general'], ['sube', 'Han subido de precio'], ['sinuso', 'Sin usar en fichas'], ['sinprov', 'Sin proveedor'], ['sinprecio', 'Sin precio'], ['viejo', 'Precio de hace +3 meses']]
      .map((o) => '<option value="' + o[0] + '"' + (o[0] === estProd ? ' selected' : '') + '>' + o[1] + '</option>')
      .join('') +
    '</select></div>' +
    (selModo === 'precios'
      ? ''
      : '<button class="btn primary" type="button" data-act="add-prod">' +
        (addProd ? 'Cerrar' : 'Añadir') +
        '</button>' +
        expHTML(0, mOp('sel-ini', 'Seleccionar varios', ' data-m="precios"') + mOp('tf-importar', 'Importar Excel, PDF o fotos'))) +
    '</div>' +
    (selModo === 'precios' ? selBarHTML() : '') +
    (addProd && selModo !== 'precios'
      ? '<form id="form-prod" class="editor" style="margin:0" novalidate>' +
        '<div class="field"><label for="np-nombre">Producto</label><input id="np-nombre" type="text" autocomplete="off" placeholder="Ej. Fior di latte"></div>' +
        '<div class="field"><label for="np-proveedor">Proveedor</label><input id="np-proveedor" type="text" list="dl-proveedores" autocomplete="off" placeholder="Ej. Makro"></div>' +
        '<div class="field"><label for="np-precio">Precio</label><div class="precio"><input class="num" id="np-precio" type="text" inputmode="decimal" placeholder="0,00"><select id="np-unidad" aria-label="Unidad"><option value="kg">€/kg</option><option value="l">€/L</option><option value="ud">€/ud</option></select></div></div>' +
        '<button class="btn primary" type="submit">Guardar</button><span class="hint wide" id="np-msg" aria-live="polite"></span></form>'
      : '') +
    sinEnlaceHTML() +
    '<section class="card"><span class="hint" id="n-prod"></span><div class="rows" id="lista-prod"></div></section><section class="card" id="lista-casa" hidden></section>';
  listaProd();
}
/* Aviso rojo: productos y elaboraciones que no llegan a ningún plato */
function sinEnlaceHTML() {
  const l = sinEnlazar();
  if (!l.length) return '';
  if (estProd === 'sinenlace')
    return '<section class="card alerta-roja"><h3>Añádelos a sus fichas desde aquí</h3><p class="hint">Toca uno, marca los platos o elaboraciones que lo llevan (varios a la vez) y pon la cantidad.</p>' + sinEnlaceBotones(l, true) + '</section>';
  const np = l.filter((y) => !y.base).length,
    nb = l.length - np;
  return (
    '<section class="card alerta-roja"><h3>' +
    [np ? np + (np === 1 ? ' producto' : ' productos') : '', nb ? nb + (nb === 1 ? ' elaboración' : ' elaboraciones') : ''].filter(Boolean).join(' y ') +
    ' sin enlazar a ningún plato</h3><p class="hint">Todo lo que se compra debería estar en el escandallo de algún plato (directamente o dentro de una elaboración). Así la app calcula cuánto se gasta con las ventas y el stock mínimo. Lo que es de uso general (aceite de freidora, soplete…) márcalo como «Uso general».</p>' +
    '<p class="hint">Toca uno para añadirlo a varias fichas a la vez:</p>' + sinEnlaceBotones(l) +
    '<div class="acciones"><button class="btn small" type="button" data-act="ver-sinenlace">Ver los productos</button></div></section>'
  );
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
  else if (c === 'general') {
    p.general = t.checked;
    guardar('productos', p);
    listaProd();
    return;
  }
  else p[c] = t.value;
  guardar('productos', p);
}
function crearProd(nombre, proveedor, precio, unidad) {
  const p = nProd({
    area: areaNueva(),
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
