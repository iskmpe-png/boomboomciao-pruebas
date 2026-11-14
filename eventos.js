/* ---- Eventos y menús cerrados ---- */
function explotar(p, f, acc, d) {
  const rac = p.raciones > 0 ? p.raciones : 1;
  p.ingredientes.forEach((i) => {
    const b = (bruto(i) * f) / rac,
      u = un(i),
      c = u === 'ud' ? b : b / 1000,
      pr = prod(i.productoId),
      bs = pr ? null : baseDe(i);
    if (bs && (d || 0) < 5) {
      explotar(bs, c, acc, (d || 0) + 1);
      return;
    }
    if (!nom(i) || (!pr && !(i.precio > 0))) return;
    const k = pr ? pr.id : 'x:' + norm(i.nombre),
      o = acc[k] || (acc[k] = { n: nom(i), prov: pr ? pr.proveedor : '', u: u, q: 0, c: 0 });
    o.q += c;
    o.c += c * pre(i);
  });
  return acc;
}
const evento = () => S.eventos.filter((e) => e.id === evId)[0] || null;
function compraEv(e) {
  const acc = {};
  e.platos.forEach((x) => {
    const p = idx().pl.get(x.id);
    if (p) explotar(p, x.n * (e.pax || 0), acc, 0);
  });
  return Object.keys(acc)
    .map((k) => acc[k])
    .sort((a, z) => (a.prov || 'zzz').localeCompare(z.prov || 'zzz', 'es') || a.n.localeCompare(z.n, 'es'));
}
const costeEv = (e) =>
  suma(e.platos, (x) => {
    const p = idx().pl.get(x.id);
    return p ? x.n * costeUd(p) : 0;
  });
function calcEv() {
  const e = evento();
  if (!e || !$('ev-out')) return;
  const c = costeEv(e),
    neto = e.precio / 1.1,
    l = compraEv(e);
  $('ev-out').innerHTML =
    '<b class="g">' +
    fEur.format(c) +
    '</b><span>por persona · total ' +
    fEur.format(c * (e.pax || 0)) +
    '</span>' +
    (e.precio > 0 && c > 0
      ? '<span class="pill ' +
        ((c / neto) * 100 <= 30 ? 'ok' : (c / neto) * 100 <= 35 ? 'warn' : 'crit') +
        '">Food cost ' +
        fNum((c / neto) * 100) +
        ' %</span>'
      : '') +
    (c > 0 ? '<span>recomendado ' + fEur.format((c / 0.3) * 1.1) + '</span>' : '');
  e.platos.forEach((x, k) => {
    const o = q($('ev-lineas'), '[data-k="' + k + '"] [data-out="c"]'),
      p = idx().pl.get(x.id);
    if (o && p) o.textContent = fEur.format(x.n * costeUd(p));
  });
  $('ev-compra').innerHTML = l.length
    ? '<ul class="ri">' +
      l
        .map(
          (o) =>
            '<li><span>' +
            esc(o.n) +
            (o.prov ? ' <span class="hint">' + esc(o.prov) + '</span>' : '') +
            '</span><b>' +
            fNum(o.q, 2) +
            ' ' +
            UDI[o.u] +
            '</b></li>',
        )
        .join('') +
      '</ul>'
    : '<p class="hint">Añade platos y comensales para ver la lista de la compra.</p>';
  const t = ['COMPRA · ' + (e.nombre || 'Evento') + ' · ' + (e.pax || 0) + ' personas', ''];
  let pv = null;
  l.forEach((o) => {
    if (o.prov !== pv) {
      pv = o.prov;
      t.push((pv || 'Sin proveedor').toUpperCase());
    }
    t.push('- ' + o.n + ': ' + fNum(o.q, 2) + ' ' + UDI[o.u]);
  });
  $('ev-wa').href = 'https://wa.me/?text=' + encodeURIComponent(t.join('\n'));
}
function vEventos() {
  const e = evento();
  if (!e) {
    evId = null;
    $('vista').innerHTML =
      '<div class="bar"><span class="hint grow">Calcula el coste por persona y la compra de un menú cerrado o un grupo.</span><button class="btn primary" type="button" data-act="ev-nuevo">Nuevo</button>' +
      expHTML() +
      '</div>' +
      (S.eventos.length
        ? '<section class="card"><div class="rows">' +
          ordenados(S.eventos)
            .map(
              (x) =>
                '<button class="row" type="button" data-act="ev-abrir" data-id="' +
                esc(x.id) +
                '"><span class="n"><b>' +
                esc(x.nombre || 'Evento sin nombre') +
                '</b><span>' +
                (x.pax || 0) +
                ' personas · ' +
                x.platos.length +
                ' platos</span></span><span class="d"><b>' +
                fEur.format(costeEv(x)) +
                '</b><span class="hint">por persona</span></span></button>',
            )
            .join('') +
          '</div></section>'
        : vacio(
            'Aún no hay eventos',
            'Crea uno, elige los platos y el número de comensales, y tendrás el coste por persona, el precio recomendado y la lista de la compra.',
            '',
          ));
    return;
  }
  $('vista').innerHTML =
    '<div class="bar"><button class="btn" type="button" data-act="ev-volver">← Eventos</button><div class="resumen" id="ev-out" aria-live="polite"></div>' +
    expHTML() +
    '</div>' +
    '<div class="dos"><div class="col"><section class="card"><div class="ficha"><div class="field wide"><label for="ev-nombre">Nombre</label><input id="ev-nombre" data-ev="nombre" type="text" autocomplete="off" placeholder="Ej. Cena de empresa" value="' +
    esc(e.nombre) +
    '"></div>' +
    '<div class="field"><label for="ev-pax">Comensales</label><input class="num" id="ev-pax" data-ev="pax" type="text" inputmode="numeric" value="' +
    esc(show(e.pax)) +
    '"></div><div class="field"><label for="ev-precio">Precio por persona €</label><input class="num" id="ev-precio" data-ev="precio" type="text" inputmode="decimal" placeholder="con IVA" value="' +
    esc(show(e.precio)) +
    '"></div></div></section>' +
    '<section class="card"><h3>Platos del menú</h3><div class="rows" id="ev-lineas">' +
    e.platos
      .map((x, k) => {
        const p = idx().pl.get(x.id);
        return (
          '<div class="row invrow" data-k="' +
          k +
          '"><div class="n"><b>' +
          esc(p ? p.nombre : 'Plato eliminado') +
          '</b><span>raciones por persona</span></div><div class="q"><input class="num" data-evn="' +
          k +
          '" type="text" inputmode="decimal" aria-label="Raciones por persona" value="' +
          esc(show(x.n)) +
          '"><button class="icon" type="button" data-act="ev-quitar" aria-label="Quitar plato" style="width:34px;height:34px">×</button></div><div class="v" data-out="c"></div></div>'
        );
      })
      .join('') +
    '</div>' +
    '<div class="acciones"><select id="ev-sel" aria-label="Plato para añadir" style="flex:1 1 180px">' +
    opcionesPlatos('') +
    '</select><button class="btn" type="button" data-act="ev-add">Añadir plato</button></div></section></div>' +
    '<div class="col"><section class="card"><h3>Lista de la compra</h3><div id="ev-compra"></div><div class="acciones"><a class="btn primary small" id="ev-wa" target="_blank" rel="noopener">Enviar por WhatsApp</a><button class="btn danger small" type="button" data-act="ev-borrar">Eliminar evento</button></div></section></div></div>';
  calcEv();
}
