/* ---- Ficha: alérgenos y simulador ---- */
function calcSim() {
  const p = plato(),
    o = $('sim-out');
  if (!p || !o) return;
  const sube = parse(($('sim-sube') || {}).value || 0),
    c = costeUd(p) * (1 + sube / 100),
    iva = 1 + (p.iva || 0) / 100;
  if (p.base)
    o.textContent = sube
      ? 'Con esa subida costaría ' + fEur.format(c) + ' por ' + UDI[p.unidadBase] + '.'
      : 'Escribe una subida de costes para probar.';
  else {
    const pv = parse(($('sim-pvp') || {}).value || 0) || p.pvp;
    o.textContent =
      pv > 0 && c > 0
        ? 'A ' +
          fEur.format(pv) +
          ' y con coste ' +
          fEur.format(c) +
          ': food cost ' +
          fNum((c / (pv / iva)) * 100) +
          ' % y margen ' +
          fEur.format(pv / iva - c) +
          ' por ración. Es solo una prueba: la ficha no cambia.'
        : 'Escribe un precio para probar.';
  }
  let tot = 0;
  const l = [],
    rac = p.raciones > 0 ? p.raciones : 1;
  p.ingredientes.forEach((i) => {
    const pr = prod(i.productoId);
    if (!pr) return;
    const a = alternativas(pr)[0];
    if (a && a.precio < pr.precio) {
      const ah = (coste(i) * (1 - a.precio / pr.precio)) / rac;
      tot += ah;
      l.push(
        '<li><span>' +
          esc(pr.nombre) +
          ' → ' +
          esc(a.proveedor || a.nombre) +
          '</span><b>−' +
          fEur.format(ah) +
          '</b></li>',
      );
    }
  });
  $('sim-alt').innerHTML = l.length
    ? '<span class="lbl">Comprando al proveedor más barato</span><ul class="ri" style="grid-template-columns:minmax(0,1fr)">' +
      l.join('') +
      '</ul><p class="hint">Ahorro: ' +
      fEur.format(tot) +
      ' por ' +
      (p.base ? UDI[p.unidadBase] : 'ración') +
      '.</p>'
    : '';
}
function calcExtra() {
  const p = plato(),
    o = $('f-alg');
  if (p && o) o.innerHTML = '<div class="togs">' + algChips(algDe(p)) + '</div>';
  calcSim();
}
const extraFicha = (p) =>
  '<section class="card"><h3>Alérgenos</h3><div id="f-alg"></div><details><summary>Añadir a mano</summary><div class="togs">' +
  algBtns(p.alergenos, 'alg-plato') +
  '</div></details></section>' +
  '<section class="card"><details style="border:0;padding:0"><summary>Simulador</summary><div class="col"><div class="ficha" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
  (p.base
    ? ''
    : '<div class="field"><label for="sim-pvp">Precio de prueba €</label><input class="num" id="sim-pvp" type="text" inputmode="decimal" placeholder="' +
      esc(show(p.pvp)) +
      '"></div>') +
  '<div class="field"><label for="sim-sube">Subida de costes %</label><input class="num" id="sim-sube" type="text" inputmode="decimal" placeholder="0"></div></div><p class="hint" id="sim-out"></p><div id="sim-alt"></div></div></details>' +
  (p.base
    ? ''
    : '<details><summary>Ficha para sala</summary><div class="col"><div class="field"><label for="p-desc">Cómo explicarlo en mesa</label><textarea id="p-desc" data-p="descripcion" rows="3" placeholder="Qué lleva y cómo se describe al cliente">' +
      esc(p.descripcion) +
      '</textarea></div><div class="field"><label for="p-vino">Vino o bebida sugerida</label><input id="p-vino" data-p="vino" type="text" autocomplete="off" value="' +
      esc(p.vino) +
      '"></div></div></details>') +
  '</section>';
