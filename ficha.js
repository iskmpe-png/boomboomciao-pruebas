/* ---- Carta: ficha de un plato ---- */
function precioHTML(i, k) {
  if (enlace(i)) return '<span>Precio</span><output data-out="pt"></output>';
  return (
    '<span>Precio</span><div class="precio"><input class="num" id="ing-' +
    k +
    '-precio" data-c="precio" type="text" inputmode="decimal" aria-label="Precio de compra" value="' +
    esc(show(i.precio)) +
    '">' +
    '<select data-c="unidad" aria-label="Unidad de compra">' +
    ['kg', 'l', 'ud']
      .map((x) => '<option value="' + x + '"' + (x === i.unidad ? ' selected' : '') + '>' + UDP[x] + '</option>')
      .join('') +
    '</select></div>'
  );
}
function notaIng(i) {
  const pr = prod(i.productoId),
    b = i.merma > 0 && i.cantidad > 0 ? '<span>bruto ' + fNum(bruto(i)) + ' ' + UD[un(i)] + '</span>' : '';
  if (pr) return (pr.proveedor ? '<span class="chip">' + esc(pr.proveedor) + '</span>' : '') + b;
  if (baseDe(i)) return '<span class="chip">Elaboración de la casa</span>' + b;
  if (i.nombre.trim() && i.precio > 0)
    return '<button class="link" type="button" data-act="guardar-prod">Guardar en Precios</button>' + b;
  return b;
}
const filaIng = (i, k) =>
  '<div class="ing" data-k="' +
  k +
  '">' +
  '<div class="i-n"><input id="ing-' +
  k +
  '-nombre" data-c="nombre" type="text" list="dl-productos" autocomplete="off" aria-label="Ingrediente" placeholder="Ingrediente" value="' +
  esc(nom(i)) +
  '"><button class="icon" type="button" data-act="quitar-ing" aria-label="Quitar ingrediente">×</button></div>' +
  '<label class="mini"><span>Cant. (<i data-ud style="font-style:normal">' +
  UD[un(i)] +
  '</i>)</span><input class="num" id="ing-' +
  k +
  '-cantidad" data-c="cantidad" type="text" inputmode="decimal" aria-label="Cantidad" value="' +
  esc(show(i.cantidad)) +
  '"></label>' +
  '<label class="mini"><span>Merma %</span><input class="num" data-c="merma" type="text" inputmode="decimal" aria-label="Merma en porcentaje" value="' +
  esc(show(i.merma)) +
  '"></label>' +
  '<div class="mini i-p' +
  (enlace(i) ? '' : ' libre') +
  '">' +
  precioHTML(i, k) +
  '</div><div class="mini"><span>Coste</span><b data-out="coste"></b></div><div class="i-x" data-out="nota"></div></div>';
