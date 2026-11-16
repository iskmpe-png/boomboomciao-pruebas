/* ---- Cambiar la unidad de un producto o de un ingrediente sin perder el precio real ----
   Ejemplo: «Germinado de rúcula, 20 € la unidad de 400 g» pasa a 50 €/kg, y las fichas
   que lo usaban en unidades pasan a gramos. */
let conv = null;
const CV_MEDIDA = { g: 1, kg: 1000, ml: 1, L: 1000 };
/* Devuelve el precio nuevo y por cuánto se multiplican las cantidades de las fichas */
function cvCalculo(precio, de, a, contenido) {
  if (de === a) return null;
  if (de === 'ud') return contenido > 0 ? { precio: (precio / contenido) * 1000, cant: contenido, stock: contenido / 1000 } : null;
  if (a === 'ud') return contenido > 0 ? { precio: (precio * contenido) / 1000, cant: 1 / contenido, stock: 1000 / contenido } : null;
  return { precio, cant: 1, stock: 1 }; // de kilos a litros o al revés: misma cifra
}
function abrirConv(c) {
  const p = c.prodId ? prod(c.prodId) : null,
    i = p ? null : plato(c.platoId).ingredientes[c.k],
    o = p || i;
  if (!o) return;
  conv = c;
  const otras = ['kg', 'l', 'ud'].filter((u) => u !== o.unidad),
    n = p ? usos(p.id) : 0;
  capa(
    capaTop('Cambiar unidad', (p ? p.nombre : i.nombre) + ' · ahora ' + fEur.format(o.precio) + UDP[o.unidad].slice(1)) +
      '<form id="form-conv" class="editor" novalidate>' +
      '<div class="field"><label for="cv-u">Pasar a</label><select id="cv-u">' +
      otras.map((u) => '<option value="' + u + '">' + { kg: 'Kilos (€/kg)', l: 'Litros (€/L)', ud: 'Unidades (€/ud)' }[u] + '</option>').join('') +
      '</select></div>' +
      '<div class="field" id="cv-cont"><label for="cv-c">Cada unidad trae</label><div class="precio"><input class="num" id="cv-c" type="text" inputmode="decimal" placeholder="400"><select id="cv-m" aria-label="Medida">' +
      ['g', 'kg', 'ml', 'L'].map((m) => '<option>' + m + '</option>').join('') +
      '</select></div></div>' +
      '<p class="hint wide" id="cv-res" aria-live="polite"></p>' +
      '<p class="hint wide">' +
      (p
        ? n
          ? 'Se usa en ' + n + (n === 1 ? ' ficha' : ' fichas') + ': sus cantidades se convierten solas para que el coste no cambie.'
          : 'Ninguna ficha lo usa todavía.'
        : 'Solo cambia este ingrediente de esta ficha. La cantidad se convierte sola para que el coste no cambie.') +
      '</p>' +
      '<div class="acciones wide"><button class="btn primary" type="submit" id="cv-ok" disabled>Cambiar</button><button class="btn" type="button" data-capa="cerrar">Cancelar</button></div></form>',
  );
  cvPintar();
  $('cv-c').focus({ preventScroll: true });
}
function cvDatos() {
  const p = conv.prodId ? prod(conv.prodId) : null,
    o = p || plato(conv.platoId).ingredientes[conv.k],
    a = $('cv-u').value,
    conCont = o.unidad === 'ud' || a === 'ud';
  return { p, o, a, conCont, r: cvCalculo(o.precio, o.unidad, a, conCont ? parse($('cv-c').value) * CV_MEDIDA[$('cv-m').value] : 1) };
}
function cvPintar() {
  const d = cvDatos();
  $('cv-cont').hidden = !d.conCont;
  if (d.conCont && !$('cv-c').value) $('cv-m').value = d.a === 'l' || d.o.unidad === 'l' ? 'ml' : 'g';
  $('cv-ok').disabled = !d.r;
  $('cv-res').innerHTML = d.r
    ? 'Quedará en <b>' + fEur.format(d.r.precio) + UDP[d.a].slice(1) + '</b>.'
    : d.conCont
      ? 'Escribe cuánto trae cada unidad: por ejemplo 400 g, o 1 si la caja es de un kilo.'
      : '';
}
function aplicarConv() {
  const d = cvDatos();
  if (!d.r) return;
  const precio = r3(d.r.precio);
  if (d.p) {
    const p = d.p,
      pf = p.precio > 0 ? d.r.precio / p.precio : 1;
    let fichas = 0;
    p.historial.forEach((h) => (h.p = r3(h.p * pf)));
    p.anterior = r3(p.anterior * pf);
    p.minimo = r3(p.minimo * d.r.stock);
    p.precio = precio;
    p.unidad = d.a;
    if (edIni && edIni.id === p.id) edIni.precio = precio; // no es una subida ni una bajada de precio
    S.platos.forEach((pl) => {
      let toca = false;
      pl.ingredientes.forEach((i) => {
        if (i.productoId !== p.id) return;
        i.cantidad = r3(i.cantidad * d.r.cant);
        i.precio = precio;
        i.unidad = d.a;
        toca = true;
      });
      if (toca) {
        guardar('platos', pl, true);
        fichas++;
      }
    });
    /* El recuento abierto también cambia de unidad */
    S.inventarios.forEach((v) => {
      if (v.cerrado || !(v.cantidades[p.id] > 0)) return;
      v.cantidades[p.id] = r3(v.cantidades[p.id] * d.r.stock);
      guardar('inventarios', v, true);
    });
    guardar('productos', p, true);
    toast(p.nombre + ': ahora ' + fEur.format(precio) + UDP[d.a].slice(1) + (fichas ? (fichas === 1 ? '. Ajustada 1 ficha.' : '. Ajustadas ' + fichas + ' fichas.') : '.'));
  } else {
    const pl = plato(conv.platoId),
      i = d.o;
    i.cantidad = r3(i.cantidad * d.r.cant);
    i.precio = precio;
    i.unidad = d.a;
    guardar('platos', pl, true);
    toast(i.nombre + ': ahora ' + fEur.format(precio) + UDP[d.a].slice(1) + '.');
  }
  conv = null;
  cerrarCapa();
  sucio();
  pintar();
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="conv-ud"]');
  if (!b) return;
  if (b.dataset.id) {
    abrirConv({ prodId: b.dataset.id });
    return;
  }
  const f = b.closest('.ing'),
    pl = plato(),
    i = f && pl ? pl.ingredientes[+f.dataset.k] : null;
  if (!i) return;
  if (prod(i.productoId)) abrirConv({ prodId: i.productoId });
  else if (!baseDe(i)) abrirConv({ platoId: pl.id, k: +f.dataset.k });
});
$('capa').addEventListener('input', (e) => {
  if (conv && e.target.closest('#form-conv')) cvPintar();
});
$('capa').addEventListener('change', (e) => {
  if (conv && e.target.closest('#form-conv')) cvPintar();
});
$('capa').addEventListener('submit', (e) => {
  if (!e.target.closest('#form-conv')) return;
  e.preventDefault();
  if (conv) aplicarConv();
});
