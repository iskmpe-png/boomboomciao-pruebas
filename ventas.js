/* ---- Ventas: importación y semanas ---- */
let ventasImp = null,
  xlsxP = null;
const cargarXLSX = () =>
  xlsxP ||
  (xlsxP = new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = LIBS.xlsx;
    s.onload = () => ok(window.XLSX);
    s.onerror = () => {
      xlsxP = null;
      ko(new Error('xlsx'));
    };
    document.head.appendChild(s);
  }));
function semana(f) {
  const d = new Date(f + 'T12:00:00');
  if (isNaN(d)) return '';
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())),
    n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n);
  const y = t.getUTCFullYear(),
    w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return y + '-S' + pad(w);
}
function semanasVentas() {
  const m = {};
  S.ventas.forEach((v) =>
    Object.keys(v.semanas).forEach((k) => {
      const u = v.semanas[k];
      const o = m[k] || (m[k] = { k: k, u: {}, total: 0 });
      Object.keys(u).forEach((id) => {
        const n = Number(u[id]) || 0;
        o.u[id] = (o.u[id] || 0) + n;
        o.total += n;
      });
    }),
  );
  return Object.keys(m)
    .sort()
    .map((k) => m[k]);
}
async function importarVentas() {
  if (!sAPI) {
    toast('La IA no está disponible aquí.');
    return;
  }
  const f = (await pedirArchivo('.csv,.txt,.xlsx,.xls,image/*', false))[0];
  if (!f) return;
  ventasImp = { estado: 'leyendo', archivo: f.name };
  vIng();
  try {
    const lista = ordenados(S.platos.filter((p) => !p.base))
      .map((p) => p.nombre)
      .join('; ');
    const pr =
      'Es un informe de ventas del TPV de un restaurante (puede ser un cierre de caja, un listado de artículos vendidos o una exportación). Devuelve SOLO JSON:\n' +
      '{"desde":"AAAA-MM-DD" o null,"hasta":"AAAA-MM-DD" o null,"lineas":[{"articulo":"nombre como aparece","unidades":número total vendido,"plato":"nombre EXACTO de la lista de platos si es el mismo plato, si no \\"\\""}]}\n' +
      'Suma las unidades del mismo artículo. Incluye todos los artículos, también bebidas (con plato ""). Platos de la carta: ' +
      lista;
    let d;
    const img = /^image\//.test(f.type);
    if (img) {
      if (!sLim || !sLim.images) throw { code: 'images_unavailable' };
      d = await sAPI.json(pr, { images: [await reducir(f, 2000)], cache: false });
    } else {
      let txt;
      if (/\.xlsx?$/i.test(f.name)) {
        const X = await cargarXLSX(),
          wb = X.read(await f.arrayBuffer(), { type: 'array' });
        txt = wb.SheetNames.slice(0, 3)
          .map((n) => X.utils.sheet_to_csv(wb.Sheets[n]))
          .join('\n');
      } else txt = await f.text();
      d = await sAPI.json(pr + '\n\nARCHIVO "' + f.name + '":\n' + txt.slice(0, 120000), { cache: false });
    }
    const lineas = (Array.isArray(d && d.lineas) ? d.lineas : [])
      .map((l) => {
        const p =
          S.platos.filter((x) => !x.base && norm(x.nombre) === norm(l.plato))[0] ||
          S.platos.filter((x) => !x.base && norm(x.nombre) === norm(l.articulo))[0];
        return { art: String(l.articulo || ''), n: Math.round(Number(l.unidades) || 0), pid: p ? p.id : '' };
      })
      .filter((l) => l.n > 0);
    const ok = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : '');
    ventasImp = {
      estado: 'revisar',
      archivo: f.name,
      desde: ok(d && d.desde) || ok(d && d.hasta) || hoy(),
      hasta: ok(d && d.hasta) || ok(d && d.desde) || hoy(),
      lineas: lineas,
    };
  } catch (e) {
    ventasImp = { estado: 'error', msg: errIA(e) };
  }
  if (pant === 'ingenieria') vIng();
}
function vVentasImp() {
  const e = ventasImp;
  if (e.estado === 'leyendo')
    return (
      '<section class="card estado"><strong>Leyendo las ventas…</strong><span>' + esc(e.archivo) + '</span></section>'
    );
  if (e.estado === 'error')
    return (
      '<section class="card estado"><strong>No se pudo leer</strong><span>' +
      esc(e.msg) +
      '</span><div class="acciones"><button class="btn" type="button" data-act="vi-cancelar">Cerrar</button></div></section>'
    );
  const dup = S.ventas.some((v) => v.importes.some((x) => x.desde === e.desde && x.hasta === e.hasta)),
    pl = ordenados(S.platos.filter((p) => !p.base)),
    n = suma(
      e.lineas.filter((l) => l.pid),
      (l) => l.n,
    );
  return (
    '<form id="form-ventas" class="col" novalidate><section class="card"><h2>Revisa las ventas</h2><p class="hint">' +
    esc(e.archivo) +
    '. Lo que no sea un plato de la carta (bebidas, extras) se ignora.</p>' +
    '<div class="ficha"><div class="field"><label for="vi-desde">Desde</label><input id="vi-desde" data-vig="desde" type="date" value="' +
    esc(e.desde) +
    '"></div><div class="field"><label for="vi-hasta">Hasta</label><input id="vi-hasta" data-vig="hasta" type="date" value="' +
    esc(e.hasta) +
    '"></div></div>' +
    (dup ? '<p class="aviso">Ya importaste ventas de estas mismas fechas. Si guardas, se sumarán otra vez.</p>' : '') +
    '</section>' +
    '<section class="card"><h3 id="vi-n">' +
    n +
    ' platos vendidos</h3><div class="rows">' +
    e.lineas
      .map(
        (l, k) =>
          '<div class="row invrow" data-k="' +
          k +
          '"><div class="n"><b>' +
          esc(l.art) +
          '</b><select data-vil="pid" aria-label="Plato de la carta"><option value="">No es un plato</option>' +
          pl
            .map(
              (p) =>
                '<option value="' +
                esc(p.id) +
                '"' +
                (p.id === l.pid ? ' selected' : '') +
                '>' +
                esc(p.nombre) +
                '</option>',
            )
            .join('') +
          '</select></div>' +
          '<div class="q"><input class="num" data-vil="n" type="text" inputmode="numeric" aria-label="Unidades" value="' +
          l.n +
          '"><span>ud</span></div></div>',
      )
      .join('') +
    '</div></section>' +
    '<div class="acciones"><button class="btn primary" type="submit">Sumar a las ventas</button><button class="btn" type="button" data-act="vi-cancelar">Descartar</button></div></form>'
  );
}
function guardarVentas() {
  const e = ventasImp,
    mes = (e.hasta || e.desde || hoy()).slice(0, 7),
    wk = semana(e.hasta || e.desde || hoy());
  let v = S.ventas.filter((x) => x.id === mes)[0];
  if (!v) {
    v = nVenta({ id: mes });
    S.ventas.push(v);
  }
  let n = 0;
  const w = v.semanas[wk] || (v.semanas[wk] = {});
  e.lineas.forEach((l) => {
    if (!l.pid || !(l.n > 0)) return;
    v.unidades[l.pid] = (Number(v.unidades[l.pid]) || 0) + l.n;
    w[l.pid] = (Number(w[l.pid]) || 0) + l.n;
    n += l.n;
  });
  v.importes.push({ desde: e.desde, hasta: e.hasta, n: n, archivo: e.archivo, creado: new Date().toISOString() });
  guardar('ventas', v, true);
  ventasImp = null;
  mesM = mes;
  vIng();
  toast(n + ' platos sumados a ' + fMes(mes).toLowerCase());
}
function semanasHTML() {
  const sm = semanasVentas().slice(-6);
  if (!sm.length) return '';
  const top = {};
  sm.forEach((w) =>
    Object.keys(w.u).forEach((id) => {
      top[id] = (top[id] || 0) + w.u[id];
    }),
  );
  const ids = Object.keys(top)
    .sort((a, z) => top[z] - top[a])
    .slice(0, 6);
  return (
    '<section class="card"><h3>Platos por semana</h3><div class="tabla"><table><thead><tr><th>Plato</th>' +
    sm.map((w) => '<th>' + esc(w.k.slice(5)) + '</th>').join('') +
    '<th>Media</th></tr></thead><tbody>' +
    ids
      .map((id) => {
        const p = idx().pl.get(id);
        return (
          '<tr><td>' +
          esc(p ? p.nombre : '—') +
          '</td>' +
          sm.map((w) => '<td>' + (w.u[id] || 0) + '</td>').join('') +
          '<td><b>' +
          fNum(top[id] / sm.length, 0) +
          '</b></td></tr>'
        );
      })
      .join('') +
    '<tr><td><b>Total</b></td>' +
    sm.map((w) => '<td><b>' + w.total + '</b></td>').join('') +
    '<td><b>' +
    fNum(suma(sm, (w) => w.total) / sm.length, 0) +
    '</b></td></tr></tbody></table></div></section>'
  );
}
function explotarBases(p, uds, acc, d) {
  const rac = p.raciones > 0 ? p.raciones : 1;
  if ((d || 0) > 5) return acc;
  p.ingredientes.forEach((i) => {
    const b = baseDe(i);
    if (!b) return;
    const q = ((un(i) === 'ud' ? bruto(i) : bruto(i) / 1000) * uds) / rac;
    acc[b.id] = (acc[b.id] || 0) + q;
    explotarBases(b, q, acc, (d || 0) + 1);
  });
  return acc;
}
function sugerirPlan() {
  const sm = semanasVentas().slice(-4);
  if (!sm.length) {
    toast('Importa ventas en Carta › Ingeniería para poder sugerir.');
    return;
  }
  const acc = {};
  sm.forEach((w) =>
    Object.keys(w.u).forEach((id) => {
      const p = idx().pl.get(id);
      if (p) explotarBases(p, w.u[id] / sm.length, acc, 0);
    }),
  );
  const v = plan(true);
  v.items = {};
  Object.keys(acc).forEach((id) => {
    if (acc[id] > 0) v.items[id] = Math.ceil(acc[id] * 100) / 100;
  });
  guardar('planes', v, true);
  vProduccion();
  toast(
    'Cantidades para una semana, con la media de ' +
      sm.length +
      (sm.length === 1 ? ' semana' : ' semanas') +
      ' de ventas',
  );
}
