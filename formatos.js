/* ---- Formatos de compra → kilo o litro ----
   Los escandallos van siempre en kg o L, así que lo que llega por unidades con su peso o
   volumen se pasa a €/kg o €/L. La IA solo lee lo que pone el albarán (cuántas unidades,
   cuánto trae cada una y su precio); la cuenta la hace la app, que no se equivoca dividiendo.
   Ejemplo: 10 ud de 250 ml a 5,00 € → 2,5 L a 20,00 €/L. */
const FMT_U = {
  g: ['kg', 1], gr: ['kg', 1], grs: ['kg', 1], gramo: ['kg', 1], gramos: ['kg', 1],
  kg: ['kg', 1000], kgs: ['kg', 1000], kilo: ['kg', 1000], kilos: ['kg', 1000],
  ml: ['l', 1], cc: ['l', 1], cl: ['l', 10], dl: ['l', 100],
  l: ['l', 1000], lt: ['l', 1000], lts: ['l', 1000], ltr: ['l', 1000], litro: ['l', 1000], litros: ['l', 1000],
};
const RE_MED = 'kgs?|kilos?|gramos?|grs?|g|ml|cl|dl|cc|litros?|ltr|lts?|l';
const numF = (s) => Number(String(s).replace(',', '.'));
/* Cuánto trae cada unidad según el texto: «Nata 1L», «Atún 1,8 kg», «Agua 6x1,5 l».
   Devuelve { u: 'kg'|'l', c: gramos o mililitros por unidad, pack: true si era un paquete NxM } */
function contenidoDe(t) {
  t = String(t || '').toLowerCase();
  if (!t) return null;
  const pack = new RegExp('(\\d+(?:[.,]\\d+)?)\\s*(?:x|×|\\*|uds?\\.?\\s*(?:x|de))\\s*(\\d+(?:[.,]\\d+)?)\\s*(' + RE_MED + ')(?![a-zñ])').exec(t);
  if (pack) {
    const f = FMT_U[pack[3]],
      c = numF(pack[1]) * numF(pack[2]) * f[1];
    return c > 0 ? { u: f[0], c: c, pack: true } : null;
  }
  const uno = new RegExp('(?:^|[^\\d.,])(\\d+(?:[.,]\\d+)?)\\s*(' + RE_MED + ')(?![a-zñ])').exec(t);
  if (!uno) return null;
  const f = FMT_U[uno[2]],
    c = numF(uno[1]) * f[1];
  /* Entre 1 g y 50 kg (o ml / L): lo demás seguro que no es el contenido */
  return c >= 1 && c <= 50000 ? { u: f[0], c: c, pack: false } : null;
}
/* Pasa una línea de albarán facturada por unidades a kg o L.
   l: { cantidad, unidad, precio (por unidad facturada), importe, contenido, contenido_unidad, desc } */
function aKgL(l) {
  if (!l || l.unidad !== 'ud') return null;
  let k = null;
  const cu = String(l.contenido_unidad || '').toLowerCase().trim();
  if (Number(l.contenido) > 0 && FMT_U[cu]) {
    const c = Number(l.contenido) * FMT_U[cu][1];
    if (c >= 1 && c <= 50000) k = { u: FMT_U[cu][0], c: c, pack: false };
  }
  if (!k) k = contenidoDe(l.desc);
  if (!k) return null;
  const n = Number(l.cantidad) || 0,
    im = Number(l.importe) || 0;
  let pud = Number(l.precio) || 0;
  if (!pud && im && n) pud = im / n;
  if (!(n > 0) || !(pud > 0)) return null;
  return {
    cantidad: r3((n * k.c) / 1000),
    unidad: k.u,
    precio: r3(pud / (k.c / 1000)),
    conv: { n: n, c: k.c, u: k.u, pud: r3(pud), pack: !!k.pack },
  };
}
const medTxt = (c, u) => (c >= 1000 ? fNum(c / 1000, 3) + (u === 'kg' ? ' kg' : ' L') : fNum(c, 1) + (u === 'kg' ? ' g' : ' ml'));
/* «10 ud × 250 ml a 5,00 € → 2,5 L a 20,00 €/L» */
function convTxt(conv, cantidad, precio) {
  return (
    fNum(conv.n, 2) + ' ud × ' + medTxt(conv.c, conv.u) + ' a ' + fEurN.format(conv.pud) +
    ' → ' + fNum(cantidad, 3) + (conv.u === 'kg' ? ' kg' : ' L') + ' a ' + fEurN.format(precio) + (conv.u === 'kg' ? '/kg' : '/L')
  );
}
