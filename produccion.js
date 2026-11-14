/* ---- Producción del día ---- */
function plan(crear) {
  let v = S.planes.filter((x) => x.id === planF)[0];
  if (!v && crear) {
    v = nPlan({ id: planF });
    S.planes.push(v);
  }
  return v;
}
function calcPlan() {
  const v = plan(false),
    acc = {};
  if (!$('plan-nec')) return;
  if (v)
    Object.keys(v.items).forEach((id) => {
      const b = idx().pl.get(id),
        c = Number(v.items[id]) || 0;
      if (!b || !(c > 0)) return;
      const rac = b.raciones > 0 ? b.raciones : 1;
      b.ingredientes.forEach((i) => {
        if (!nom(i)) return;
        const u = un(i),
          k = norm(nom(i)) + u,
          o = acc[k] || (acc[k] = { n: nom(i), u: u, q: 0 });
        o.q += (bruto(i) * c) / rac;
      });
    });
  const l = Object.keys(acc)
    .map((k) => acc[k])
    .sort((a, z) => a.n.localeCompare(z.n, 'es'));
  $('plan-nec').innerHTML = l.length
    ? '<ul class="ri" style="grid-template-columns:minmax(0,1fr)">' +
      l
        .map(
          (o) =>
            '<li><span>' +
            esc(o.n) +
            '</span><b>' +
            (o.u === 'ud'
              ? fNum(o.q, 2) + ' ud'
              : o.q >= 1000
                ? fNum(o.q / 1000, 2) + ' ' + UDI[o.u]
                : fNum(o.q, 0) + ' ' + UD[o.u]) +
            '</b></li>',
        )
        .join('') +
      '</ul>'
    : '<p class="hint">Escribe cuánto vas a producir de cada elaboración y aquí saldrá lo que necesitas sacar.</p>';
}
function vProduccion() {
  const v = plan(false),
    bs = ordenados(S.platos.filter((p) => p.base));
  $('vista').innerHTML =
    '<div class="bar"><div class="field corto"><label for="plan-fecha">Día</label><input id="plan-fecha" type="date" value="' +
    esc(planF) +
    '"></div><span class="hint grow">Cantidad a producir de cada elaboración y casilla para marcarla hecha.</span><button class="btn" type="button" data-act="plan-sugerir">Sugerir para una semana</button>' +
    expHTML() +
    '</div>' +
    '<div class="dos"><div class="col"><section class="card"><div class="rows">' +
    (bs.length
      ? bs
          .map((b) => {
            const c = v ? Number(v.items[b.id]) || 0 : 0,
              h = v && v.hecho[b.id];
            return (
              '<div class="row invrow" data-id="' +
              esc(b.id) +
              '"><div class="n"><b>' +
              esc(b.nombre) +
              '</b><span>receta de ' +
              rinde(b) +
              '</span></div><div class="q"><input class="num" data-plan="' +
              esc(b.id) +
              '" type="text" inputmode="decimal" aria-label="Cantidad de ' +
              esc(b.nombre) +
              '" placeholder="0" value="' +
              esc(show(c)) +
              '"><span>' +
              UDI[b.unidadBase] +
              '</span></div>' +
              '<label class="check v" style="justify-content:flex-end"><input type="checkbox" data-planh="' +
              esc(b.id) +
              '"' +
              (h ? ' checked' : '') +
              '> Hecho</label></div>'
            );
          })
          .join('')
      : '<p class="hint">Marca una ficha como "elaboración de la casa" en Carta y aparecerá aquí.</p>') +
    '</div></section></div>' +
    '<div class="col"><section class="card"><h3>Necesitas sacar</h3><div id="plan-nec"></div></section></div></div>';
  calcPlan();
}
