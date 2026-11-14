/* ---- Panel de grupo: compara los restaurantes a los que tienes acceso de gestión ---- */
let grupo = null,
  grupoMes = '';
const gestion = () => mios.filter((x) => x.rol === 'dueno' || x.rol === 'encargado');
async function cargarGrupo() {
  const out = [];
  for (const m of gestion()) {
    const d = { platos: [], productos: [], compras: [], mermas: [] };
    let ini = 0;
    for (;;) {
      const q = await sb
        .from('docs')
        .select('col,id,data')
        .eq('restaurante_id', m.id)
        .eq('borrado', false)
        .in('col', ['platos', 'productos', 'compras', 'mermas'])
        .order('col')
        .order('id')
        .range(ini, ini + 999);
      if (q.error) throw q.error;
      (q.data || []).forEach((x) => {
        if (d[x.col]) d[x.col].push(NORM[x.col](Object.assign({}, x.data, { id: x.id })));
      });
      if (!q.data || q.data.length < 1000) break;
      ini += 1000;
    }
    out.push({ m: m, d: d });
  }
  return out;
}
function kpisGrupo(g) {
  const o = { platos: S.platos, productos: S.productos };
  let r;
  try {
    S.platos = g.d.platos;
    S.productos = g.d.productos;
    sucio();
    const pl = S.platos.filter((p) => !p.base),
      fcs = pl.map(fcDe).filter((x) => x != null);
    r = {
      n: pl.length,
      fc: fcs.length ? suma(fcs, (x) => x) / fcs.length : null,
      fuera: pl.filter((p) => {
        const f = fcDe(p);
        return f != null && f > (p.objetivo || 30);
      }).length,
      compras: suma(
        g.d.compras.filter((c) => c.fecha.slice(0, 7) === mesM),
        (c) => c.importe,
      ),
      mermas: suma(
        g.d.mermas.filter((x) => x.fecha.slice(0, 7) === mesM),
        valM,
      ),
    };
  } finally {
    S.platos = o.platos;
    S.productos = o.productos;
    sucio();
  }
  r.pm = r.compras > 0 ? (r.mermas / r.compras) * 100 : null;
  return r;
}
function filasGrupo() {
  return (grupo || []).map((g) => ({ g: g, k: kpisGrupo(g) }));
}
function vGrupo() {
  if (!sb || gestion().length < 1) {
    $('vista').innerHTML = vacio('Panel de grupo no disponible', 'Lo ven el dueño y los encargados.', '');
    return;
  }
  if (sinRed) {
    $('vista').innerHTML = vacio(
      'Sin conexión',
      'El panel de grupo necesita internet para leer los demás restaurantes.',
      '',
    );
    return;
  }
  if (!grupo) {
    $('vista').innerHTML = '<section class="card estado"><strong>Cargando los restaurantes</strong></section>';
    cargarGrupo().then(
      (g) => {
        grupo = g;
        if (pant === 'grupo') vGrupo();
      },
      (e) => {
        $('vista').innerHTML = vacio('No se pudo cargar', errTxt(e), '');
      },
    );
    return;
  }
  const fs = filasGrupo(),
    mx = Math.max.apply(null, fs.map((f) => f.k.fc || 0).concat([1])),
    tot = { c: suma(fs, (f) => f.k.compras), m: suma(fs, (f) => f.k.mermas) };
  $('vista').innerHTML =
    '<div class="bar">' +
    mesHTML() +
    '<span class="hint grow">' +
    fs.length +
    (fs.length === 1 ? ' restaurante' : ' restaurantes') +
    '. Compras y mermas del mes, sin IVA.</span><button class="btn" type="button" data-act="grupo-recargar">Actualizar</button>' +
    expHTML() +
    '</div>' +
    '<div class="kpis"><div class="kpi"><span>Compras del grupo</span><b>' +
    fEur.format(tot.c) +
    '</b></div><div class="kpi"><span>Mermas del grupo</span><b>' +
    fEur.format(tot.m) +
    '</b></div><div class="kpi"><span>Merma sobre compras</span><b>' +
    (tot.c > 0 ? fNum((tot.m / tot.c) * 100) + ' %' : '—') +
    '</b></div></div>' +
    '<section class="card"><div class="gr-lista">' +
    fs
      .map((f) => {
        const k = f.k,
          m = f.g.m;
        return (
          '<div class="gr"><div class="gr-c"><b>' +
          esc(m.nombre) +
          '</b>' +
          (m.id === rid
            ? '<span class="pill">Abierto ahora</span>'
            : '<button class="link" type="button" data-act="grupo-abrir" data-id="' + esc(m.id) + '">Abrir</button>') +
          '</div>' +
          '<div class="fila-barra"><span>Food cost medio</span><span class="v">' +
          (k.fc == null ? '—' : fNum(k.fc) + ' %') +
          '</span><span class="pista"><i style="width:' +
          (k.fc ? (k.fc / mx) * 100 : 0) +
          '%"></i></span></div>' +
          '<div class="gr-k"><span><small>Platos</small><b>' +
          k.n +
          '</b></span><span><small>Fuera de objetivo</small><b' +
          (k.fuera ? ' class="mal"' : '') +
          '>' +
          k.fuera +
          '</b></span><span><small>Compras</small><b>' +
          fEur.format(k.compras) +
          '</b></span><span><small>Mermas</small><b>' +
          fEur.format(k.mermas) +
          '</b></span><span><small>Merma / compras</small><b>' +
          (k.pm == null ? '—' : fNum(k.pm) + ' %') +
          '</b></span></div></div>'
        );
      })
      .join('') +
    '</div></section>';
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'grupo-recargar') {
    grupo = null;
    vGrupo();
  } else if (a === 'grupo-abrir') {
    mem('bbc.rest', b.dataset.id);
    location.hash = '#inicio-panel';
    location.reload();
  }
});
