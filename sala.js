/* ---- Sala y alérgenos ---- */
function listaSala() {
  const f = norm(fil.sala),
    l = ordenados(S.platos).filter((p) => !p.base && (!f || norm(p.nombre).indexOf(f) >= 0));
  $('lista-sala').innerHTML = l.length
    ? l
        .slice(0, lim.sala)
        .map(
          (p) =>
            '<button class="row" type="button" data-act="abrir" data-id="' +
            esc(p.id) +
            '" style="grid-template-columns:minmax(0,1fr)"><span class="n"><b>' +
            esc(p.nombre) +
            (p.pvp > 0 ? ' · ' + fEur.format(p.pvp) : '') +
            '</b><span>' +
            esc(p.descripcion || 'Sin descripción para sala') +
            (p.vino ? ' · Con ' + esc(p.vino) : '') +
            '</span></span><span class="togs">' +
            algChips(algDe(p)) +
            '</span></button>',
        )
        .join('') + masHTML('sala', l.length)
    : '<p class="hint" style="padding:10px 0">Ningún plato coincide.</p>';
}
function vSala() {
  $('vista').innerHTML =
    '<div class="bar"><div class="field"><label for="b-sala">Buscar plato</label><input id="b-sala" type="search" data-buscar="sala" autocomplete="off" value="' +
    esc(fil.sala) +
    '"></div>' +
    expHTML() +
    '</div>' +
    '<p class="aviso">Los alérgenos salen de lo marcado en cada producto de Precios. Compruébalos con la etiqueta del proveedor antes de informar a un cliente.</p><section class="card"><div class="rows" id="lista-sala"></div></section>';
  listaSala();
}
