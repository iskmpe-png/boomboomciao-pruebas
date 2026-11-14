/* ---- Índices: búsquedas por id y por nombre sin recorrer las listas ---- */
let ix = null,
  dlSucio = true;
function idx() {
  if (!ix) {
    ix = { p: new Map(), pn: new Map(), pk: new Map(), pl: new Map(), bn: new Map(), fam: new Map() };
    S.productos.forEach((p) => {
      ix.p.set(p.id, p);
      ix.pn.set(norm(p.nombre), p);
      ix.pk.set(p.id, norm(p.nombre + ' ' + p.proveedor));
      const f = famDe(p);
      if (!ix.fam.has(f)) ix.fam.set(f, []);
      ix.fam.get(f).push(p);
    });
    S.platos.forEach((p) => {
      ix.pl.set(p.id, p);
      if (p.base) ix.bn.set(norm(p.nombre), p);
    });
  }
  return ix;
}
function sucio() {
  ix = null;
  dlSucio = true;
}
