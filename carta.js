/* ---- Carta: lista de platos ---- */
function filtradosCarta() {
  const f = norm(fil.carta);
  const elab = enElab(),
    oc = elab ? null : ocultosEnMenu(),
    l = ordenados(S.platos).filter(
      (p) => !!p.base === elab && enArea(p) && (elab || !oc.has(p.id)) && (!grp || (elab ? grupoLista(p) : grupoDe(p)) === grp) && (!f || norm(p.nombre).indexOf(f) >= 0 || p.alias.some((a) => norm(a).indexOf(f) >= 0)),
    );
  if (grp === MENUS) return elab ? ordenaCarta(l) : [];
  if (grp) return ordenaCarta(l);
  /* Con todo a la vista, las fichas van juntas por grupo y lo que no tiene grupo al final */
  const gs = gruposLista(),
    pos = (p) => (p.grupo.trim() ? gs.indexOf(p.grupo.trim()) : 1e6);
  return ordenaCarta(l).sort((a, z) => pos(a) - pos(z));
}
/* Orden elegido dentro de cada grupo (sort es estable: se respeta al agrupar) */
function ordenaCarta(l) {
  if (ordCarta === 'fc') return l.sort((a, z) => (fcDe(z) == null ? -1 : fcDe(z)) - (fcDe(a) == null ? -1 : fcDe(a)));
  if (ordCarta === 'coste') return l.sort((a, z) => costeUd(z) - costeUd(a));
  return l.sort((a, z) => a.nombre.localeCompare(z.nombre, 'es'));
}
/* Menús que salen en la carta, con su precio por persona */
const MENUS = '__menus';
const menusCarta = () => {
  const f = norm(fil.carta);
  return ordenados(S.eventos.filter((e) => e.enCarta && (!f || norm(e.nombre).indexOf(f) >= 0 || e.platos.some((x) => { const p = plato(x.id); return p && norm(p.nombre).indexOf(f) >= 0; }))));
};
/* Platos que solo se venden dentro de un menú de la carta: salen debajo del menú, no sueltos */
function ocultosEnMenu() {
  const s = new Set();
  S.eventos.forEach((e) => {
    if (e.enCarta)
      e.platos.forEach((x) => {
        const p = plato(x.id);
        if (p && p.soloMenu) s.add(p.id);
      });
  });
  return s;
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
          '<div class="acciones" style="justify-content:center"><button class="btn primary" type="button" data-act="nuevo-plato">Crear elaboración</button><button class="btn" type="button" data-act="ei-texto">Receta con IA</button><button class="btn" type="button" data-act="ei-importar">Importar escandallos</button></div>',
        )
      : vacio(
          'Aún no hay ningún plato',
          'Crea el primero: añade sus ingredientes y verás el coste por ración y el precio de venta recomendado.',
          '<div class="acciones" style="justify-content:center"><button class="btn primary" type="button" data-act="nuevo-plato">Crear plato</button><button class="btn" type="button" data-act="ei-texto">Receta con IA</button><button class="btn" type="button" data-act="ei-importar">Importar escandallos</button></div>',
        );
    return;
  }
  const oc = ocultosEnMenu(),
    visibles = S.platos.filter((p) => !!p.base === elab && enArea(p) && (elab || !oc.has(p.id))),
    gd = (p) => (elab ? grupoLista(p) : grupoDe(p)),
    cuenta = (g) => visibles.filter((p) => gd(p) === g).length,
    /* En cada zona solo se ven sus grupos (y los que aún están vacíos) */
    ks = gruposLista().filter((g) => cuenta(g) || !S.platos.some((p) => !!p.base === elab && gd(p) === g)),
    sueltos = cuenta(SIN_GRUPO),
    nm = elab ? 0 : S.eventos.filter((e) => e.enCarta).length;
  if (grp && grp !== SIN_GRUPO && grp !== MENUS && ks.indexOf(grp) < 0) grp = '';
  if (grp === MENUS && !nm) grp = '';
  const chip = (g, t, n) => '<button class="chipg" type="button" data-act="grupo" data-g="' + esc(g) + '" aria-pressed="' + (g === grp) + '">' + esc(t) + (n == null ? '' : ' <small>' + n + '</small>') + '</button>';
  $('vista').innerHTML =
    '<div class="bar"><div class="field"><label for="b-carta">' + (elab ? 'Buscar elaboración' : 'Buscar plato') + '</label><input id="b-carta" type="search" data-buscar="carta" autocomplete="off" value="' +
    esc(fil.carta) +
    '"></div>' +
    (selModo === 'carta'
      ? ''
      : '<button class="btn primary" type="button" data-act="nuevo-plato">' + (elab ? 'Nueva' : 'Nuevo') + '</button>' +
        expHTML(
          1,
          mOp('sel-ini', 'Seleccionar varios', ' data-m="carta"') + mOp('ei-texto', 'Receta con IA (escribir o pegar)') + mOp('ei-importar', 'Importar escandallos (fotos, PDF, Excel)') + mOp('gr-editar', 'Editar grupos'),
        )) +
    '</div>' +
    '<div class="gruposc" id="gruposc">' + chip('', 'Todo', visibles.length + nm) + (nm ? chip(MENUS, 'Menús', nm) : '') + ks.map((g) => chip(g, g, cuenta(g))).join('') + (sueltos && ks.length ? chip(SIN_GRUPO, 'Sin grupo', sueltos) : '') +
    (ks.length ? '' : '<button class="link" type="button" data-act="gr-editar">' + (elab ? 'Crear grupos: salsas, masas, mayonesas, caldos…' : 'Crear grupos: pizzas, pastas, brunch…') + '</button>') + '</div>' +
    '<div class="ordenc"><label for="f-ord">Ordenar</label><select id="f-ord">' +
    [['', 'Por nombre'], ['fc', 'Food cost más alto'], ['coste', 'Coste más alto']].map((o) => '<option value="' + o[0] + '"' + (o[0] === ordCarta ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
    '</select></div>' +
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
  const mh = enElab() || selModo === 'carta' || (grp && grp !== MENUS) ? '' : menusHTML();
  $('lista-carta').innerHTML = l.length || mh
    ? mh + l
        .slice(0, lim.carta)
        .map((p, k, vis) => {
          const c = costeUd(p),
            gdl = enElab() ? grupoLista : grupoDe,
            cab = !grp && (gruposLista().length || mh) && (!k || gdl(vis[k - 1]) !== gdl(p));
          return (
            (cab ? '<h3 class="grupoh">' + esc(p.grupo.trim() || 'Sin grupo') + '</h3>' : '') +
            (selModo === 'carta'
              ? '<button class="row selrow" type="button" data-act="sel" data-id="' + esc(p.id) + '" aria-pressed="' + selIds.has(p.id) + '">' + miniFoto(p) + '<span class="n"><b>' + selCaja()
              : '<button class="row" type="button" data-act="abrir" data-id="' + esc(p.id) + '">' + miniFoto(p) + '<span class="n"><b>') +
            esc(p.nombre || 'Sin nombre') +
            '</b><span>' +
            (p.base ? 'Rinde ' + rinde(p) + (usosBase(p.id) ? ' · en ' + usosBase(p.id) + (usosBase(p.id) === 1 ? ' ficha' : ' fichas') : '') : esc(p.grupo.trim() || 'Sin grupo') + (p.pvp > 0 ? ' · carta ' + fEur.format(p.pvp) : '')) +
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
