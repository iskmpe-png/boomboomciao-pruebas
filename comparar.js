/* ---- Comparar proveedores ---- */
function comparables() {
  const out = [];
  idx().fam.forEach((l0, fam) => {
    const l = l0.filter(enArea);
    if (l.length < 2) return;
    const byU = {};
    /* Por unidades no se compara: una nata de 1 L y otra de 2 L no valen lo mismo «por unidad» */
    l.forEach((p) => {
      if (p.precio > 0 && p.unidad !== 'ud') (byU[p.unidad] || (byU[p.unidad] = [])).push(p);
    });
    /* Se compara el grupo más numeroso; los que van en otra unidad se avisan aparte */
    const us = Object.keys(byU).sort((a, z) => byU[z].length - byU[a].length);
    if (!us.length || byU[us[0]].length < 2) return;
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
  agruparSiToca();
  const l = comparables();
  $('vista').innerHTML =
    '<div class="bar"><span class="hint grow">Solo se comparan productos que se pueden usar uno por otro: mismo producto, variedad y presentación (seco, congelado, lata, lomo…), aunque sean de otra marca o proveedor, y siempre por kilo o por litro (lo que va por unidades hay que pasarlo antes a kg/L). Si uno cae en el grupo equivocado, cámbiale «Grupo para comparar» en Precios › Productos.</span>' +
    (sAPI && puede(2) ? '<button class="btn" type="button" data-act="agrupar-ia">Agrupar con IA</button>' : '') +
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

/* ---- La IA pone a cada producto su grupo para comparar ----
   Solo se comparan productos que se pueden cambiar uno por otro en una receta: mismo producto,
   variedad, corte y presentación. La marca, el proveedor y el tamaño del envase dan igual.
   Se hace con el modelo barato, solo con los productos que aún no tienen grupo, y se guarda:
   no se vuelve a preguntar mientras no cambie el nombre. */
let agrupando = false;
async function agruparIA(aviso) {
  if (!sAPI || !puede(2) || agrupando) return 0;
  const pend = S.productos.filter((p) => puedeArea(p) && !p.general && !p.familia.trim() && !claveIA(p) && p.nombre.trim());
  if (!pend.length) {
    if (aviso) toast('Todos los productos ya tienen su grupo.');
    return 0;
  }
  agrupando = true;
  if (aviso) toast('La IA está agrupando ' + pend.length + (pend.length === 1 ? ' producto…' : ' productos…'));
  const ya = [...new Set(S.productos.map(claveIA).filter(Boolean))].slice(0, 400);
  let n = 0;
  try {
    for (let k = 0; k < pend.length; k += 120) {
      const t = pend.slice(k, k + 120);
      const r = await sAPI.json(
        'Eres jefe de compras de un restaurante. Asigna a cada producto una clave corta en minúsculas para comparar precios entre proveedores.\n' +
          'Dos productos llevan la MISMA clave solo si se pueden usar uno en lugar del otro en una receta: mismo producto, misma variedad o sabor, mismo corte y misma presentación o conservación. ' +
          'Ignora la marca, el proveedor y el tamaño del envase.\n' +
          'Ejemplos de claves DISTINTAS: «croquetas cecina» y «croquetas boletus»; «boletus seco» y «boletus congelado»; «atún lata aceite» y «atún lomo fresco»; «aceite oliva virgen extra» y «aceite girasol»; «tomate triturado lata» y «tomate pera fresco».\n' +
          'Ejemplo de la MISMA clave: «Nata 35% Président 1L» y «Nata para montar 35 % Pascual 2L» → «nata montar 35».\n' +
          (ya.length ? 'Claves que ya existen (reutilízalas si encaja exactamente): ' + ya.join(' | ') + '\n' : '') +
          'Responde SOLO con JSON: {"p":[{"i":número,"clave":"..."}]}\nProductos:\n' +
          t.map((p, j) => j + 1 + '. ' + p.nombre + (p.proveedor ? ' (' + p.proveedor + ')' : '') + ' · ' + UDP[p.unidad]).join('\n'),
        { nivel: 'simple' },
      );
      (r && Array.isArray(r.p) ? r.p : []).forEach((x) => {
        const p = t[(Number(x.i) || 0) - 1],
          c = norm(String(x.clave || '')).slice(0, 60);
        if (!p || !c) return;
        p.clave = c;
        p.claveDe = norm(p.nombre);
        guardar('productos', p, true);
        n++;
      });
    }
  } catch (e) {
    if (aviso) toast(errIA(e));
  }
  agrupando = false;
  mem('bbc.agrupado', String(Date.now()));
  if (n) {
    ix = null;
    if (pant === 'comparar' || pant === 'alertas') pintar();
    if (aviso) toast('Listo: ' + n + (n === 1 ? ' producto agrupado.' : ' productos agrupados.'));
  }
  return n;
}
/* Al abrir Comparar o Alertas se agrupan solos los productos nuevos (como mucho cada 6 horas) */
function agruparSiToca() {
  const t = Number(mem('bbc.agrupado')) || 0;
  if (Date.now() - t > 6 * 3600e3) setTimeout(() => agruparIA(false), 1500);
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-act="agrupar-ia"]')) agruparIA(true);
});
