/* ---- Inventario ---- */
function filaInv(p, v) {
  const c = v ? Number(v.cantidades[p.id]) || 0 : 0;
  return (
    '<div class="row invrow" data-id="' +
    esc(p.id) +
    '"><div class="n"><b>' +
    esc(p.nombre) +
    '</b><span>' +
    esc((p.proveedor ? p.proveedor + ' · ' : '') + fEur.format(p.precio) + ' ' + UDP[p.unidad].slice(1)) +
    '</span></div>' +
    '<div class="q"><input class="num" data-c="cantidad" type="text" inputmode="decimal" aria-label="Cantidad de ' +
    esc(p.nombre) +
    '" placeholder="0" value="' +
    esc(show(c)) +
    '"><span>' +
    UDI[p.unidad] +
    '</span></div>' +
    '<div class="v" data-out="valor">' +
    (c ? fEur.format(c * p.precio) : '') +
    '</div></div>'
  );
}
function listaInv() {
  const v = abierto(false);
  let l = filtradosProd('inv');
  if (!norm(fil.inv) && v)
    l = l.filter((p) => v.cantidades[p.id] > 0).concat(l.filter((p) => !(v.cantidades[p.id] > 0)));
  $('lista-inv').innerHTML = l.length
    ? l
        .slice(0, lim.inv)
        .map((p) => filaInv(p, v))
        .join('') + masHTML('inv', l.length)
    : '<p class="hint" style="padding:10px 0">Ningún producto coincide.</p>';
}
function calcInv() {
  if (!$('inv-total')) return null;
  const v = abierto(false);
  let total = 0,
    n = 0;
  if (v)
    S.productos.forEach((p) => {
      const c = Number(v.cantidades[p.id]) || 0;
      if (c > 0) {
        total += c * p.precio;
        n++;
      }
    });
  $('inv-total').textContent = fEur.format(total);
  $('inv-n').textContent = n === 1 ? '1 producto contado' : n + ' productos contados';
  return { total: total, n: n };
}
const cerradosInv = () => S.inventarios.filter((x) => x.cerrado).sort((a, z) => z.fecha.localeCompare(a.fecha));
function proximo() {
  const c = cerradosInv()[0];
  if (!c) return 'Aún no has cerrado ningún conteo.';
  const d = new Date(c.fecha + 'T12:00:00'),
    per = S.ajustes.periodo;
  if (per === 'diario') d.setDate(d.getDate() + 1);
  else if (per === 'quincenal') d.setDate(d.getDate() + 15);
  else d.setMonth(d.getMonth() + 1);
  const f = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  return 'Último: ' + fFecha(c.fecha) + ' · próximo: ' + fFecha(f) + (f <= hoy() ? ' (toca ya)' : '');
}
function vInventario() {
  if (!S.productos.length) {
    $('vista').innerHTML = vacio(
      'Primero añade tus productos',
      'El inventario se cuenta sobre la lista de Precios.',
      '<a class="btn primary" href="#precios">Ir a Precios</a>',
    );
    return;
  }
  const v = abierto(false),
    cer = cerradosInv();
  const seg =
    '<div class="seg" role="group" aria-label="Vista del inventario"><button type="button" data-act="inv-sub" data-v="conteo" aria-pressed="' +
    (invSub === 'conteo') +
    '">Conteo</button><button type="button" data-act="inv-sub" data-v="hist" aria-pressed="' +
    (invSub === 'hist') +
    '">Historial</button></div>';
  if (invSub === 'hist') {
    $('vista').innerHTML =
      '<div class="bar">' +
      seg +
      '<span class="grow"></span>' +
      expHTML() +
      '</div><section class="card"><div class="rows">' +
      (cer.length
        ? cer
            .map(
              (c) =>
                '<div class="row" data-id="' +
                esc(c.id) +
                '"><div class="n"><b>' +
                esc(fFecha(c.fecha)) +
                '</b><span>' +
                esc(PER[c.periodo]) +
                ' · ' +
                c.lineas.length +
                (c.lineas.length === 1 ? ' producto' : ' productos') +
                '</span></div><div class="d"><b>' +
                fEur.format(c.total) +
                '</b><button class="link" type="button" data-act="borrar-inv" style="color:var(--crit)">Eliminar</button></div></div>',
            )
            .join('')
        : '<p class="hint">Aquí verás los conteos cerrados, con su fecha y el valor del stock.</p>') +
      '</div></section>';
    return;
  }
  $('vista').innerHTML =
    '<div class="bar">' +
    seg +
    '<div class="resumen"><b class="g" id="inv-total"></b><span id="inv-n"></span></div><button class="btn primary" type="button" data-act="cerrar-inv">Cerrar conteo</button>' +
    expHTML() +
    '</div>' +
    '<section class="card"><div class="ficha"><div class="field"><label for="inv-fecha">Fecha</label><input id="inv-fecha" type="date" value="' +
    esc(v ? v.fecha : hoy()) +
    '"></div>' +
    '<div class="field"><label for="inv-per">Frecuencia</label><select id="inv-per">' +
    Object.keys(PER)
      .map(
        (k) => '<option value="' + k + '"' + (k === S.ajustes.periodo ? ' selected' : '') + '>' + PER[k] + '</option>',
      )
      .join('') +
    '</select></div>' +
    '<div class="field wide"><label for="b-inv">Buscar producto</label><input id="b-inv" type="search" data-buscar="inv" autocomplete="off" value="' +
    esc(fil.inv) +
    '"></div></div>' +
    '<p class="hint" id="inv-cierre" aria-live="polite">' +
    esc(proximo()) +
    '</p>' +
    dictadoHTML('inv-dictado', 'sumar-inv', 'Cada dictado se suma a lo que ya llevas contado.') +
    '<div class="rows" id="lista-inv"></div></section>';
  listaInv();
  calcInv();
}
function inputInventario(e) {
  const t = e.target,
    f = t.closest('.invrow');
  if (!f || t.dataset.c !== 'cantidad') return;
  const p = prod(f.dataset.id);
  if (!p) return;
  const v = abierto(true),
    c = parse(t.value);
  if (c > 0) v.cantidades[p.id] = c;
  else delete v.cantidades[p.id];
  q(f, '[data-out="valor"]').textContent = c ? fEur.format(c * p.precio) : '';
  calcInv();
  guardar('inventarios', v);
}
function cerrarInv() {
  const v = abierto(false),
    r = calcInv();
  if (!v || !r || !r.n) {
    $('inv-cierre').textContent = 'Cuenta al menos un producto antes de cerrar.';
    return;
  }
  v.lineas = [];
  S.productos.forEach((p) => {
    const c = Number(v.cantidades[p.id]) || 0;
    if (c > 0)
      v.lineas.push({ nombre: p.nombre, proveedor: p.proveedor, cantidad: c, unidad: p.unidad, precio: p.precio });
  });
  v.total = Math.round(r.total * 100) / 100;
  v.periodo = S.ajustes.periodo;
  v.cerrado = true;
  v.por = miId || '';
  guardar('inventarios', v, true);
  invSub = 'hist';
  vInventario();
  toast('Conteo guardado en el historial');
}
