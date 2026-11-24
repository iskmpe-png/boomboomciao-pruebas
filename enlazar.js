/* ---- Añadir a fichas: meter un producto (o una elaboración) en varios platos y elaboraciones a la vez ----
   Se abre desde Productos (el editor de cada producto y el aviso rojo «sin enlazar»), que es donde se ve
   lo que falta. Así no hay que ir plato por plato. */
let enl = null; // { tipo: 'p' | 'b', id }
const udCant = (u) => (u === 'ud' ? 'ud' : u === 'l' ? 'ml' : 'g');
const enlObj = (c) => (c.tipo === 'b' ? plato(c.id) : prod(c.id));
const lineaDe = (f, c) => f.ingredientes.some((i) => (c.tipo === 'b' ? i.baseId === c.id : i.productoId === c.id));
/* ¿La elaboración a lleva dentro (a cualquier nivel) la elaboración bid? Evita meter una elaboración dentro de sí misma */
function llevaBase(a, bid, d) {
  if (!a || (d || 0) > 6) return false;
  return a.ingredientes.some((i) => i.baseId && (i.baseId === bid || llevaBase(plato(i.baseId), bid, (d || 0) + 1)));
}
/* Fichas donde se puede añadir: las de mi zona, que aún no lo llevan y que no crean un bucle */
function fichasDestino(c) {
  const x = enlObj(c);
  return S.platos.filter(
    (f) => f.nombre && f.id !== c.id && enArea(f) && puedeArea(f) && !lineaDe(f, c) && !(c.tipo === 'b' && f.base && llevaBase(x, f.id)),
  );
}
function grupoEnl(l, base) {
  const g = {};
  l.forEach((f) => {
    const k = f.grupo.trim() || (base ? 'Sin grupo' : 'Platos');
    (g[k] || (g[k] = [])).push(f);
  });
  return Object.keys(g)
    .sort((a, z) => a.localeCompare(z, 'es'))
    .map((k) => [k, g[k].sort((a, z) => a.nombre.localeCompare(z.nombre, 'es'))]);
}
function filaEnl(f, u) {
  return (
    '<div class="enl-f" data-f="' + esc(f.id) + '" data-n="' + esc(norm(f.nombre)) + '"><label class="check"><input type="checkbox" data-enl="ok"> <span>' + esc(f.nombre) +
    (f.base ? ' <span class="hint">· da ' + show(f.raciones || 1) + ' ' + esc(UDI[f.unidadBase] || f.unidadBase) + '</span>' : '') +
    '</span></label><span class="enl-c"><input class="num" type="text" inputmode="decimal" data-enl="cant" placeholder="0" aria-label="Cantidad en ' + esc(f.nombre) + '" disabled><span>' + u + '</span></span></div>'
  );
}
function abrirEnlazar(c) {
  const x = enlObj(c);
  if (!x) return;
  if (!puede(2)) return toast('Solo un encargado puede cambiar las fichas.');
  enl = c;
  const u = udCant(c.tipo === 'b' ? x.unidadBase : x.unidad),
    l = fichasDestino(c),
    pl = l.filter((f) => !f.base),
    el = l.filter((f) => f.base),
    ya = S.platos.filter((f) => f.id !== c.id && lineaDe(f, c)),
    bloque = (t, arr, base) =>
      arr.length
        ? '<div class="enl-b"><h4>' + t + '</h4>' +
          grupoEnl(arr, base).map(([g, fs]) => '<div class="enl-g"><span class="lbl">' + esc(g) + '</span>' + fs.map((f) => filaEnl(f, u)).join('') + '</div>').join('') +
          '</div>'
        : '';
  capa(
    capaTop('Añadir a fichas', x.nombre + ' · marca los platos y elaboraciones que lo llevan y pon cuánto lleva cada uno') +
      '<form id="form-enl" class="editor enl" novalidate>' +
      (ya.length ? '<p class="hint wide">Ya está en: ' + esc(ya.slice(0, 8).map((f) => f.nombre).join(', ') + (ya.length > 8 ? '…' : '')) + '</p>' : '') +
      '<div class="field"><label for="enl-q">Buscar</label><input id="enl-q" type="search" autocomplete="off" placeholder="Pizza, salsa, masa…"></div>' +
      '<div class="field"><label for="enl-t">Igual en todas (' + u + ')</label><div class="precio"><input class="num" id="enl-t" type="text" inputmode="decimal" placeholder="' + (u === 'ud' ? '1' : '30') + '"><button class="btn small" type="button" data-act="enl-todas">Poner</button></div></div>' +
      '<div class="field"><label for="enl-m">Merma %</label><input class="num" id="enl-m" type="text" inputmode="decimal" placeholder="0"></div>' +
      '<p class="hint wide">La cantidad es la que lleva <b>una ración</b> del plato (o la receta entera de la elaboración), ya limpia. La merma se suma sola al coste y a las compras.</p>' +
      '<div class="enl-lista wide" id="enl-lista">' +
      (l.length ? bloque('Platos de la carta', pl, false) + bloque('Elaboraciones', el, true) : '<p class="hint">No quedan fichas de tu zona donde añadirlo.</p>') +
      '<p class="hint" id="enl-vacio" hidden>Ninguna ficha con ese nombre.</p></div>' +
      '<p class="hint wide" id="enl-res" aria-live="polite"></p>' +
      '<div class="acciones wide"><button class="btn primary" type="submit" id="enl-ok" disabled>Añadir</button><button class="btn" type="button" data-capa="cerrar">Cancelar</button></div></form>',
  );
  enlPintar();
  const q = $('enl-q');
  if (q) q.focus({ preventScroll: true });
}
function enlSel() {
  return [...document.querySelectorAll('#enl-lista .enl-f')]
    .filter((r) => r.querySelector('[data-enl="ok"]').checked)
    .map((r) => ({ f: plato(r.dataset.f), cant: parse(r.querySelector('[data-enl="cant"]').value), r: r }));
}
function enlPintar() {
  const s = enlSel(),
    sinC = s.filter((y) => !(y.cant > 0)).length,
    b = $('enl-ok'),
    res = $('enl-res');
  if (!b) return;
  b.disabled = !s.length || sinC > 0;
  b.textContent = s.length ? 'Añadir a ' + s.length + (s.length === 1 ? ' ficha' : ' fichas') : 'Añadir';
  document.querySelectorAll('#enl-lista .enl-f').forEach((r) => {
    const on = r.querySelector('[data-enl="ok"]').checked;
    r.classList.toggle('on', on);
    r.querySelector('[data-enl="cant"]').disabled = !on;
  });
  if (!res) return;
  if (!s.length) res.textContent = 'Marca una o varias fichas.';
  else if (sinC) res.textContent = sinC === 1 ? 'Falta la cantidad de 1 ficha.' : 'Falta la cantidad de ' + sinC + ' fichas.';
  else {
    const x = enlObj(enl),
      m = Math.min(Math.max(parse($('enl-m').value) || 0, 0), 95),
      pr = enl.tipo === 'b' ? r3(costeUd(x)) : x.precio,
      ud = enl.tipo === 'b' ? x.unidadBase : x.unidad,
      ct = suma(s, (y) => coste({ cantidad: y.cant, merma: m, precio: pr, unidad: ud }));
    res.textContent = ct > 0 ? 'Suma ' + fEur.format(ct) + ' al coste de esas fichas, en total.' : '';
  }
}
function enlFiltrar() {
  const q = norm(($('enl-q') || {}).value || '');
  let n = 0;
  document.querySelectorAll('#enl-lista .enl-f').forEach((r) => {
    const v = !q || r.dataset.n.indexOf(q) >= 0 || r.querySelector('[data-enl="ok"]').checked;
    r.hidden = !v;
    if (v) n++;
  });
  document.querySelectorAll('#enl-lista .enl-g').forEach((g) => (g.hidden = ![...g.querySelectorAll('.enl-f')].some((r) => !r.hidden)));
  document.querySelectorAll('#enl-lista .enl-b').forEach((g) => (g.hidden = ![...g.querySelectorAll('.enl-f')].some((r) => !r.hidden)));
  const v = $('enl-vacio');
  if (v) v.hidden = n > 0 || !document.querySelector('#enl-lista .enl-f');
}
function aplicarEnlazar() {
  const x = enlObj(enl),
    s = enlSel().filter((y) => y.f && y.cant > 0);
  if (!x || !s.length) return;
  const m = Math.min(Math.max(parse($('enl-m').value) || 0, 0), 95),
    esB = enl.tipo === 'b';
  enLote(() =>
    s.forEach(({ f, cant }) => {
      if (!puedeArea(f) || lineaDe(f, enl)) return;
      const i = nPlato({ ingredientes: [{}] }).ingredientes[0];
      i.nombre = x.nombre;
      i.productoId = esB ? '' : x.id;
      i.baseId = esB ? x.id : '';
      i.precio = esB ? r3(costeUd(x)) : x.precio;
      i.unidad = esB ? x.unidadBase : x.unidad;
      i.cantidad = r3(cant);
      i.merma = m;
      f.ingredientes.push(i);
      guardar('platos', f, true);
    }),
  );
  sucio();
  cerrarCapa();
  const n = platosDe(x.id, esB).size;
  toast(x.nombre + ': añadido a ' + s.length + (s.length === 1 ? ' ficha' : ' fichas') + '. Ahora llega a ' + n + (n === 1 ? ' plato' : ' platos') + '.');
  enl = null;
  pintarListas();
  pintar();
}
/* Aviso rojo de Productos: cada cosa sin enlazar es un botón que abre «Añadir a fichas» */
function sinEnlaceBotones(l, todos) {
  const max = todos ? 1e4 : 24;
  return (
    '<div class="enl-chips">' +
    l
      .slice(0, max)
      .map((y) => '<button class="chip" type="button" data-act="enl-abrir" data-tipo="' + (y.base ? 'b' : 'p') + '" data-id="' + esc(y.x.id) + '">' + esc(y.x.nombre) + ' <b aria-hidden="true">+</b></button>')
      .join('') +
    (l.length > max ? '<button class="link" type="button" data-act="ver-sinenlace">y ' + (l.length - max) + ' más</button>' : '') +
    '</div>'
  );
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="enl-abrir"]');
  if (b) {
    e.preventDefault();
    e.stopPropagation();
    abrirEnlazar({ tipo: b.dataset.tipo === 'b' ? 'b' : 'p', id: b.dataset.id });
    return;
  }
  if (e.target.closest('[data-act="enl-todas"]')) {
    const v = parse($('enl-t').value);
    if (!(v > 0)) return toast('Escribe primero la cantidad.');
    enlSel().forEach((y) => (y.r.querySelector('[data-enl="cant"]').value = show(v)));
    enlPintar();
  }
}, true);
$('capa').addEventListener('input', (e) => {
  if (!enl || !e.target.closest('#form-enl')) return;
  if (e.target.id === 'enl-q') enlFiltrar();
  else enlPintar();
});
$('capa').addEventListener('change', (e) => {
  if (!enl || !e.target.closest('#form-enl')) return;
  if (e.target.dataset.enl === 'ok') {
    const r = e.target.closest('.enl-f'),
      c = r.querySelector('[data-enl="cant"]'),
      t = parse($('enl-t').value);
    if (e.target.checked && !c.value && t > 0) c.value = show(t);
    enlPintar();
    if (e.target.checked && !c.value) c.focus({ preventScroll: true });
  } else enlPintar();
});
$('capa').addEventListener('submit', (e) => {
  if (!e.target.closest('#form-enl')) return;
  e.preventDefault();
  if (enl) aplicarEnlazar();
});
