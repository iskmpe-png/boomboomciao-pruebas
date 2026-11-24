/* ---- Historial y avisos de precio ---- */
function finEdicion() {
  if (!edIni) return;
  const p = prod(edIni.id),
    e = edIni;
  edIni = null;
  if (!p || p.precio === e.precio || !(e.precio > 0)) return;
  p.historial.push({ f: e.fecha || '', p: e.precio });
  if (p.historial.length > 12) p.historial = p.historial.slice(-12);
  p.anterior = e.precio;
  guardar('productos', p, true);
  const pct = ((p.precio - e.precio) / e.precio) * 100,
    af = S.platos.filter((pl) => !pl.base && usaProd(pl, p.id)),
    fuera = af.filter((pl) => {
      const fc = fcGen(pl);
      return fc != null && fc > (pl.objetivo || 30);
    });
  toast(
    p.nombre +
      ' ' +
      (pct > 0 ? '+' : '') +
      fNum(pct) +
      ' %: afecta a ' +
      af.length +
      (af.length === 1 ? ' plato' : ' platos') +
      (fuera.length ? ', ' + fuera.length + ' fuera de objetivo' : ''),
  );
}
function alertas() {
  const t0 = Date.now() - 90 * 864e5;
  return S.productos
    .filter((p) => p.anterior > 0 && p.precio !== p.anterior && p.actualizado && new Date(p.actualizado).getTime() > t0)
    .sort((a, z) => z.actualizado.localeCompare(a.actualizado));
}
function spark(p) {
  const pts = p.historial.map((h) => h.p).concat([p.precio]);
  if (pts.length < 2) return '';
  const mn = Math.min.apply(null, pts),
    mx = Math.max.apply(null, pts),
    w = 120,
    h = 28;
  const d = pts
    .map(
      (v, i) =>
        (i ? 'L' : 'M') +
        ((i / (pts.length - 1)) * w).toFixed(1) +
        ' ' +
        (mx === mn ? h / 2 : h - 3 - ((v - mn) / (mx - mn)) * (h - 6)).toFixed(1),
    )
    .join(' ');
  return (
    '<svg viewBox="0 0 ' +
    w +
    ' ' +
    h +
    '" width="' +
    w +
    '" height="' +
    h +
    '" role="img" aria-label="Evolución del precio" style="color:var(--accent);flex:none"><path d="' +
    d +
    '" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
  );
}
function enlaceDetalle(p) {
  if (p.general) return '';
  const ids = [...platosDe(p.id)],
    el = elabsCon(p.id);
  const btn = '<button class="btn small" type="button" data-act="enl-abrir" data-tipo="p" data-id="' + esc(p.id) + '">Añadir a fichas</button>';
  if (!ids.length)
    return '<div class="aviso wide enl-av"><p>No está en ningún plato de la carta. Añádelo aquí mismo a uno o varios platos o elaboraciones, o márcalo como uso general. Si no, no se puede calcular cuánto se gasta.</p>' + btn + '</div>';
  return (
    '<div class="acciones wide enl-av">' + btn + '</div><p class="hint wide">Llega a ' + ids.length + (ids.length === 1 ? ' plato: ' : ' platos: ') +
    esc(ids.slice(0, 6).map((id) => (plato(id) || {}).nombre).filter(Boolean).join(', ') + (ids.length > 6 ? '…' : '')) +
    (el.length ? '. Directamente en ' + el.length + (el.length === 1 ? ' elaboración: ' : ' elaboraciones: ') + esc(el.slice(0, 4).map((b) => b.nombre).join(', ')) : '') + '.</p>'
  );
}
function filaProd(p) {
  if (p.id === editProd) {
    const n = usos(p.id),
      alt = alternativas(p)[0];
    return (
      '<div class="editor pe" data-area="' + areaDe(p) + '" data-id="' +
      esc(p.id) +
      '">' +
      '<div class="field"><label for="ep-n">Producto</label><input id="ep-n" data-c="nombre" type="text" autocomplete="off" value="' +
      esc(p.nombre) +
      '"></div>' +
      '<div class="field"><label for="ep-p">Proveedor</label><input id="ep-p" data-c="proveedor" type="text" list="dl-proveedores" autocomplete="off" value="' +
      esc(p.proveedor) +
      '"></div>' +
      '<div class="field"><label for="ep-e">Precio</label><div class="precio"><input class="num" id="ep-e" data-c="precio" type="text" inputmode="decimal" value="' +
      esc(show(p.precio)) +
      '"><select data-c="unidad" aria-label="Unidad">' +
      ['kg', 'l', 'ud']
        .map((x) => '<option value="' + x + '"' + (x === p.unidad ? ' selected' : '') + '>' + UDP[x] + '</option>')
        .join('') +
      '</select></div></div>' +
      '<div class="field"><label for="ep-m">Stock mínimo (' +
      UDI[p.unidad] +
      ')</label><input class="num" id="ep-m" data-c="minimo" type="text" inputmode="decimal" placeholder="0" value="' +
      esc(show(p.minimo)) +
      '"></div>' +
      '<div class="field"><label for="ep-z">Zona</label><select id="ep-z" data-c="area"><option value="">Cocina</option><option value="barra"' + (p.area === 'barra' ? ' selected' : '') + '>Barra</option></select></div>' +
      '<div class="field"><label for="ep-f">Grupo para comparar</label><input id="ep-f" data-c="familia" type="text" autocomplete="off" placeholder="' + esc(claveIA(p) || famAuto(p.nombre)) + '" value="' + esc(p.familia) + '"></div>' +
      '<div class="acciones"><button class="btn primary small" type="button" data-act="cerrar-prod">Listo</button><button class="btn small" type="button" data-act="conv-ud" data-id="' + esc(p.id) + '">Cambiar unidad</button><button class="link" type="button" data-act="borrar-prod" style="color:var(--crit)">Eliminar</button></div>' +
      '<div class="full col" style="gap:8px"><span class="lbl">Alérgenos</span><div class="togs">' +
      algBtns(p.alergenos, 'alg-prod') +
      '</div>' +
      (p.historial.length
        ? '<div class="acciones">' +
          spark(p) +
          '<span class="hint">Antes: ' +
          p.historial
            .slice(-3)
            .reverse()
            .map((h) => fEur.format(h.p) + (h.f ? ' (' + fFecha(h.f) + ')' : ''))
            .join(' · ') +
          '</span></div>'
        : '') +
      '<label class="check wide"><input type="checkbox" data-c="general"' + (p.general ? ' checked' : '') + '> Uso general de la cocina: no va en ningún plato (aceite de freidora, gas del soplete, film…)</label>' +
      enlaceDetalle(p) +
      '<span class="hint">' +
      (n === 1 ? 'Se usa en 1 ficha' : 'Se usa en ' + n + ' fichas') +
      (alt && alt.precio < p.precio
        ? ' · más barato en ' + esc(alt.proveedor || alt.nombre) + ': ' + fEur.format(alt.precio)
        : '') +
      '</span></div></div>'
    );
  }
  return (
    '<button class="row" type="button" data-act="editar-prod" data-id="' +
    esc(p.id) +
    '"><span class="n"><b>' +
    esc(p.nombre) +
    '</b><span>' +
    esc(metaProd(p)) +
    '</span>' + enlaceHTML(p) + '</span><span class="d"><b>' +
    fEur.format(p.precio) +
    '</b><span class="hint">' +
    UDP[p.unidad].slice(1) +
    '</span></span></button>'
  );
}
function vAlertas() {
  if (puede(2)) agruparSiToca();
  const l = alertas();
  $('vista').innerHTML =
    '<div class="bar"><span class="hint grow">Cambios de precio de los últimos 90 días y los platos a los que afectan.</span>' +
    expHTML() +
    '</div>' +
    (l.length
      ? l
          .map((p) => {
            const pct = ((p.precio - p.anterior) / p.anterior) * 100,
              af = S.platos.filter((pl) => !pl.base && usaProd(pl, p.id));
            return (
              '<section class="card" data-id="' +
              esc(p.id) +
              '"><div class="row" style="padding:0;border:0"><div class="n"><b>' +
              esc(p.nombre) +
              '</b><span>' +
              esc(
                (p.proveedor || 'Sin proveedor') +
                  ' · ' +
                  fEur.format(p.anterior) +
                  ' → ' +
                  fEur.format(p.precio) +
                  ' · ' +
                  fFecha(p.actualizado),
              ) +
              '</span></div><div class="d"><span class="pill ' +
              (pct > 0 ? 'crit' : 'ok') +
              '">' +
              (pct > 0 ? '+' : '') +
              fNum(pct) +
              ' %</span><button class="link" type="button" data-act="visto-alerta">Visto</button></div></div>' +
              /* Saltos así casi siempre son un error de lectura o de formato, no una subida real */
              (pct > 80 || pct < -45
                ? '<p class="hint" style="color:var(--warn)">Revisa este precio: un cambio tan grande suele ser un error de lectura del albarán o de formato (por unidad en vez de por kg o L).' +
                  (p.unidad === 'ud' ? ' Este producto va por unidades: pásalo a kg o L para que el precio sea comparable.' : '') + '</p>'
                : '') +
              (af.length
                ? '<div class="rows">' +
                  af
                    .map(
                      (pl) =>
                        '<button class="row" type="button" data-act="abrir" data-id="' +
                        esc(pl.id) +
                        '"><span class="n"><b>' +
                        esc(pl.nombre) +
                        '</b><span>coste ' +
                        fEur.format(costeUd(pl)) +
                        '</span></span><span class="d">' +
                        pillFC(pl) +
                        '</span></button>',
                    )
                    .join('') +
                  '</div>'
                : '<p class="hint">No afecta a ningún plato de la carta.</p>') +
              '</section>'
            );
          })
          .join('')
      : vacio(
          'Sin cambios de precio',
          'Cuando cambies un precio en Productos, aquí verás cuánto subió o bajó y qué platos se ven afectados.',
          '',
        ));
}
