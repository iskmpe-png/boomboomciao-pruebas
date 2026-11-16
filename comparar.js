/* ---- Comparar proveedores ---- */
function comparables() {
  const out = [];
  idx().fam.forEach((l, fam) => {
    if (l.length < 2) return;
    const byU = {};
    l.forEach((p) => {
      if (p.precio > 0) (byU[p.unidad] || (byU[p.unidad] = [])).push(p);
    });
    /* Se compara el grupo más numeroso; los que van en otra unidad se avisan aparte */
    const us = Object.keys(byU).sort((a, z) => byU[z].length - byU[a].length);
    if (!us.length) return;
    const g = byU[us[0]].slice().sort((a, z) => a.precio - z.precio),
      fuera = l.filter((p) => p.precio > 0 && p.unidad !== us[0]);
    if (g.length < 2 && !fuera.length) return;
    out.push({ fam, barato: g[0], otros: g.slice(1), fuera });
  });
  return out.sort((a, z) => a.fam.localeCompare(z.fam, 'es'));
}
/* Título del grupo con la palabra tal como está escrita en los productos (con su tilde) */
function cmpTitulo(c) {
  const t = c.fam
    .split(' ')
    .map((w) => {
      let hit = '';
      [c.barato].concat(c.otros, c.fuera).some((p) =>
        p.nombre.replace(/\(.*?\)/g, '').split(/\s+/).some((o) => {
          if (famSingular(norm(o)) !== w) return false;
          hit = o === o.toUpperCase() ? o.toLowerCase() : o;
          return true;
        }),
      );
      return hit || w;
    })
    .join(' ')
    .toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const cmpNombre = (p) => esc(p.nombre) + (p.proveedor ? ' <span class="hint">· ' + esc(p.proveedor) + '</span>' : '');
function vComparar() {
  const l = comparables();
  $('vista').innerHTML =
    '<div class="bar"><span class="hint grow">Productos del mismo tipo, aunque estén escritos distinto o sean de otra marca o proveedor. Se agrupan por el principio del nombre; si un producto cae en el grupo equivocado, cámbiale «Grupo para comparar» en Precios › Productos.</span>' +
    expHTML() +
    '</div>' +
    (l.length
      ? '<section class="card"><div class="rows">' +
        l
          .map(
            (c) =>
              '<div class="row" style="grid-template-columns:minmax(0,1fr)"><div class="n"><b>' +
              esc(cmpTitulo(c)) +
              '</b><span>Más barato: ' +
              cmpNombre(c.barato) +
              ' a ' +
              fEur.format(c.barato.precio) +
              UDP[c.barato.unidad].slice(1) +
              '</span></div>' +
              c.otros
                .map((o) => {
                  const n = usos(o.id),
                    dif = ((o.precio - c.barato.precio) / c.barato.precio) * 100;
                  return (
                    '<div class="acciones" style="justify-content:space-between" data-de="' +
                    esc(o.id) +
                    '" data-a="' +
                    esc(c.barato.id) +
                    '"><span>' +
                    cmpNombre(o) +
                    ': ' +
                    fEur.format(o.precio) +
                    (dif >= 0.5 ? ' <span class="pill crit">+' + fNum(dif, 0) + ' %</span>' : ' <span class="pill">Igual</span>') +
                    (n ? ' <span class="hint">· en ' + n + (n === 1 ? ' ficha' : ' fichas') + '</span>' : '') +
                    '</span>' +
                    (n && dif >= 0.5
                      ? '<button class="link" type="button" data-act="cambiar-prov">Usar el barato en las fichas</button>'
                      : '') +
                    '</div>'
                  );
                })
                .join('') +
              (c.fuera.length
                ? '<p class="hint">No entran en la comparación por ir en otra unidad: ' +
                  c.fuera.map((o) => esc(o.nombre) + ' (' + fEur.format(o.precio) + UDP[o.unidad].slice(1) + ')').join(', ') +
                  '. Pásalos a ' + UDP[c.barato.unidad].slice(2) + ' con «Cambiar unidad» en Precios › Productos.</p>'
                : '') +
              '</div>',
          )
          .join('') +
        '</div></section>'
      : vacio(
          'Nada que comparar todavía',
          'Cuando tengas dos productos del mismo tipo, por ejemplo «Mantequilla Président» y «Mantequilla Makro», aquí verás cuál sale más barato.',
          '',
        ));
}