function vFicha() {
  const p = plato();
  $('vista').innerHTML =
    '<div class="bar"><button class="btn" type="button" data-act="volver">← Carta</button><div class="resumen" aria-live="polite"><b class="g" id="o-racion"></b><span id="o-uni"></span><span class="pill" id="o-pill"></span><span id="o-rec"></span></div>' +
    expHTML(1) +
    '</div>' +
    '<div class="dos"><div class="col">' +
    '<section class="card"><details' +
    (!p.nombre || (window.matchMedia && matchMedia('(min-width:860px)').matches) ? ' open' : '') +
    ' style="border:0;padding:0"><summary>Datos de la ficha</summary><div class="ficha">' +
    '<div class="field wide"><label for="p-nombre">Nombre</label><input id="p-nombre" data-p="nombre" type="text" autocomplete="off" placeholder="Ej. Pizza Margherita" value="' +
    esc(p.nombre) +
    '"></div>' +
    (p.base
      ? '<div class="field"><label for="p-raciones">Rinde</label><input class="num" id="p-raciones" data-p="raciones" type="text" inputmode="decimal" value="' +
        esc(show(p.raciones)) +
        '"></div>' +
        '<div class="field"><label for="p-ub">Se mide en</label><select id="p-ub" data-p="unidadBase">' +
        ['kg', 'l', 'ud']
          .map(
            (x) =>
              '<option value="' +
              x +
              '"' +
              (x === p.unidadBase ? ' selected' : '') +
              '>' +
              { kg: 'kilos', l: 'litros', ud: 'unidades' }[x] +
              '</option>',
          )
          .join('') +
        '</select></div>' +
        '<div class="field"><label for="p-cad">Días de vida</label><input class="num" id="p-cad" data-p="caducidad" type="text" inputmode="numeric" placeholder="3" value="' +
        esc(show(p.caducidad)) +
        '"></div>'
      : '<div class="field"><label for="p-raciones">Raciones</label><input class="num" id="p-raciones" data-p="raciones" type="text" inputmode="decimal" value="' +
        esc(show(p.raciones)) +
        '"></div>' +
        '<div class="field"><label for="p-pvp">Precio carta €</label><input class="num" id="p-pvp" data-p="pvp" type="text" inputmode="decimal" placeholder="con IVA" value="' +
        esc(show(p.pvp)) +
        '"></div>' +
        '<div class="field"><label for="p-objetivo">Objetivo %</label><input class="num" id="p-objetivo" data-p="objetivo" type="text" inputmode="decimal" value="' +
        esc(show(p.objetivo)) +
        '"></div>' +
        '<div class="field"><label for="p-iva">IVA %</label><input class="num" id="p-iva" data-p="iva" type="text" inputmode="decimal" value="' +
        esc(String(p.iva).replace('.', ',')) +
        '"></div>' +
        '<div class="field wide"><label for="p-grupo">Carta o menú</label><input id="p-grupo" data-p="grupo" type="text" list="dl-grupos" autocomplete="off" placeholder="Ej. Carta, Brunch, Menú Nochevieja" value="' +
        esc(p.grupo) +
        '"></div>') +
    '<label class="check wide" for="p-base"><input type="checkbox" id="p-base" data-p="base"' +
    (p.base ? ' checked' : '') +
    '> Es una elaboración de la casa (salsa, masa, base)</label>' +
    '</div></details></section>' +
    '<section class="card"><h2>Ingredientes</h2><div><div class="ing-head"><span>Ingrediente</span><span>Cantidad</span><span>Merma %</span><span>Precio</span><span>Coste</span></div>' +
    '<div id="lista">' +
    p.ingredientes.map(filaIng).join('') +
    '</div></div><div class="acciones"><button class="btn" type="button" data-act="add-ing">Añadir ingrediente</button></div></section>' +
    '</div><div class="col">' +
    '<section class="card"><h3>Dónde se va el coste</h3><div class="barras" id="barras"></div><p class="hint" id="o-total"></p></section>' +
    extraFicha(p) +
    '<div class="acciones"><a class="btn" href="#cocina-recetas" data-act="ir-receta">Ver receta</a><button class="btn danger" type="button" data-act="borrar-plato">Eliminar</button></div>' +
    '</div></div>';
  calcular();
}
function calcular() {
  const p = plato(),
    lista = $('lista');
  if (!p || !lista) return;
  const filas = lista.children;
  let total = 0;
  const costes = [];
  p.ingredientes.forEach((i, k) => {
    const c = coste(i);
    costes.push(c);
    total += c;
    const f = filas[k];
    if (!f) return;
    q(f, '[data-out="coste"]').textContent = fEur.format(c);
    const pt = q(f, '[data-out="pt"]');
    if (pt) pt.textContent = fEur.format(pre(i)) + UDP[un(i)].slice(1);
    q(f, '[data-ud]').textContent = UD[un(i)];
    q(f, '[data-out="nota"]').innerHTML = notaIng(i);
  });
  const rac = p.raciones > 0 ? p.raciones : 1,
    cr = total / rac,
    iva = 1 + (p.iva || 0) / 100,
    obj = p.objetivo > 0 ? p.objetivo : 30,
    pill = $('o-pill');
  $('o-racion').textContent = fEur.format(cr);
  $('o-uni').textContent = p.base ? 'por ' + { kg: 'kilo', l: 'litro', ud: 'unidad' }[p.unidadBase] : 'por ración';
  if (p.base) {
    pill.hidden = true;
    const nb = usosBase(p.id);
    $('o-rec').textContent = nb === 1 ? 'en 1 ficha' : 'en ' + nb + ' fichas';
  } else {
    pill.hidden = false;
    $('o-rec').textContent = cr > 0 ? 'recomendado ' + fEur.format((cr / (obj / 100)) * iva) : '';
    if (p.pvp > 0 && cr > 0) {
      const fc = (cr / (p.pvp / iva)) * 100;
      pill.className = 'pill ' + (fc <= obj ? 'ok' : fc <= obj + 5 ? 'warn' : 'crit');
      pill.textContent = 'Food cost ' + fNum(fc) + ' %';
    } else {
      pill.className = 'pill';
      pill.textContent = cr > 0 ? 'Falta el precio de carta' : 'Añade ingredientes';
    }
  }
  $('o-total').textContent =
    'Receta completa: ' +
    fEur.format(total) +
    ' para ' +
    rinde(p) +
    (!p.base && p.pvp > 0 && cr > 0 ? ' · margen ' + fEur.format(p.pvp / iva - cr) + ' por ración' : '');
  const orden = p.ingredientes
    .map((i, k) => ({ n: nom(i) || 'Sin nombre', c: costes[k] }))
    .filter((x) => x.c > 0)
    .sort((a, z) => z.c - a.c);
  $('barras').innerHTML = orden.length
    ? orden
        .map((x) => {
          const pct = total > 0 ? (x.c / total) * 100 : 0;
          return (
            '<div class="fila-barra"><span>' +
            esc(x.n) +
            '</span><span class="v">' +
            fNum(pct, 0) +
            ' % · ' +
            fEur.format(x.c) +
            '</span><span class="pista"><i style="width:' +
            pct +
            '%"></i></span></div>'
          );
        })
        .join('')
    : '<p class="hint">Añade precios y cantidades para ver qué pesa más.</p>';
  calcExtra();
}
function inputFicha(e) {
  const p = plato();
  if (!p) return;
  const t = e.target;
  if (t.dataset.p) {
    const dp = t.dataset.p;
    if (dp === 'base') {
      p.base = t.checked;
      guardar('platos', p);
      vFicha();
      return;
    }
    if (dp === 'unidadBase') {
      p.unidadBase = uni(t.value);
      guardar('platos', p);
      vFicha();
      return;
    }
    p[dp] = dp === 'nombre' || dp === 'grupo' || dp === 'descripcion' || dp === 'vino' ? t.value : parse(t.value);
    calcular();
    guardar('platos', p);
    return;
  }
  const f = t.closest('.ing'),
    c = t.dataset.c;
  if (!f || !c) return;
  const k = +f.dataset.k,
    i = p.ingredientes[k];
  if (!i) return;
  if (c === 'nombre') {
    const pr = prodPorNombre(t.value),
      bs = pr ? null : basePorNombre(t.value, p.id),
      aP = r3(pre(i)),
      aU = un(i),
      antes = enlace(i);
    if (pr) {
      i.productoId = pr.id;
      i.baseId = '';
      i.nombre = pr.nombre;
      i.precio = pr.precio;
      i.unidad = pr.unidad;
    } else if (bs) {
      i.baseId = bs.id;
      i.productoId = '';
      i.nombre = bs.nombre;
      i.precio = r3(costeUd(bs));
      i.unidad = bs.unidadBase;
    } else {
      if (antes) {
        i.precio = aP;
        i.unidad = aU;
      }
      i.productoId = '';
      i.baseId = '';
      i.nombre = t.value;
    }
    if (!!antes !== !!(pr || bs)) {
      const ip = q(f, '.i-p');
      ip.innerHTML = precioHTML(i, k);
      ip.classList.toggle('libre', !(pr || bs));
    }
  } else if (c === 'unidad') i.unidad = uni(t.value);
  else i[c] = parse(t.value);
  calcular();
  guardar('platos', p);
}
