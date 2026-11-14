/* ---- Recetas: escalar y modo cocina ---- */
const rindeF = (p) =>
  fNum(p.raciones * factor, 2) + ' ' + (p.base ? UDI[p.unidadBase] : p.raciones * factor === 1 ? 'ración' : 'raciones');
const listaRecetaHTML = (p) => {
  const ings = p.ingredientes.filter((i) => nom(i));
  return ings.length
    ? '<ul class="ri">' +
        ings.map((i) => '<li><span>' + esc(nom(i)) + '</span><b>' + cantTxt(i) + '</b></li>').join('') +
        '</ul>'
    : '<p class="hint">Este plato todavía no tiene ingredientes.</p>';
};
let cocK = 0,
  cocPasos = [],
  cocLock = null;
function pintarCocina() {
  const p = plato(recetaId),
    o = $('cocina');
  if (!p) {
    o.hidden = true;
    return;
  }
  const n = cocPasos.length;
  o.innerHTML =
    '<div class="coc-top"><div><span class="lbl">' +
    (cocK === 0 ? 'Ingredientes · rinde ' + rindeF(p) : 'Paso ' + cocK + ' de ' + n) +
    '</span><h2>' +
    esc(p.nombre) +
    '</h2></div><button class="btn" type="button" data-coc="cerrar">Cerrar</button></div>' +
    '<div class="coc-body">' +
    (cocK === 0
      ? '<ul class="ri coc-ing">' +
        p.ingredientes
          .filter((i) => nom(i))
          .map((i) => '<li><span>' + esc(nom(i)) + '</span><b>' + cantTxt(i) + '</b></li>')
          .join('') +
        '</ul>'
      : '<p class="coc-paso">' + esc(cocPasos[cocK - 1]) + '</p>') +
    '</div>' +
    '<div class="coc-nav"><button class="btn" type="button" data-coc="ant"' +
    (cocK === 0 ? ' disabled' : '') +
    '>Anterior</button><button class="btn primary" type="button" data-coc="sig"' +
    (cocK >= n ? ' disabled' : '') +
    '>' +
    (cocK === 0 && n ? 'Empezar' : 'Siguiente') +
    '</button></div>';
  o.hidden = false;
}
function abrirCocina() {
  const p = plato(recetaId);
  if (!p) return;
  cocK = 0;
  cocPasos = p.elaboracion
    .split('\n')
    .map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);
  pintarCocina();
  try {
    if (navigator.wakeLock)
      navigator.wakeLock.request('screen').then(
        (l) => {
          cocLock = l;
        },
        () => {},
      );
  } catch (e) {}
}
$('cocina').addEventListener('click', (e) => {
  const b = e.target.closest('[data-coc]');
  if (!b) return;
  const a = b.dataset.coc;
  if (a === 'cerrar') {
    $('cocina').hidden = true;
    try {
      if (cocLock) {
        cocLock.release();
        cocLock = null;
      }
    } catch (er) {}
    return;
  }
  cocK = Math.max(0, Math.min(cocPasos.length, cocK + (a === 'sig' ? 1 : -1)));
  pintarCocina();
});
