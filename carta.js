/* ---- Carta: lista de platos ---- */
function filtradosCarta() {
  const f = norm(fil.carta);
  const elab = enElab();
  return ordenados(S.platos).filter((p) => !!p.base === elab && (elab || !grp || grupoDe(p) === grp) && (!f || norm(p.nombre).indexOf(f) >= 0));
}
function vCarta() {
  if (escImp) {
    vEscImp();
    return;
  }
  if (abierta && plato()) {
    vFicha();
    return;
  }
  abierta = false;
  const elab = enElab();
  if (!S.platos.some((p) => !!p.base === elab)) {
    $('vista').innerHTML = elab
      ? vacio(
          'Aún no hay elaboraciones de la casa',
          'Aquí va lo que producís vosotros para usarlo en otros escandallos: una mayonesa de limón, una masa, un fondo. Calcula lo que cuesta el kilo, el litro o la unidad, y después lo eliges como un ingrediente más en cualquier ficha. No aparece en la carta ni en la ingeniería de menú.',
          '<div class="acciones" style="justify-content:center"><button class="btn primary" type="button" data-act="nuevo-plato">Crear elaboración</button><button class="btn" type="button" data-act="ei-importar">Importar escandallos</button></div>',
        )
      : vacio(
          'Aún no hay ningún plato',
          'Crea el primero: añade sus ingredientes y verás el coste por ración y el precio de venta recomendado.',
          '<div class="acciones" style="justify-content:center"><button class="btn primary" type="button" data-act="nuevo-plato">Crear plato</button><button class="btn" type="button" data-act="ei-importar">Importar escandallos</button></div>',
        );
    return;
  }
  const gs = {};
  S.platos.forEach((p) => {
    if (!p.base) gs[grupoDe(p)] = 1;
  });
  const ks = Object.keys(gs).sort((a, z) => (a === G_BASE) - (z === G_BASE) || a.localeCompare(z, 'es'));
  $('vista').innerHTML =
    '<div class="bar"><div class="field"><label for="b-carta">' + (elab ? 'Buscar elaboración' : 'Buscar plato') + '</label><input id="b-carta" type="search" data-buscar="carta" autocomplete="off" value="' +
    esc(fil.carta) +
    '"></div>' +
    (elab
      ? ''
      : '<div class="field corto"><label for="f-grupo">Carta o menú</label><select id="f-grupo"><option value="">Todo</option>' +
        ks.map((n) => '<option' + (n === grp ? ' selected' : '') + '>' + esc(n) + '</option>').join('') +
        '</select></div>') +
    (selModo === 'carta'
      ? ''
      : '<button class="btn" type="button" data-act="sel-ini" data-m="carta">Seleccionar</button>' +
        '<button class="btn" type="button" data-act="ei-importar">Importar escandallos</button>' +
        '<button class="btn primary" type="button" data-act="nuevo-plato">' + (elab ? 'Nueva' : 'Nuevo') + '</button>') +
    expHTML(1) +
    '</div>' +
    (selModo === 'carta' ? selBarHTML() : '') +
    (elab ? '<p class="hint">Lo que producís en casa. Cada elaboración se puede elegir como ingrediente en cualquier escandallo y aparece también en Precios con su coste.</p>' : '') +
    '<div class="kpis" id="kpis"></div><section class="card"><div class="rows" id="lista-carta"></div></section>';
  listaCarta();
}
function listaCarta() {
  const l = filtradosCarta(),
    pl = l.filter((p) => !p.base),
    todo = !enElab() && !grp && !norm(fil.carta),
    /* Con la carta entera a la vista, los menús cuentan como un plato más en la media */
    fcs = pl.map(fcGen).filter((x) => x != null).concat(todo ? fcMenus() : []);
  const fuera = pl.filter((p) => {
    const fc = fcGen(p);
    return fc != null && fc > (p.objetivo > 0 ? p.objetivo : 30);
  }).length;
  $('kpis').hidden = enElab();
  $('kpis').innerHTML =
    '<div class="kpi"><span class="lbl">Fichas</span><b>' +
    l.length +
    '</b></div><div class="kpi"><span class="lbl">Food cost medio</span><b>' +
    (fcs.length ? fNum(fcs.reduce((a, b) => a + b, 0) / fcs.length) + ' %' : '—') +
    '</b></div><div class="kpi"><span class="lbl">Fuera de objetivo</span><b>' +
    fuera +
    '</b></div>';
  selCuenta();
  $('lista-carta').innerHTML = l.length
    ? l
        .slice(0, lim.carta)
        .map((p) => {
          const c = costeUd(p);
          return (
            (selModo === 'carta'
              ? '<button class="row selrow" type="button" data-act="sel" data-id="' + esc(p.id) + '" aria-pressed="' + selIds.has(p.id) + '"><span class="n"><b>' + selCaja()
              : '<button class="row" type="button" data-act="abrir" data-id="' + esc(p.id) + '"><span class="n"><b>') +
            esc(p.nombre || 'Sin nombre') +
            '</b><span>' +
            (p.base ? 'Rinde ' + rinde(p) + (usosBase(p.id) ? ' · en ' + usosBase(p.id) + (usosBase(p.id) === 1 ? ' ficha' : ' fichas') : '') : esc(grupoDe(p)) + (p.pvp > 0 ? ' · carta ' + fEur.format(p.pvp) : '')) +
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
    : '<p class="hint" style="padding:10px 0">' + (enElab() ? 'Ninguna elaboración coincide con la búsqueda.' : 'Ningún plato coincide con la búsqueda.') + '</p>';
}
