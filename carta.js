/* ---- Carta: lista de platos ---- */
function filtradosCarta() {
  const f = norm(fil.carta);
  const l = ordenados(S.platos).filter((p) => (!grp || grupoDe(p) === grp) && (!f || norm(p.nombre).indexOf(f) >= 0));
  return l.filter((p) => !p.base).concat(l.filter((p) => p.base));
}
function vCarta() {
  if (abierta && plato()) {
    vFicha();
    return;
  }
  abierta = false;
  if (!S.platos.length) {
    $('vista').innerHTML = vacio(
      'Aún no hay ningún plato',
      'Crea el primero: añade sus ingredientes y verás el coste por ración y el precio de venta recomendado.',
      '<button class="btn primary" type="button" data-act="nuevo-plato">Crear plato</button>',
    );
    return;
  }
  const gs = {};
  S.platos.forEach((p) => {
    gs[grupoDe(p)] = 1;
  });
  const ks = Object.keys(gs).sort((a, z) => (a === G_BASE) - (z === G_BASE) || a.localeCompare(z, 'es'));
  $('vista').innerHTML =
    '<div class="bar"><div class="field"><label for="b-carta">Buscar plato</label><input id="b-carta" type="search" data-buscar="carta" autocomplete="off" value="' +
    esc(fil.carta) +
    '"></div>' +
    '<div class="field corto"><label for="f-grupo">Carta o menú</label><select id="f-grupo"><option value="">Todo</option>' +
    ks.map((n) => '<option' + (n === grp ? ' selected' : '') + '>' + esc(n) + '</option>').join('') +
    '</select></div>' +
    '<button class="btn primary" type="button" data-act="nuevo-plato">Nuevo</button>' +
    expHTML(1) +
    '</div>' +
    '<div class="kpis" id="kpis"></div><section class="card"><div class="rows" id="lista-carta"></div></section>';
  listaCarta();
}
function listaCarta() {
  const l = filtradosCarta(),
    pl = l.filter((p) => !p.base),
    fcs = pl.map(fcDe).filter((x) => x != null);
  const fuera = pl.filter((p) => {
    const fc = fcDe(p);
    return fc != null && fc > (p.objetivo > 0 ? p.objetivo : 30);
  }).length;
  $('kpis').innerHTML =
    '<div class="kpi"><span class="lbl">Fichas</span><b>' +
    l.length +
    '</b></div><div class="kpi"><span class="lbl">Food cost medio</span><b>' +
    (fcs.length ? fNum(fcs.reduce((a, b) => a + b, 0) / fcs.length) + ' %' : '—') +
    '</b></div><div class="kpi"><span class="lbl">Fuera de objetivo</span><b>' +
    fuera +
    '</b></div>';
  $('lista-carta').innerHTML = l.length
    ? l
        .slice(0, lim.carta)
        .map((p) => {
          const c = costeUd(p);
          return (
            '<button class="row" type="button" data-act="abrir" data-id="' +
            esc(p.id) +
            '"><span class="n"><b>' +
            esc(p.nombre || 'Sin nombre') +
            '</b><span>' +
            esc(grupoDe(p)) +
            (p.base ? ' · rinde ' + rinde(p) : p.pvp > 0 ? ' · carta ' + fEur.format(p.pvp) : '') +
            '</span></span>' +
            '<span class="d"><b>' +
            fEur.format(c) +
            (p.base ? '/' + UDI[p.unidadBase] : '') +
            '</b>' +
            pillFC(p) +
            '</span></button>'
          );
        })
        .join('') + masHTML('carta', l.length)
    : '<p class="hint" style="padding:10px 0">Ningún plato coincide con la búsqueda.</p>';
}
