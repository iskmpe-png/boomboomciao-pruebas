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
/* Clave para comparar nombres: sin tildes, sin espacios ni signos y sin letras repetidas.
   «Regina Boom Boom» y «Regginna Boomboom» dan la misma: «reginabomboom». */
const claveNombre = (s) =>
  norm(s)
    .replace(/[^a-z0-9]/g, '')
    .replace(/(.)\1+/g, '$1');
function distancia(a, b) {
  const m = a.length,
    n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
/* De 0 a 1: cuánto se parecen dos nombres de plato */
function parecido(a, b) {
  const x = claveNombre(a),
    y = claveNombre(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const corto = x.length < y.length ? x : y,
    largo = corto === x ? y : x;
  /* «Margherita» dentro de «Pizza Margherita» */
  if (corto.length >= 5 && largo.indexOf(corto) >= 0) return 0.86;
  return 1 - distancia(x, y) / Math.max(x.length, y.length);
}
/* Busca el plato de la carta que corresponde a un artículo del TPV */
function platoDeArticulo(art, sugerido) {
  const pl = S.platos.filter((p) => !p.base),
    n = norm(art);
  let p = pl.find((x) => x.alias.some((a) => norm(a) === n));
  if (p) return { p, como: 'alias' };
  p = pl.find((x) => norm(x.nombre) === n);
  if (p) return { p, como: 'exacto' };
  if (sugerido) {
    p = pl.find((x) => norm(x.nombre) === norm(sugerido));
    if (p) return { p, como: 'parecido' };
  }
  let mejor = null,
    m = 0;
  pl.forEach((x) => {
    const s = Math.max(parecido(art, x.nombre), ...x.alias.map((a) => parecido(art, a)));
    if (s > m) {
      m = s;
      mejor = x;
    }
  });
  return m >= 0.8 ? { p: mejor, como: 'parecido' } : { p: null, como: '' };
}
/* Los TPV escriben en mayúsculas: «REGINA BOOM BOOM» pasa a «Regina Boom Boom» */
const bonito = (s) => {
  s = String(s || '').trim().replace(/\s+/g, ' ');
  return s && s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : s;
};
const VENTAS_PROMPT =
  'Es un informe de ventas del TPV de un restaurante (cierre de caja, listado de artículos vendidos o exportación). Devuelve SOLO JSON:\n' +
  '{"desde":"AAAA-MM-DD" o null,"hasta":"AAAA-MM-DD" o null,"lineas":[{"articulo":"nombre como aparece","unidades":número total vendido,"importe":total vendido en euros con IVA o null,"precio":precio de venta de una unidad con IVA o null,"plato":"nombre EXACTO de la lista de platos si es claramente el mismo plato aunque esté escrito distinto, si no \\"\\"","menu":"nombre del menú si el artículo es un plato dentro de un menú, si no \\"\\"","tiempo":"entrante, principal, postre, bebida u otro (solo si es de un menú)"}]}\n' +
  '- Un plato dentro de un menú suele venir con el menú entre paréntesis o detrás: «Alcachofas (Menú Experiencia Gianini)», «Avocado Toast (Menú Brunch 1 o 2)». En ese caso "menu" es el nombre del menú y "plato" el plato sin el menú.\n' +
  'Reglas:\n- Suma las unidades del mismo artículo. Incluye todos los artículos, también bebidas y extras.\n' +
  '- No incluyas totales, subtotales, impuestos, formas de pago, propinas ni descuentos generales.\n' +
  '- Si el informe solo da el importe, calcula el precio dividiendo entre las unidades.\n' +
  '- Para "plato", acepta diferencias de tildes, espacios, letras repetidas o abreviaturas (por ejemplo «Regina Boom Boom» y «Regginna Boomboom» son el mismo plato). Si dudas, deja "".\n';
/* ---- Antes de subir: ¿de qué fechas son estas ventas? ---- */
function rangosRapidos() {
  const h = hoy(),
    lun = lunesDe(h),
    ayer = masDias(h, -1),
    mes = h.slice(0, 8) + '01';
  return [
    ['pasada', 'Semana pasada', masDias(lun, -7), masDias(lun, -1)],
    ['esta', 'Esta semana', lun, h],
    ['ayer', 'Ayer', ayer, ayer],
    ['mes', 'Este mes', mes, h],
  ];
}
const fRangoF = (a, b) => (a === b ? fFecha(a) : new Date(a + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ' – ' + fFecha(b));
function elegirPeriodoVentas() {
  if (!sAPI) {
    toast('La IA no está disponible aquí.');
    return;
  }
  const r = rangosRapidos();
  capa(
    capaTop('Importar ventas', '¿De qué fechas son?') +
      '<form id="form-vper" class="editor" novalidate>' +
      '<div class="field wide"><span class="lbl">Periodo</span><div class="togs">' +
      r.map((x, i) => '<label class="tog"><input type="radio" name="vper" value="' + x[0] + '"' + (i === 0 ? ' checked' : '') + '> ' + x[1] + ' <small>' + esc(fRangoF(x[2], x[3])) + '</small></label>').join('') +
      '<label class="tog"><input type="radio" name="vper" value="otro"> Otras fechas</label><label class="tog"><input type="radio" name="vper" value="ia"> Las que diga el informe</label></div></div>' +
      '<div class="field"><label for="vp-d">Desde</label><input id="vp-d" type="date" value="' + r[0][2] + '"></div><div class="field"><label for="vp-h">Hasta</label><input id="vp-h" type="date" value="' + r[0][3] + '"></div>' +
      '<p class="hint wide" id="vp-av" aria-live="polite"></p>' +
      '<div class="acciones wide"><button class="btn primary" type="submit">Elegir el archivo</button><button class="btn" type="button" data-capa="cerrar">Cancelar</button></div></form>',
  );
  vperAviso();
}
function vperAviso() {
  const d = $('vp-d').value,
    h = $('vp-h').value,
    ya = S.ventas.reduce((l, v) => l.concat(v.importes), []).filter((x) => x.desde <= h && x.hasta >= d);
  $('vp-av').textContent = ya.length ? 'Ojo: ya hay ventas importadas que tocan esas fechas (' + ya.map((x) => fRangoF(x.desde, x.hasta)).join(', ') + '). Si es el mismo informe, se sumaría dos veces.' : '';
}
$('capa').addEventListener('change', (e) => {
  const t = e.target;
  if (!$('form-vper') || !$('form-vper').contains(t)) return;
  if (t.name === 'vper') {
    const x = rangosRapidos().find((y) => y[0] === t.value);
    if (x) {
      $('vp-d').value = x[2];
      $('vp-h').value = x[3];
    }
    $('vp-d').disabled = $('vp-h').disabled = t.value === 'ia';
  } else if (t.id === 'vp-d' || t.id === 'vp-h') {
    const o = q($('form-vper'), 'input[value="otro"]');
    if (o) o.checked = true;
  }
  vperAviso();
});
$('capa').addEventListener('submit', (e) => {
  if (e.target.id !== 'form-vper') return;
  e.preventDefault();
  const m = (q(e.target, 'input[name="vper"]:checked') || {}).value,
    d = $('vp-d').value,
    h = $('vp-h').value;
  if (m !== 'ia' && (!d || !h || d > h)) {
    $('vp-av').textContent = 'Revisa las fechas: «desde» tiene que ser antes que «hasta».';
    return;
  }
  cerrarCapa();
  importarVentas(m === 'ia' ? null : { desde: d, hasta: h });
});
async function importarVentas(periodo) {
  if (!sAPI) {
    toast('La IA no está disponible aquí.');
    return;
  }
  const fs = await pedirArchivo('.csv,.tsv,.txt,.xlsx,.xls,.ods,.pdf,image/*', true);
  if (!fs.length) return;
  ventasImp = { estado: 'leyendo', archivo: fs.map((f) => f.name).join(', '), paso: 'Abriendo los archivos…' };
  vIng();
  const lista =
    'Platos de la carta: ' +
    ordenados(S.platos.filter((p) => !p.base))
      .map((p) => p.nombre + (p.alias.length ? ' (en el TPV: ' + p.alias.join(', ') + ')' : ''))
      .join('; ')
      .slice(0, 12000) +
    '\n';
  const trabajos = [],
    avisos = [];
  for (const f of fs) {
    try {
      const d = await leerDocumento(f);
      d.textos.forEach((t) => trocear(t, 9000).forEach((c) => trabajos.push({ texto: c, f: f.name })));
      d.imagenes.forEach((i) => trabajos.push({ imagenes: [i], f: f.name }));
    } catch (e) {
      avisos.push((e && e.message) || 'No se pudo abrir «' + f.name + '».');
    }
  }
  if (!ventasImp) return;
  const porArt = {},
    fechas = [];
  let fallo = '',
    seguidos = 0;
  for (let k = 0; k < trabajos.length; k++) {
    if (!ventasImp) return;
    ventasImp.paso = 'Leyendo las ventas: parte ' + (k + 1) + ' de ' + trabajos.length + '…';
    if (pant === 'ingenieria') vIng();
    const t = trabajos[k];
    try {
      const d = await sAPI.json(VENTAS_PROMPT + lista + (t.texto ? '\nINFORME (las columnas van separadas por ;):\n' + t.texto : '\nLee la foto adjunta.'), { images: t.imagenes || [], cache: false });
      seguidos = 0;
      if (d && d.desde) fechas.push(d.desde);
      if (d && d.hasta) fechas.push(d.hasta);
      (Array.isArray(d && d.lineas) ? d.lineas : []).forEach((l) => {
        const art = String((l && l.articulo) || '').trim().slice(0, 120),
          n = Number(l && l.unidades) || 0;
        if (!art || !(n > 0)) return;
        const x = porArt[norm(art)] || (porArt[norm(art)] = { art: art, n: 0, importe: 0, precio: 0, sug: '', menu: '', tiempo: '' });
        x.n += n;
        x.importe += Number(l.importe) || 0;
        x.precio = x.precio || Number(l.precio) || 0;
        x.sug = x.sug || String(l.plato || '');
        x.menu = x.menu || String(l.menu || '').trim().slice(0, 80);
        x.tiempo = x.tiempo || String(l.tiempo || '').trim().slice(0, 40);
      });
    } catch (e) {
      fallo = errIA(e);
      if (e && (e.code === 'rate_limited' || e.code === 'session_expired' || ++seguidos >= 2)) break;
      avisos.push('Una parte no se pudo leer (' + (k + 1) + ' de ' + trabajos.length + ').');
    }
  }
  if (!ventasImp) return;
  detectarMenus(porArt);
  const lineas = Object.keys(porArt).map((k) => {
    const x = porArt[k],
      m = platoDeArticulo(x.menu ? x.base : x.art, x.sug),
      pr = x.precio || (x.importe > 0 ? x.importe / x.n : 0);
    return {
      art: x.art,
      n: Math.round(x.n),
      pid: m.p ? m.p.id : '',
      como: m.como,
      precio: Math.round(pr * 100) / 100,
      alias: !x.menu,
      renombrar: false,
      menu: x.menu,
      base: x.base || '',
      tiempo: tiempoBonito(x.tiempo),
    };
  });
  if (!lineas.length) {
    ventasImp = { estado: 'error', msg: fallo || avisos.join(' ') || 'No encontré artículos vendidos en esos archivos.' };
    if (pant === 'ingenieria') vIng();
    return;
  }
  const ok = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : ''),
    fs2 = fechas.map(ok).filter(Boolean).sort();
  ventasImp = {
    estado: 'revisar',
    menus: gruposMenus(lineas),
    archivo: fs.map((f) => f.name).join(', '),
    desde: periodo ? periodo.desde : fs2[0] || hoy(),
    hasta: periodo ? periodo.hasta : fs2[fs2.length - 1] || hoy(),
    fijo: !!periodo,
    leidas: fs2.length ? [fs2[0], fs2[fs2.length - 1]] : null,
    grupoNuevo: '',
    avisos: avisos,
    lineas: lineas,
  };
  if (pant === 'ingenieria') vIng();
}
/* ---- Menús dentro del informe ----
   Los TPV ponen los platos de un menú con el menú al lado: «Alcachofas (Menú Experiencia Gianini)».
   Cada plato se suma por separado (para el gasto y las compras), pero su precio no cuenta como plato
   suelto: cuenta el menú. Los menús vendidos salen del tiempo que más se vendió. */
const MENU_RE = /^(.*?)\s*[\(\[]\s*([^)\]]+?)\s*[\)\]]\s*$/;
function detectarMenus(porArt) {
  const xs = Object.keys(porArt).map((k) => porArt[k]),
    cand = {};
  xs.forEach((x) => {
    const m = MENU_RE.exec(x.art);
    x.base = m ? m[1].trim() : x.art;
    x.paren = m ? m[2].trim() : '';
    if (x.paren) cand[norm(x.paren)] = (cand[norm(x.paren)] || 0) + 1;
  });
  xs.forEach((x) => {
    /* Lo que va entre paréntesis es un menú si la IA lo dice, si dice «menú», si ya existe o si se repite en varios platos */
    if (!x.menu && x.paren && (/\bmen[uú]\b/i.test(x.paren) || cand[norm(x.paren)] >= 2 || S.eventos.some((e) => norm(e.nombre) === norm(x.paren)))) x.menu = x.paren;
    if (x.menu && !x.paren) {
      const i = norm(x.art).indexOf(norm(x.menu));
      x.base = i > 0 ? x.art.slice(0, x.art.length - x.menu.length).replace(/[\s(\[-]+$/, '').trim() || x.art : x.art;
    }
    if (x.menu && x.paren && norm(x.menu) !== norm(x.paren)) x.base = x.art.replace(MENU_RE, '$1').trim();
    if (x.menu) x.menu = bonito(x.menu);
  });
}
const TIEMPOS = { entrante: 'Entrante', entrada: 'Entrante', primero: 'Entrante', principal: 'Principal', segundo: 'Principal', fondo: 'Principal', postre: 'Postre', bebida: 'Bebida' };
const tiempoBonito = (t) => TIEMPOS[norm(t).split(' ')[0]] || '';
/* Un grupo por menú del informe, ligado al menú que ya existe con ese nombre (o para crearlo) */
function gruposMenus(lineas) {
  const g = {};
  lineas.forEach((l) => {
    if (!l.menu) return;
    const k = norm(l.menu);
    if (!g[k]) {
      const ev = S.eventos.find((e) => norm(e.nombre) === k) || S.eventos.find((e) => e.nombre && (norm(e.nombre).indexOf(k) >= 0 || k.indexOf(norm(e.nombre)) >= 0));
      g[k] = { k: k, nombre: l.menu, ev: ev ? ev.id : '__nuevo' };
    }
    /* Si el menú ya existe y conoce el plato, se usa el tiempo que tiene allí */
    const ev = S.eventos.find((e) => e.id === g[k].ev),
      x = ev && l.pid && ev.platos.find((y) => y.id === l.pid);
    if (x && x.tiempo) l.tiempo = x.tiempo;
  });
  return Object.keys(g).map((k) => g[k]);
}
const lineasMenu = (m) => (ventasImp ? ventasImp.lineas.filter((l) => l.menu && norm(l.menu) === m.k) : []);
/* Menús vendidos de un grupo del informe: por tiempo se suman sus opciones; el total es el tiempo mayor */
function totalMenu(m) {
  const t = {};
  lineasMenu(m).forEach((l) => {
    if (!(l.n > 0)) return;
    const k = l.tiempo || '·' + l.art;
    t[k] = (t[k] || 0) + l.n;
  });
  return Math.max(0, ...Object.values(t));
}
const enMenuSi = (l) => l.menu && ventasImp && ventasImp.menus.some((m) => m.k === norm(l.menu) && m.ev !== '__suelto');
const vendidos = () =>
  suma(
    ventasImp.lineas.filter((x) => x.pid && !enMenuSi(x)),
    (x) => x.n,
  );
const textoSumar = () => {
  const nm = (ventasImp.menus || []).filter((m) => m.ev !== '__suelto').reduce((t, m) => t + totalMenu(m), 0);
  return 'Sumar ' + vendidos() + ' platos' + (nm ? ' y ' + nm + (nm === 1 ? ' menú' : ' menús') : '') + ' vendidos';
};
function menusImpHTML() {
  const e = ventasImp;
  if (!e.menus || !e.menus.length) return '';
  return (
    '<section class="card vi-menus"><h3>Menús en este informe (' + e.menus.length + ')</h3><p class="hint">Sus platos se suman uno a uno para calcular el gasto y las compras, pero su precio no cuenta como plato suelto: cuenta el menú. Para saber cuántos menús se vendieron, pon a cada plato su tiempo: se suman las opciones de cada tiempo y el total es el tiempo que más vendió.</p>' +
    e.menus
      .map((m, i) => {
        const ls = e.lineas.map((l, k) => [l, k]).filter(([l]) => l.menu && norm(l.menu) === m.k),
          suelto = m.ev === '__suelto';
        return (
          '<div class="vi-menu" data-mi="' + i + '"><div class="acciones vi-menu-cab"><b class="grow">' + esc(m.nombre) + '</b>' +
          (suelto ? '' : '<span class="pill ok" data-out="tm">' + totalMenu(m) + (totalMenu(m) === 1 ? ' menú' : ' menús') + '</span>') +
          '<select data-vim="ev" aria-label="Menú para ' + esc(m.nombre) + '"><option value="__nuevo"' + (m.ev === '__nuevo' ? ' selected' : '') + '>Crear el menú «' + esc(m.nombre) + '»</option>' +
          ordenados(S.eventos).map((ev) => '<option value="' + esc(ev.id) + '"' + (ev.id === m.ev ? ' selected' : '') + '>Es el menú «' + esc(ev.nombre || 'sin nombre') + '»</option>').join('') +
          '<option value="__suelto"' + (suelto ? ' selected' : '') + '>No es un menú: contar como platos sueltos</option></select></div>' +
          '<div class="rows">' +
          ls
            .map(([l, k]) =>
              filaVenta(l, k).replace(
                '</div><div class="q">',
                (suelto ? '' : '<label class="mini vi-t"><span>Tiempo</span><input type="text" list="dl-tiempos" data-vil="tiempo" value="' + esc(l.tiempo) + '" placeholder="Entrante, Principal…" autocomplete="off"></label>') + '</div><div class="q">',
              ),
            )
            .join('') +
          '</div></div>'
        );
      })
      .join('') +
    '</section>'
  );
}
const nombreNuevo = (l) => bonito(l.menu && l.base ? l.base : l.art);
function filaVenta(l, k) {
  const pl = ordenados(S.platos.filter((p) => !p.base)),
    p = l.pid && l.pid !== '__nuevo' ? plato(l.pid) : null,
    distinto = !l.menu && p && norm(p.nombre) !== norm(l.art) && !p.alias.some((a) => norm(a) === norm(l.art));
  return (
    '<div class="row invrow vrow" data-k="' + k + '"><div class="n"><b>' + esc(l.art) +
    (l.como === 'parecido' ? ' <span class="pill warn">¿Es este?</span>' : l.como === 'alias' ? ' <span class="pill ok">Reconocido</span>' : '') +
    (l.precio > 0 ? ' <span class="hint">· ' + fEur.format(l.precio) + '</span>' : '') + '</b>' +
    '<select data-vil="pid" aria-label="Plato de la carta para ' + esc(l.art) + '"><option value="">No es un plato</option><option value="__nuevo"' + (l.pid === '__nuevo' ? ' selected' : '') + '>+ Crear plato nuevo</option>' +
    pl.map((x) => '<option value="' + esc(x.id) + '"' + (x.id === l.pid ? ' selected' : '') + '>' + esc(x.nombre) + '</option>').join('') +
    '</select>' +
    (distinto
      ? '<label class="check"><input type="checkbox" data-vil="alias"' + (l.alias ? ' checked' : '') + '> Recordar que en el TPV se llama así</label>' +
        '<label class="check"><input type="checkbox" data-vil="renombrar"' + (l.renombrar ? ' checked' : '') + '> Cambiar el nombre de mi plato a «' + esc(bonito(l.art)) + '»</label>'
      : '') +
    (l.pid === '__nuevo' && !l.menu
      ? '<div class="vi-nuevo"><label class="mini"><span>Precio carta €</span><input class="num" data-vil="precio" type="text" inputmode="decimal" value="' + esc(show(l.precio)) + '"></label></div>'
      : '') +
    '</div><div class="q"><input class="num" data-vil="n" type="text" inputmode="numeric" aria-label="Unidades" value="' + l.n + '"><span>ud</span></div></div>'
  );
}
function vVentasImp() {
  const e = ventasImp;
  if (e.estado === 'leyendo')
    return '<section class="card estado"><strong>Leyendo las ventas…</strong><span>' + esc(e.paso || e.archivo) + '</span><button class="btn" type="button" data-act="vi-cancelar">Cancelar</button></section>';
  if (e.estado === 'error')
    return (
      '<section class="card estado"><strong>No se pudo leer</strong><span>' + esc(e.msg) +
      '</span><div class="acciones" style="justify-content:center"><button class="btn primary" type="button" data-act="ventas-importar">Probar otra vez</button><button class="btn" type="button" data-act="vi-cancelar">Cerrar</button></div></section>'
    );
  const dup = S.ventas.some((v) => v.importes.some((x) => x.desde <= e.hasta && x.hasta >= e.desde)),
    idx3 = e.lineas.map((l, k) => [l, k]).filter(([l]) => !l.menu),
    revisar = idx3.filter(([l]) => l.como === 'parecido' && l.pid),
    faltan = idx3.filter(([l]) => !l.pid || l.pid === '__nuevo'),
    bien = idx3.filter(([l]) => l.pid && l.pid !== '__nuevo' && l.como !== 'parecido'),
    sinCrear = faltan.filter(([l]) => !l.pid).length,
    nuevos = e.lineas.filter((l) => l.pid === '__nuevo').length;
  return (
    '<form id="form-ventas" class="col" novalidate><section class="card"><h2>Revisa las ventas</h2><p class="hint">' + esc(e.archivo) + '</p>' +
    '<div class="ficha"><div class="field"><label for="vi-desde">Desde</label><input id="vi-desde" data-vig="desde" type="date" value="' + esc(e.desde) +
    '"></div><div class="field"><label for="vi-hasta">Hasta</label><input id="vi-hasta" data-vig="hasta" type="date" value="' + esc(e.hasta) + '"></div></div>' +
    (e.fijo && e.leidas && (e.leidas[0] !== e.desde || e.leidas[1] !== e.hasta) ? '<p class="hint">El informe dice ' + esc(fRangoF(e.leidas[0], e.leidas[1])) + '. Se guarda con las fechas que elegiste; cámbialas aquí si hace falta.</p>' : '') +
    (dup ? '<p class="aviso">Ya hay ventas importadas que tocan estas fechas. Si es el mismo informe, se sumarán otra vez.</p>' : '') +
    (e.avisos && e.avisos.length ? '<p class="aviso">' + esc(e.avisos.join(' ')) + ' Revisa que no falte nada.</p>' : '') +
    '</section>' +
    (revisar.length
      ? '<section class="card"><h3>Revisa estos (' + revisar.length + ')</h3><p class="hint">Se parecen a un plato tuyo pero no se llaman igual. Si es el mismo, la app recordará el nombre del TPV para la próxima vez; también puedes cambiar el nombre de tu plato al del informe.</p><div class="rows">' +
        revisar.map(([l, k]) => filaVenta(l, k)).join('') + '</div></section>'
      : '') +
    (faltan.length
      ? '<section class="card"><h3>No están en tu carta (' + faltan.length + ')</h3><p class="hint">Puedes crearlos como platos nuevos con el precio del informe. Lo que no sea un plato (bebidas sueltas, extras) déjalo en «No es un plato».</p>' +
        '<div class="acciones">' + (sinCrear ? '<button class="btn small" type="button" data-act="vi-crear-todos">Crear todos como platos</button>' : '') +
        (nuevos
          ? '<div class="field corto"><label for="vi-grupo">Grupo de los nuevos</label><select id="vi-grupo" data-vig="grupoNuevo"><option value="">Sin grupo</option>' +
            gruposCarta().map((g) => '<option' + (g === e.grupoNuevo ? ' selected' : '') + '>' + esc(g) + '</option>').join('') + '</select></div>'
          : '') +
        '</div><div class="rows">' + faltan.map(([l, k]) => filaVenta(l, k)).join('') + '</div></section>'
      : '') +
    (bien.length
      ? '<section class="card"><details' + (revisar.length || faltan.length ? '' : ' open') + '><summary>Reconocidos (' + bien.length + ')</summary><div class="rows">' +
        bien.map(([l, k]) => filaVenta(l, k)).join('') + '</div></details></section>'
      : '') +
    menusImpHTML() +
    '<div class="acciones"><button class="btn primary" type="submit" id="vi-n">' + esc(textoSumar()) + '</button><button class="btn" type="button" data-act="vi-cancelar">Descartar</button></div></form>'
  );
}
function guardarVentas() {
  const e = ventasImp,
    mes = (e.hasta || e.desde || hoy()).slice(0, 7),
    wk = semana(e.hasta || e.desde || hoy());
  let n = 0,
    creados = 0,
    nombres = 0,
    nm = 0,
    menusNuevos = 0;
  enLote(() => {
    /* Primero los platos nuevos y los nombres del TPV, después las unidades */
    e.lineas.forEach((l) => {
      if (!(l.n > 0)) return;
      if (l.pid === '__nuevo') {
        const enM = enMenuSi(l),
          nb = nombreNuevo(l);
        const p = nPlato({ id: nuevoId('platos'), nombre: nb, pvp: enM ? 0 : l.precio, grupo: enM ? '' : e.grupoNuevo, area: areaNueva(), soloMenu: enM, alias: enM || norm(nb) === norm(l.art) ? [] : [l.art] });
        S.platos.push(p);
        guardar('platos', p, true);
        l.pid = p.id;
        creados++;
        return;
      }
      const p = plato(l.pid);
      if (!p || norm(p.nombre) === norm(l.art) || l.menu) return;
      let ch = false;
      if (l.renombrar) {
        if (!p.alias.some((a) => norm(a) === norm(p.nombre))) p.alias.push(p.nombre);
        p.nombre = bonito(l.art);
        ch = true;
      } else if (l.alias && !p.alias.some((a) => norm(a) === norm(l.art))) {
        p.alias.push(l.art);
        ch = true;
      }
      if (ch) {
        guardar('platos', p, true);
        nombres++;
      }
    });
    let v = S.ventas.filter((x) => x.id === mes)[0];
    if (!v) {
      v = nVenta({ id: mes });
      S.ventas.push(v);
    }
    const w = v.semanas[wk] || (v.semanas[wk] = {});
    e.lineas.forEach((l) => {
      if (!l.pid || l.pid === '__nuevo' || !(l.n > 0) || enMenuSi(l)) return;
      v.unidades[l.pid] = (Number(v.unidades[l.pid]) || 0) + l.n;
      w[l.pid] = (Number(w[l.pid]) || 0) + l.n;
      n += l.n;
    });
    /* Menús: se crean o completan, y se cuentan */
    const mLineas = [],
      mTot = [];
    (e.menus || []).forEach((m) => {
      if (m.ev === '__suelto') return;
      const ls = lineasMenu(m).filter((l) => l.pid && l.pid !== '__nuevo' && l.n > 0);
      if (!ls.length) return;
      let ev = S.eventos.find((x) => x.id === m.ev);
      if (!ev) {
        ev = nEvento({ id: nuevoId('eventos'), nombre: m.nombre, enCarta: true, opciones: true, platos: [] });
        S.eventos.push(ev);
        menusNuevos++;
      }
      ls.forEach((l) => {
        const x = ev.platos.find((y) => y.id === l.pid);
        if (!x) ev.platos.push({ id: l.pid, n: 1, tiempo: l.tiempo || '' });
        else if (!x.tiempo && l.tiempo) x.tiempo = l.tiempo;
      });
      if (ls.some((l) => l.tiempo)) ev.opciones = true;
      guardar('eventos', ev, true);
      const uds = {};
      ls.forEach((l) => {
        uds[l.pid] = (uds[l.pid] || 0) + l.n;
        mLineas.push([l.pid, l.n, ev.id]);
        v.enMenu[l.pid] = (Number(v.enMenu[l.pid]) || 0) + l.n;
      });
      const t = menusVendidos(ev, uds);
      if (t > 0) {
        mTot.push([ev.id, t]);
        v.menus[ev.id] = (Number(v.menus[ev.id]) || 0) + t;
        nm += t;
      }
    });
    v.importes.push({
      desde: e.desde,
      hasta: e.hasta,
      n: n,
      archivo: e.archivo,
      creado: new Date().toISOString(),
      por: miId || '',
      /* Detalle por plato de este informe: permite exportar un día o una semana concreta */
      lineas: e.lineas.filter((l) => l.pid && l.pid !== '__nuevo' && l.n > 0 && !enMenuSi(l)).map((l) => [l.pid, l.n]),
      /* Platos vendidos dentro de menús [plato, unidades, menú] y menús vendidos [menú, cuántos] */
      menuLineas: mLineas,
      menus: mTot,
    });
    guardar('ventas', v, true);
  });
  ventasImp = null;
  mesM = mes;
  sucio();
  vIng();
  toast(
    n + ' platos' + (nm ? ' y ' + nm + (nm === 1 ? ' menú' : ' menús') : '') + ' sumados a ' + fMes(mes).toLowerCase() +
      (menusNuevos ? '. ' + menusNuevos + (menusNuevos === 1 ? ' menú nuevo en Menús' : ' menús nuevos en Menús') : '') +
      (creados ? '. ' + creados + (creados === 1 ? ' plato nuevo en la carta' : ' platos nuevos en la carta') : '') +
      (nombres ? '. ' + nombres + (nombres === 1 ? ' nombre actualizado' : ' nombres actualizados') : '') + '.',
  );
}
/* Ventas importadas, por fechas: se pueden revisar una a una y quitar si se subieron mal o repetidas */
const firmaImp = (x) =>
  x.desde + '|' + x.hasta + '|' + (Array.isArray(x.lineas) ? x.lineas.map((l) => l.join(':')).sort().join(',') : 'n' + x.n) + '|' + (Array.isArray(x.menuLineas) ? x.menuLineas.map((l) => l.join(':')).sort().join(',') : '');
function importadasLista() {
  const l = [];
  S.ventas.forEach((v) => v.importes.forEach((x, i) => l.push({ v: v, x: x, i: i })));
  /* Repetida: mismas fechas y mismos platos que otra subida antes */
  const vistos = {};
  l.slice()
    .sort((a, z) => String(a.x.creado).localeCompare(String(z.x.creado)))
    .forEach((y) => {
      const f = firmaImp(y.x);
      y.repe = !!vistos[f];
      y.solapa = false;
      vistos[f] = 1;
    });
  l.forEach((y) => (y.solapa = !y.repe && l.some((o) => o !== y && o.x.desde <= y.x.hasta && o.x.hasta >= y.x.desde)));
  return l.sort((a, z) => String(z.x.hasta).localeCompare(String(a.x.hasta)) || String(z.x.creado).localeCompare(String(a.x.creado)));
}
let impVer = 10;
function importadasHTML() {
  const l = importadasLista();
  if (!l.length) return '';
  const nrep = l.filter((y) => y.repe).length,
    adm = puede(2);
  return (
    '<section class="card" id="ventas-imp"><h3>Ventas importadas (' + l.length + ')</h3><p class="hint">Cada informe queda guardado con sus fechas. Toca uno para ver qué platos sumó. Si uno se leyó mal o está repetido, quítalo: se restan sus platos de las ventas.</p>' +
    (nrep ? '<p class="aviso">Hay ' + nrep + (nrep === 1 ? ' informe repetido' : ' informes repetidos') + ' (mismas fechas y mismos platos que otro).' + (adm ? ' <button class="btn small" type="button" data-act="vimp-repes">Quitar los repetidos</button>' : '') + '</p>' : '') +
    '<div class="rows">' +
    l
      .slice(0, impVer)
      .map(
        (y) =>
          '<details class="vimp" data-vm="' + esc(y.v.id) + '" data-vi="' + y.i + '"><summary class="row"><span class="n"><b>' + esc(fRangoF(y.x.desde, y.x.hasta)) +
          (y.repe ? ' <span class="pill crit">Repetido</span>' : y.solapa ? ' <span class="pill warn">Fechas que se pisan</span>' : '') + '</b><span>' +
          esc((y.x.n || 0) + ' platos vendidos' + (y.x.archivo ? ' · ' + y.x.archivo : '') + (y.x.creado ? ' · subido el ' + fFecha(y.x.creado) : '') + (nombre(y.x.por) ? ' por ' + nombre(y.x.por) : '')) + '</span></span>' +
          (adm ? '<span class="d"><button class="btn small danger" type="button" data-act="vimp-quitar">Quitar</button></span>' : '') + '</summary>' +
          (Array.isArray(y.x.lineas) && y.x.lineas.length
            ? '<div class="tabla"><table class="nivel"><thead><tr><th>Plato</th><th>Unidades</th></tr></thead><tbody>' +
              y.x.lineas
                .slice()
                .sort((a, z) => z[1] - a[1])
                .map(([pid, n]) => '<tr><td>' + esc((plato(pid) || { nombre: '(plato borrado)' }).nombre) + '</td><td>' + fNum(n, 0) + '</td></tr>')
                .join('') +
              '</tbody></table></div>'
            : '<p class="hint">Este informe es de una versión antigua y no guardó el detalle por plato: al quitarlo solo se borra de la lista. Para corregir las unidades, usa «Borrar las ventas del mes».</p>') +
          '</details>',
      )
      .join('') +
    '</div>' +
    '<div class="acciones">' + (l.length > impVer ? '<button class="btn small" type="button" data-act="vimp-mas">Ver más (' + (l.length - impVer) + ' restantes)</button>' : '') +
    (impVer > 10 ? '<button class="btn small" type="button" data-act="vimp-menos">Ver menos</button>' : '') +
    (adm ? '<button class="link" type="button" data-act="vimp-mes" style="color:var(--crit)">Borrar todas las ventas de ' + esc(fMes(mesM).toLowerCase()) + '</button>' : '') +
    '</div></section>'
  );
}
function quitarImportacion(v, i, callado) {
  const x = v.importes[i];
  if (!x) return;
  if (!Array.isArray(x.lineas)) {
    v.importes.splice(i, 1);
    guardar('ventas', v, true);
    if (!callado) {
      vIng();
      toast('Informe quitado de la lista. Sus unidades no se pueden restar: revisa el mes.');
    }
    return;
  }
  const wk = semana(x.hasta || x.desde || hoy()),
    w = v.semanas[wk] || {};
  x.lineas.forEach(([pid, n]) => {
    v.unidades[pid] = Math.max(0, (Number(v.unidades[pid]) || 0) - n);
    if (!v.unidades[pid]) delete v.unidades[pid];
    w[pid] = Math.max(0, (Number(w[pid]) || 0) - n);
    if (!w[pid]) delete w[pid];
  });
  (x.menuLineas || []).forEach(([pid, n]) => {
    v.enMenu[pid] = Math.max(0, (Number(v.enMenu[pid]) || 0) - n);
    if (!v.enMenu[pid]) delete v.enMenu[pid];
  });
  (x.menus || []).forEach(([id, n]) => {
    v.menus[id] = Math.max(0, (Number(v.menus[id]) || 0) - n);
    if (!v.menus[id]) delete v.menus[id];
  });
  v.importes.splice(i, 1);
  guardar('ventas', v, true);
  sucio();
  if (callado) return;
  vIng();
  toast('Ventas del ' + fRangoF(x.desde, x.hasta) + ' quitadas: se restaron ' + (x.n || 0) + ' platos.');
}
function quitarRepetidos() {
  const rep = importadasLista().filter((y) => y.repe);
  /* De atrás hacia delante dentro de cada mes, para que no se muevan las posiciones */
  rep.sort((a, z) => z.i - a.i);
  enLote(() => rep.forEach((y) => quitarImportacion(y.v, y.i, true)));
  vIng();
  toast(rep.length + (rep.length === 1 ? ' informe repetido quitado.' : ' informes repetidos quitados.'));
}
function borrarVentasMes() {
  const v = S.ventas.find((x) => x.id === mesM);
  if (!v) return toast('No hay ventas en ' + fMes(mesM).toLowerCase() + '.');
  v.unidades = {};
  v.semanas = {};
  v.importes = [];
  v.menus = {};
  v.enMenu = {};
  guardar('ventas', v, true);
  sucio();
  vIng();
  toast('Ventas de ' + fMes(mesM).toLowerCase() + ' borradas. Vuelve a importar los informes buenos.');
}
/* «2026-S46» → «9 nov» (el lunes de esa semana) */
function lunesISO(k) {
  const m = /^(\d{4})-S(\d{2})$/.exec(k);
  if (!m) return k;
  const y = +m[1],
    s4 = new Date(Date.UTC(y, 0, 4)),
    lun = new Date(s4);
  lun.setUTCDate(s4.getUTCDate() - ((s4.getUTCDay() + 6) % 7) + (+m[2] - 1) * 7);
  return lun.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
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
    sm.map((w) => '<th title="Semana ' + esc(w.k.slice(6)) + '">' + esc(lunesISO(w.k)) + '</th>').join('') +
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
