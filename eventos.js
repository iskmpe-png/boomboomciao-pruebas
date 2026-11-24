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
  const acc = {},
    t = e.opciones ? tiemposMenu(e) : null;
  e.platos.forEach((x) => {
    const p = idx().pl.get(x.id),
      /* Con opciones, los comensales se reparten a partes iguales entre las opciones de cada tiempo */
      rep = t ? t[tmpo(x) || T_SOLO + x.id].length : 1;
    if (p) explotar(p, (x.n * (e.pax || 0)) / rep, acc, 0);
  });
  return Object.keys(acc)
    .map((k) => acc[k])
    .sort((a, z) => (a.prov || 'zzz').localeCompare(z.prov || 'zzz', 'es') || a.n.localeCompare(z.n, 'es'));
}
const costeEv = costeMenu;
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
    (e.precio > 0 && c > 0 ? '<span>margen ' + fEur.format(neto - c) + ' por persona</span>' : '') +
    (c > 0 ? '<span>recomendado ' + fEur.format((c / 0.3) * 1.1) + '</span>' : '') +
    (e.opciones && costeMenuMax(e) > c + 0.005 ? '<span>si todos eligen lo más caro: ' + fEur.format(costeMenuMax(e)) + (e.precio > 0 ? ' (' + fNum((costeMenuMax(e) / neto) * 100) + ' %)' : '') + '</span>' : '');
  e.platos.forEach((x, k) => {
    const o = q($('ev-lineas'), '[data-k="' + k + '"] [data-out="c"]'),
      p = idx().pl.get(x.id);
    if (o && p) o.innerHTML = fEur.format(x.n * costeUd(p)) + (c > 0 && !e.opciones ? '<small>' + fNum(((x.n * costeUd(p)) / c) * 100, 0) + ' % del menú</small>' : '');
  });
  if ($('ev-niv')) $('ev-niv').innerHTML = nivelHTML(e);
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
function evPill(e) {
  const fc = fcMenu(e);
  return fc == null ? '<span class="pill">Sin precio</span>' : '<span class="pill ' + (fc <= 30 ? 'ok' : fc <= 35 ? 'warn' : 'crit') + '">' + fNum(fc) + ' %</span>';
}
/* Lo que marcaría el plato vendido suelto, para comparar con el menú */
const evSuelto = (p) => {
  const fc = p ? fcDe(p) : null;
  return fc == null ? '' : ' · suelto ' + fNum(fc) + ' %';
};
function vEventos() {
  const e = evento();
  if (!e) {
    evId = null;
    $('vista').innerHTML =
      '<div class="bar"><span class="hint grow">Junta varios platos, pon el precio por persona y verás el food cost del menú entero. Para crear uno rápido: en Platos, «Más › Seleccionar varios», marca los platos y «Crear un menú con ellos».</span><button class="btn primary" type="button" data-act="ev-nuevo">Nuevo</button>' +
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
                esc(x.nombre || 'Menú sin nombre') +
                '</b><span>' +
                resumenMenu(x) +
                (x.precio > 0 ? ' · ' + fEur.format(x.precio) + ' por persona' : '') +
                '</span></span><span class="d"><b>' +
                fEur.format(costeEv(x)) +
                '</b>' + evPill(x) + '</span></button>',
            )
            .join('') +
          '</div></section>'
        : vacio(
            'Aún no hay menús',
            'Crea uno (por ejemplo «Menú Nochevieja»), elige sus platos y el precio por persona: tendrás el food cost del menú entero, el precio recomendado y la lista de la compra.',
            '',
          ));
    return;
  }
  $('vista').innerHTML =
    '<div class="bar"><button class="btn" type="button" data-act="ev-volver">← Menús</button><div class="resumen" id="ev-out" aria-live="polite"></div>' +
    expHTML() +
    '</div>' +
    '<div class="dos"><div class="col"><section class="card"><div class="ficha"><div class="field wide"><label for="ev-nombre">Nombre</label><input id="ev-nombre" data-ev="nombre" type="text" autocomplete="off" placeholder="Ej. Cena de empresa" value="' +
    esc(e.nombre) +
    '"></div>' +
    '<div class="field"><label for="ev-pax">Comensales (para la compra)</label><input class="num" id="ev-pax" data-ev="pax" type="text" inputmode="numeric" value="' +
    esc(show(e.pax)) +
    '"></div><div class="field"><label for="ev-precio">Precio por persona €</label><input class="num" id="ev-precio" data-ev="precio" type="text" inputmode="decimal" placeholder="con IVA" value="' +
    esc(show(e.precio)) +
    '"></div>' +
    '<label class="check wide" for="ev-encarta"><input type="checkbox" id="ev-encarta"' + (e.enCarta ? ' checked' : '') + '> Mostrar en la carta con su precio por persona</label>' +
    '<label class="check wide" for="ev-opc"><input type="checkbox" id="ev-opc"' + (e.opciones ? ' checked' : '') + '> Menú con opciones: cada cliente elige 1 plato de cada tiempo (entrante, principal, postre…)</label></div></section>' +
    '<section class="card"><h3>' + (e.opciones ? 'Opciones del menú' : 'Platos del menú') + '</h3>' +
    (e.opciones ? '<p class="hint">Pon a cada plato su tiempo. El coste por persona es la media de las opciones de cada tiempo, no la suma de todo.</p>' : '') +
    '<div class="rows" id="ev-lineas">' +
    ordenLineasMenu(e)
      .map(([x, k], j, arr) => {
        const p = idx().pl.get(x.id),
          tk = tmpo(x),
          cab = e.opciones && (!j || tmpo(arr[j - 1][0]) !== tk);
        return (
          (cab ? '<h4 class="ev-tiempo">' + esc(tk || 'Sin tiempo') + (tk ? ' <span class="hint">· elige 1 de ' + arr.filter((y) => tmpo(y[0]) === tk).length + '</span>' : ' <span class="hint">· van siempre en el menú</span>') + '</h4>' : '') +
          '<div class="row invrow" data-k="' +
          k +
          '"><div class="n"><b>' +
          esc(p ? p.nombre : 'Plato eliminado') +
          '</b><span>raciones por persona' + evSuelto(p) + '</span>' +
          (e.opciones ? '<label class="mini ev-t"><span>Tiempo</span><input type="text" list="dl-tiempos" data-evt="' + k + '" value="' + esc(x.tiempo) + '" placeholder="Entrante, Principal, Postre…" autocomplete="off"></label>' : '') +
          (p && !p.base ? '<label class="check ev-solo"><input type="checkbox" data-evsolo="' + k + '"' + (p.soloMenu ? ' checked' : '') + '> Solo en menú</label>' : '') +
          (p ? ingsMenuHTML(p, x.n) : '') +
          '</div><div class="q"><input class="num" data-evn="' +
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
    '<div class="col"><section class="card"><h3>Food cost nivelado</h3><div id="ev-niv"></div></section><section class="card"><h3>Lista de la compra</h3><div id="ev-compra"></div><div class="acciones"><a class="btn primary small" id="ev-wa" target="_blank" rel="noopener">Enviar por WhatsApp</a><button class="btn danger small" type="button" data-act="ev-borrar">Eliminar menú</button></div></section></div></div>';
  calcEv();
}
/* Resumen corto de un menú: «3 platos» o «3 tiempos · 7 opciones» */
function resumenMenu(e) {
  if (!e.opciones) return e.platos.length + (e.platos.length === 1 ? ' plato' : ' platos');
  const n = Object.keys(tiemposMenu(e)).length;
  return n + (n === 1 ? ' tiempo' : ' tiempos') + ' · ' + e.platos.length + (e.platos.length === 1 ? ' opción' : ' opciones');
}
/* Con opciones, las líneas se enseñan agrupadas por tiempo (en el orden en que aparece cada tiempo) */
function ordenLineasMenu(e) {
  const l = e.platos.map((x, k) => [x, k]);
  if (!e.opciones) return l;
  const orden = [];
  e.platos.forEach((x) => {
    const t = tmpo(x);
    if (orden.indexOf(t) < 0) orden.push(t);
  });
  const pos = (t) => (t ? orden.indexOf(t) : 1e6);
  return l.sort((a, z) => pos(tmpo(a[0])) - pos(tmpo(z[0])) || a[1] - z[1]);
}
