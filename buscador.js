/* ---- Buscador general: platos, productos, proveedores, compras, manual y apartados ---- */
function buscarTodo(texto) {
  const f = norm(texto),
    out = [];
  if (f.length < 2) return out;
  const tiene = (s) => norm(s).indexOf(f) >= 0,
    add = (grupo, lista) => {
      if (lista.length) out.push({ grupo, lista: lista.slice(0, 6), total: lista.length });
    };
  add('Apartados', Object.keys(SUBS).reduce((l, s) => l.concat(SUBS[s].filter((x) => tiene(x[1])).map((x) => ({ t: x[1], d: SECN[s], h: '#' + s + '-' + x[0] }))), []));
  add('Platos y elaboraciones', ordenados(S.platos).filter((p) => tiene(p.nombre)).map((p) => ({ t: p.nombre, d: grupoDe(p) + (p.pvp > 0 ? ' · ' + fEur.format(p.pvp) : ''), plato: p.id })));
  add('Productos', ordenados(S.productos).filter((p) => tiene(p.nombre)).map((p) => ({ t: p.nombre, d: (p.proveedor || 'Sin proveedor') + ' · ' + fEur.format(p.precio) + UDP[p.unidad].slice(1), prod: p.nombre })));
  add('Proveedores', nombresProv().filter(tiene).map((n) => ({ t: n, d: 'Ver sus productos', prov: n })));
  add('Compras', S.compras.filter((c) => tiene(c.proveedor + ' ' + (c.albaran || ''))).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).map((c) => ({ t: c.proveedor + (c.albaran ? ' · ' + c.albaran : ''), d: fFecha(c.fecha) + ' · ' + fEur.format(c.importe), h: '#almacen-compras', mes: c.fecha.slice(0, 7) })));
  add('Manual de la casa', ordenadosManual().filter((m) => tiene(m.titulo + ' ' + m.texto)).map((m) => ({ t: m.titulo, d: m.texto.replace(/\s+/g, ' ').slice(0, 70), manual: m.titulo })));
  return out;
}
let busRes = [];
function pintarBusqueda() {
  const r = buscarTodo($('bus-q').value);
  busRes = [];
  $('bus-r').innerHTML = r.length
    ? r.map((g) => '<h3>' + g.grupo + (g.total > g.lista.length ? ' <small>' + g.lista.length + ' de ' + g.total + '</small>' : '') + '</h3>' +
        g.lista.map((x) => { busRes.push(x); return '<button class="bus-it" type="button" data-bus="' + (busRes.length - 1) + '"><b>' + esc(x.t) + '</b><small>' + esc(x.d) + '</small></button>'; }).join('')).join('')
    : '<p class="hint" style="padding:12px 0">' + ($('bus-q').value.trim().length < 2 ? 'Escribe al menos dos letras: busca en platos, productos, proveedores, compras y el manual.' : 'Nada coincide con «' + esc($('bus-q').value.trim()) + '».') + '</p>';
}
function abrirBuscador() {
  capa('<div class="mx-top"><div class="field grow"><label for="bus-q">Buscar en toda la app</label><input id="bus-q" type="search" autocomplete="off" placeholder="Plato, producto, proveedor…"></div><button class="btn" type="button" data-capa="cerrar">Cerrar</button></div><div class="mx-lista bus" id="bus-r"></div>');
  pintarBusqueda();
  $('bus-q').focus({ preventScroll: true });
}
function irResultado(x) {
  cerrarCapa();
  if (x.plato) {
    abrirPlato(x.plato);
    return;
  }
  if (x.prod != null || x.prov != null) {
    fil.precios = x.prod || '';
    prov = x.prov && proveedores().indexOf(x.prov) >= 0 ? x.prov : '';
    if (x.prov && !prov) {
      location.hash = '#almacen-proveedores';
      return;
    }
    if (location.hash === '#precios-productos') pintar();
    else location.hash = '#precios-productos';
    return;
  }
  if (x.manual != null) {
    manF = x.manual;
    if (location.hash === '#inicio-manual') pintar();
    else location.hash = '#inicio-manual';
    return;
  }
  if (x.mes) mesM = x.mes;
  if (location.hash === x.h) pintar();
  else location.hash = x.h;
}
$('btn-buscar').addEventListener('click', abrirBuscador);
let tBus;
$('capa').addEventListener('input', (e) => {
  if (e.target.id !== 'bus-q') return;
  clearTimeout(tBus);
  tBus = setTimeout(pintarBusqueda, 120);
});
$('capa').addEventListener('click', (e) => {
  const b = e.target.closest('[data-bus]');
  if (b && busRes[Number(b.dataset.bus)]) irResultado(busRes[Number(b.dataset.bus)]);
});
$('capa').addEventListener('keydown', (e) => {
  if (e.target.id === 'bus-q' && e.key === 'Enter' && busRes[0]) irResultado(busRes[0]);
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if ($('acceso').hidden) abrirBuscador();
  }
});
