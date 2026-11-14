/* ---- Ingeniería de menú ---- */
const CONSEJO = {
  Estrella: 'cuídalo y no lo toques',
  'Vende mucho, deja poco': 'sube precio o baja coste',
  'Deja mucho, vende poco': 'promociónalo',
  'Candidato a salir': 'revísalo o quítalo',
};
const CLASEP = {
  Estrella: 'ok',
  'Vende mucho, deja poco': 'warn',
  'Deja mucho, vende poco': 'warn',
  'Candidato a salir': 'crit',
};
function clasesIng() {
  const v = ventasMes(false),
    d = ordenados(S.platos.filter((p) => !p.base && p.pvp > 0)).map((p) => ({
      p: p,
      n: v ? Number(v.unidades[p.id]) || 0 : 0,
      m: margenUd(p),
    })),
    tot = suma(d, (x) => x.n);
  const mm = tot > 0 ? suma(d, (x) => x.m * x.n) / tot : 0,
    pop = d.length ? (tot / d.length) * 0.7 : 0;
  d.forEach((x) => {
    x.c =
      tot > 0
        ? x.n >= pop
          ? x.m >= mm
            ? 'Estrella'
            : 'Vende mucho, deja poco'
          : x.m >= mm
            ? 'Deja mucho, vende poco'
            : 'Candidato a salir'
        : '';
  });
  return { d: d, tot: tot, margen: suma(d, (x) => x.m * x.n), teo: suma(d, (x) => x.n * costeUd(x.p)) };
}
function calcIng() {
  const r = clasesIng();
  if (!$('ing-k')) return;
  $('ing-k').innerHTML =
    '<div class="kpi"><span class="lbl">Platos vendidos</span><b>' +
    r.tot +
    '</b></div><div class="kpi"><span class="lbl">Margen del mes</span><b>' +
    fEur.format(r.margen) +
    '</b></div><div class="kpi"><span class="lbl">Coste teórico</span><b>' +
    fEur.format(r.teo) +
    '</b></div>';
  r.d.forEach((x) => {
    const f = q($('lista-ing'), '[data-id="' + x.p.id + '"]');
    if (!f) return;
    q(f, '[data-out="c"]').innerHTML = x.c ? '<span class="pill ' + CLASEP[x.c] + '">' + x.c + '</span>' : '';
    q(f, '[data-out="t"]').textContent =
      'margen ' + fEur.format(x.m) + ' por plato' + (x.c ? ' · ' + CONSEJO[x.c] : '');
  });
}
function vIng() {
  if (ventasImp) {
    $('vista').innerHTML = vVentasImp();
    return;
  }
  const r = clasesIng();
  $('vista').innerHTML =
    '<div class="bar">' +
    mesHTML() +
    '<span class="hint grow">Importa el informe del TPV o escribe a mano cuántos platos se vendieron en el mes.</span>' +
    (sAPI ? '<button class="btn primary" type="button" data-act="ventas-importar">Importar ventas</button>' : '') +
    expHTML() +
    '</div><div class="kpis" id="ing-k"></div>' +
    '<section class="card"><div class="rows" id="lista-ing">' +
    (r.d.length
      ? r.d
          .map(
            (x) =>
              '<div class="row invrow" data-id="' +
              esc(x.p.id) +
              '"><div class="n"><b>' +
              esc(x.p.nombre) +
              '</b><span data-out="t"></span></div><div class="q"><input class="num" data-v="' +
              esc(x.p.id) +
              '" type="text" inputmode="numeric" aria-label="Ventas de ' +
              esc(x.p.nombre) +
              '" placeholder="0" value="' +
              esc(show(x.n)) +
              '"><span>ud</span></div><div class="v" data-out="c" style="text-align:right"></div></div>',
          )
          .join('')
      : '<p class="hint">Aún no hay platos con precio de carta.</p>') +
    '</div></section>' +
    semanasHTML();
  calcIng();
}
