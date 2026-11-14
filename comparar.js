/* ---- Comparar proveedores ---- */
function comparables() {
  const out = [];
  idx().fam.forEach((l) => {
    if (l.length < 2) return;
    const byU = {};
    l.forEach((p) => {
      if (p.precio > 0) (byU[p.unidad] || (byU[p.unidad] = [])).push(p);
    });
    Object.keys(byU).forEach((u) => {
      const g = byU[u].slice().sort((a, z) => a.precio - z.precio);
      if (g.length < 2 || g[0].precio === g[g.length - 1].precio) return;
      out.push({ barato: g[0], otros: g.slice(1).filter((o) => o.precio > g[0].precio) });
    });
  });
  return out.sort((a, z) => a.barato.nombre.localeCompare(z.barato.nombre, 'es'));
}
function vComparar() {
  const l = comparables();
  $('vista').innerHTML =
    '<div class="bar"><span class="hint grow">Mismo producto en varios proveedores. Se emparejan por nombre: lo que va entre paréntesis no cuenta.</span>' +
    expHTML() +
    '</div>' +
    (l.length
      ? '<section class="card"><div class="rows">' +
        l
          .map(
            (c) =>
              '<div class="row" style="grid-template-columns:minmax(0,1fr)"><div class="n"><b>' +
              esc(c.barato.nombre.replace(/\s*\(.*?\)/g, '')) +
              '</b><span>Más barato: ' +
              esc(c.barato.proveedor || 'sin proveedor') +
              ' a ' +
              fEur.format(c.barato.precio) +
              UDP[c.barato.unidad].slice(1) +
              '</span></div>' +
              c.otros
                .map((o) => {
                  const n = usos(o.id);
                  return (
                    '<div class="acciones" style="justify-content:space-between" data-de="' +
                    esc(o.id) +
                    '" data-a="' +
                    esc(c.barato.id) +
                    '"><span class="hint">' +
                    esc(o.proveedor || o.nombre) +
                    ': ' +
                    fEur.format(o.precio) +
                    ' <span class="pill crit">+' +
                    fNum(((o.precio - c.barato.precio) / c.barato.precio) * 100, 0) +
                    ' %</span>' +
                    (n ? ' · en ' + n + (n === 1 ? ' ficha' : ' fichas') : '') +
                    '</span>' +
                    (n
                      ? '<button class="link" type="button" data-act="cambiar-prov">Usar el barato en las fichas</button>'
                      : '') +
                    '</div>'
                  );
                })
                .join('') +
              '</div>',
          )
          .join('') +
        '</div></section>'
      : vacio(
          'Nada que comparar todavía',
          'Cuando tengas el mismo producto con dos proveedores, por ejemplo "Mantequilla" y "Mantequilla (Makro)", aquí verás cuál sale más barato.',
          '',
        ));
}
