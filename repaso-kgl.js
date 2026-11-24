/* ---- Repaso de lo que ya entró: compras y productos en unidades → kg / L ----
   Primero se mira el texto (gratis): el nombre del producto o lo que ponía el albarán
   («Nata 1L», «Rúcula 125 g»). Lo que no se sepa así se puede releer con la IA desde la
   foto o el PDF guardado del albarán, de 10 en 10 para no gastar consultas de golpe. */
function analisisKgL() {
  const lineas = [],
    cand = new Map(), // producto → contenido visto en sus compras
    sinDato = new Set();
  S.compras.forEach((c) =>
    c.lineas.forEach((l, k) => {
      const p = prod(l.productoId);
      if (l.unidad !== 'ud') {
        if (p && p.unidad === 'ud' && l.conv && l.conv.c > 0 && !cand.has(p.id)) cand.set(p.id, { c: l.conv.c, u: l.conv.u, de: 'el albarán del ' + fCorta(c.fecha) });
        return;
      }
      const x = aKgL({ cantidad: l.cantidad, unidad: 'ud', precio: l.precio, desc: [l.desc, l.nombre, p ? p.nombre : ''].filter(Boolean).join(' · ') });
      if (x) {
        lineas.push({ c: c, k: k, x: x });
        if (p && p.unidad === 'ud' && !cand.has(p.id)) cand.set(p.id, { c: x.conv.c, u: x.conv.u, de: 'el albarán del ' + fCorta(c.fecha) });
      } else if (c.archivos.some((a) => !a.borrado && a.tipo !== 'hoja')) sinDato.add(c.id);
    }),
  );
  const prods = [],
    sin = [];
  S.productos.forEach((p) => {
    if (p.unidad !== 'ud' || !puedeArea(p)) return;
    const n = contenidoDe(p.nombre),
      x = n ? { c: n.c, u: n.u, de: 'el nombre' } : cand.get(p.id);
    if (x) prods.push({ p: p, c: x.c, u: x.u, de: x.de, fichas: usos(p.id) });
    else sin.push(p);
  });
  prods.sort((a, z) => z.fichas - a.fichas || a.p.nombre.localeCompare(z.p.nombre, 'es'));
  const vistos = kglVistos();
  return { lineas: lineas, prods: prods, sin: sin, releer: [...sinDato].filter((id) => !vistos.has(id)) };
}
let kgl = null;
/* Albaranes que ya releyó la IA sin encontrar el dato: no se vuelven a proponer en este móvil */
const kglVistos = () => {
  try {
    return new Set(JSON.parse(mem('bbc.kglVisto') || '[]'));
  } catch (e) {
    return new Set();
  }
};
function avisoKgLHTML() {
  if (!puede(2)) return '';
  const a = analisisKgL(),
    n = a.prods.length + a.lineas.length;
  if (!n && !a.releer.length) return '';
  return (
    '<section class="card aviso-kgl"><div><b>Precios por kilo y litro</b><p class="hint">' +
    (n
      ? (a.prods.length ? a.prods.length + (a.prods.length === 1 ? ' producto' : ' productos') + ' de Precios' : '') +
        (a.prods.length && a.lineas.length ? ' y ' : '') +
        (a.lineas.length ? a.lineas.length + (a.lineas.length === 1 ? ' línea de albaranes' : ' líneas de albaranes') : '') +
        ' están por unidades y se pueden pasar a €/kg o €/L.'
      : 'Quedan albaranes con productos por unidades que la IA puede releer para pasarlos a kg o L.') +
    '</p></div><button class="btn" type="button" data-act="kgl-abrir">Revisar</button></section>'
  );
}
function abrirKgL() {
  const a = analisisKgL();
  kgl = { a: a, off: new Set(), cont: {} };
  pintarKgL();
}
function pintarKgL(msg) {
  const a = kgl.a;
  capa(
    capaTop('Pasar a kilo y litro', 'Los escandallos van en kg o L: así el precio de compra sirve directamente.') +
      '<div class="col" style="gap:14px">' +
      (a.prods.length
        ? '<section><h3>Productos de Precios</h3><p class="hint">Las fichas que los usan se ajustan solas para que el coste del plato no cambie. Desmarca los que no quieras cambiar.</p><div class="rows">' +
          a.prods
            .map((x, k) => {
              const c = kgl.cont[x.p.id] || x.c,
                r = cvCalculo(x.p.precio, 'ud', x.u, c);
              return (
                '<label class="row kgl-p"><input type="checkbox" data-kgl="' + k + '"' + (kgl.off.has(k) ? '' : ' checked') + '><span class="grow"><b>' + esc(x.p.nombre) + '</b><small class="hint">1 ud = ' + medTxt(c, x.u) + ' (según ' + esc(x.de) + ')' +
                (x.fichas ? ' · ' + x.fichas + (x.fichas === 1 ? ' ficha' : ' fichas') : '') + '</small></span><span class="kgl-pr">' + fEur.format(x.p.precio) + '/ud → <b>' + (r ? fEur.format(r.precio) + UDP[x.u].slice(1) : '—') + '</b></span></label>'
              );
            })
            .join('') +
          '</div></section>'
        : '') +
      (a.lineas.length ? '<p>Además, <b>' + a.lineas.length + (a.lineas.length === 1 ? ' línea' : ' líneas') + ' de albaranes guardados</b> pasan a kg o L (el importe no cambia).</p>' : '') +
      (a.prods.length || a.lineas.length ? '<div class="acciones"><button class="btn primary" type="button" data-act="kgl-aplicar">Pasar a kg/L</button></div>' : '') +
      (a.releer.length
        ? '<section><h3>Releer con la IA</h3><p class="hint">' + a.releer.length + (a.releer.length === 1 ? ' albarán guardado tiene' : ' albaranes guardados tienen') +
          ' productos por unidades sin el peso o el volumen escrito. La IA puede leerlo de la foto o el PDF: gasta una consulta por albarán y se hacen de 10 en 10.</p><div class="acciones"><button class="btn" type="button" data-act="kgl-releer"' + (kgl.leyendo ? ' disabled' : '') + '>' +
          (kgl.leyendo ? 'Leyendo…' : 'Releer ' + Math.min(10, a.releer.length) + (Math.min(10, a.releer.length) === 1 ? ' albarán' : ' albaranes')) + '</button></div></section>'
        : '') +
      (a.sin.length
        ? '<details><summary>' + a.sin.length + (a.sin.length === 1 ? ' producto sigue' : ' productos siguen') + ' por unidades sin dato de peso o volumen</summary><div class="rows">' +
          a.sin.slice(0, 60).map((p) => '<div class="row"><span class="grow">' + esc(p.nombre) + '</span><button class="btn small" type="button" data-act="conv-ud" data-id="' + esc(p.id) + '">Poner cuánto trae</button></div>').join('') +
          '</div></details>'
        : '') +
      '<p class="hint" id="kgl-msg" aria-live="polite">' + esc(msg || '') + '</p></div>',
  );
}
function aplicarKgL() {
  const a = kgl.a;
  let np = 0,
    nf = 0,
    nl = 0;
  a.prods.forEach((x, k) => {
    if (kgl.off.has(k) || x.p.unidad !== 'ud') return;
    const r = cvCalculo(x.p.precio, 'ud', x.u, kgl.cont[x.p.id] || x.c);
    if (!r) return;
    nf += convertirProducto(x.p, x.u, r);
    np++;
  });
  const tocadas = new Set();
  a.lineas.forEach((y) => {
    const l = y.c.lineas[y.k];
    if (!l || l.unidad !== 'ud') return;
    Object.assign(l, { cantidad: y.x.cantidad, unidad: y.x.unidad, precio: y.x.precio, conv: y.x.conv });
    tocadas.add(y.c);
    nl++;
  });
  tocadas.forEach((c) => guardar('compras', c, true));
  dlSucio = true;
  sucio();
  cerrarCapa();
  pintar();
  toast(
    'Listo: ' + [np ? np + (np === 1 ? ' producto' : ' productos') : '', nl ? nl + (nl === 1 ? ' línea de albarán' : ' líneas de albaranes') : ''].filter(Boolean).join(' y ') +
      ' en kg o L' + (nf ? ' · ' + nf + (nf === 1 ? ' ficha ajustada' : ' fichas ajustadas') : '') + '.',
  );
}
async function releerKgL() {
  if (!sAPI) return toast('Releer albaranes necesita la IA activada.');
  const ids = kgl.a.releer.slice(0, 10);
  kgl.leyendo = true;
  pintarKgL('Leyendo ' + ids.length + (ids.length === 1 ? ' albarán…' : ' albaranes…'));
  let ok = 0,
    nl = 0,
    fallos = 0;
  for (const id of ids) {
    const c = S.compras.find((x) => x.id === id);
    if (!c) continue;
    const ks = c.lineas.map((l, k) => (l.unidad === 'ud' ? k : -1)).filter((k) => k >= 0);
    if (!ks.length) continue;
    try {
      const imgs = [],
        textos = [];
      for (const ar of c.archivos.filter((x) => !x.borrado && x.tipo !== 'hoja').slice(0, 4)) {
        const b = await blobArchivo(ar.ruta);
        if (!b) continue;
        const d = await leerDocumento(new File([b], ar.nombre || 'albaran', { type: b.type || (ar.tipo === 'pdf' ? 'application/pdf' : 'image/jpeg') }));
        imgs.push(...d.imagenes);
        textos.push(...d.textos);
      }
      if (!imgs.length && !textos.length) {
        fallos++;
        continue;
      }
      const r = await sAPI.json(
        'Este es un albarán de proveedor ya guardado. Para cada línea de la lista, di cuánto pesa o trae CADA unidad facturada según el documento (por ejemplo «Nata 250ml» → 250 y "ml"; «caja 6x1L» facturada por cajas → 6 y "l"). Si el documento no lo dice, null: no lo supongas.\n' +
          'Responde SOLO con JSON: {"lineas":[{"i":número de la lista,"contenido":número o null,"contenido_unidad":"g"|"kg"|"ml"|"cl"|"l"|null}]}\n' +
          'Lista:\n' + ks.map((k, j) => j + 1 + '. ' + c.lineas[k].nombre + ' (' + fNum(c.lineas[k].cantidad, 2) + ' ud a ' + fEurN.format(c.lineas[k].precio) + ')').join('\n') +
          (textos.length ? '\n\nTEXTO DEL DOCUMENTO:\n' + textos.join('\n').slice(0, 20000) : ''),
        { images: imgs.slice(0, 4), cache: false, nivel: 'alto' },
      );
      let cambia = false;
      (r && Array.isArray(r.lineas) ? r.lineas : []).forEach((x) => {
        const k = ks[(Number(x.i) || 0) - 1],
          l = c.lineas[k];
        if (!l || l.unidad !== 'ud') return;
        const y = aKgL({ cantidad: l.cantidad, unidad: 'ud', precio: l.precio, contenido: x.contenido, contenido_unidad: x.contenido_unidad, desc: '' });
        if (!y) return;
        Object.assign(l, { cantidad: y.cantidad, unidad: y.unidad, precio: y.precio, conv: y.conv });
        cambia = true;
        nl++;
      });
      /* Aunque no se encuentre nada, el albarán no se vuelve a proponer */
      const v = kglVistos();
      v.add(c.id);
      mem('bbc.kglVisto', JSON.stringify([...v].slice(-500)));
      if (cambia) guardar('compras', c, true);
      ok++;
    } catch (e) {
      fallos++;
      if (e && (e.code === 'rate_limited' || e.code === 'session_expired')) {
        toast(errIA(e));
        break;
      }
    }
  }
  kgl.leyendo = false;
  kgl.a = analisisKgL();
  pintarKgL('Leídos ' + ok + (ok === 1 ? ' albarán' : ' albaranes') + ': ' + nl + (nl === 1 ? ' línea' : ' líneas') + ' ya en kg o L' + (fallos ? ' · ' + fallos + ' sin poder leer' : '') + '. Revisa arriba los productos que se pueden pasar.');
}
/* El repaso se abre en una capa (fuera de la vista), por eso escucha en todo el documento */
document.addEventListener('click', (e) => {
  const cu = e.target.closest('#capa [data-act="conv-ud"]');
  if (cu && kgl) {
    abrirConv({ prodId: cu.dataset.id });
    return;
  }
  const b = e.target.closest('[data-act^="kgl-"]');
  if (!b) return;
  if (!puede(2)) return toast('Solo el encargado o el dueño cambian Precios.');
  const a = b.dataset.act;
  if (a === 'kgl-abrir') abrirKgL();
  else if (a === 'kgl-aplicar') aplicarKgL();
  else if (a === 'kgl-releer' && !kgl.leyendo) releerKgL();
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!kgl || !t.dataset || t.dataset.kgl === undefined) return;
  const k = +t.dataset.kgl;
  if (t.checked) kgl.off.delete(k);
  else kgl.off.add(k);
});
