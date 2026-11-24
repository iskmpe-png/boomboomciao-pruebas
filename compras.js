/* ---- Pedidos ---- */
function stockActual() {
  const v = abierto(false);
  if (v && Object.keys(v.cantidades).some((k) => v.cantidades[k] > 0))
    return { m: v.cantidades, txt: 'el conteo abierto del ' + fFecha(v.fecha) };
  const c = cerradosInv()[0];
  if (!c) return null;
  const m = {};
  c.lineas.forEach((l) => {
    const p = prodPorNombre(l.nombre);
    if (p) m[p.id] = l.cantidad;
  });
  return { m: m, txt: 'el inventario del ' + fFecha(c.fecha) };
}
function porPedir() {
  const s = stockActual();
  if (!s) return [];
  return S.productos
    .filter((p) => p.minimo > 0 && (Number(s.m[p.id]) || 0) < p.minimo)
    .map((p) => ({ p: p, stock: Number(s.m[p.id]) || 0, pedir: r3(p.minimo - (Number(s.m[p.id]) || 0)) }));
}
/* ---- Compras ---- */
let filCompra = ''; // proveedor elegido en el filtro
const miNombre = () => {
  const m = miembros.find((x) => x.user_id === miId);
  return (m && m.nombre) || nombre(miId) || '';
};
/* Nombres para «Recibido por»: el equipo y quien ya ha recibido antes */
function nombresEquipo() {
  const s = new Set();
  miembros.forEach((m) => m.nombre && s.add(m.nombre));
  S.compras.forEach((c) => c.recibe && s.add(c.recibe));
  return [...s].sort((a, z) => a.localeCompare(z, 'es'));
}
const ICO_CLIP =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6L15 7.3"/></svg>';
const importeLinea = (l) => r3(l.cantidad * l.precio);
function compraHTML(c) {
  const vivos = c.archivos.filter((a) => !a.borrado).length;
  return (
    '<details class="compra" data-id="' + esc(c.id) + '"><summary class="row"><span class="n"><b>' + esc(c.proveedor || 'Sin proveedor') + '</b><span>' +
    esc((c.albaran ? 'Nº ' + c.albaran + ' · ' : '') + (c.lineas.length ? c.lineas.length + (c.lineas.length === 1 ? ' producto' : ' productos') : 'sin desglose') + (c.recibe ? ' · recibió ' + c.recibe : '')) +
    '</span></span><span class="d"><b>' + fEur.format(c.importe) + '</b>' + (vivos ? '<span class="clip" title="Tiene prueba">' + ICO_CLIP + vivos + '</span>' : c.archivos.length ? '<span class="hint">archivado</span>' : '') + '</span></summary>' +
    '<div class="compra-d">' +
    (c.lineas.length
      ? '<div class="tabla"><table class="nivel"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Importe</th></tr></thead><tbody>' +
        c.lineas.map((l) => '<tr><td>' + esc(l.nombre) + '</td><td>' + fNum(l.cantidad, 3) + ' ' + UDI[l.unidad] + '</td><td>' + fEur.format(l.precio) + UDP[l.unidad].slice(1) + '</td><td>' + fEur.format(importeLinea(l)) + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td>Total sin IVA</td><td></td><td></td><td>' + fEur.format(c.importe) + '</td></tr></tfoot></table></div>'
      : '<p class="hint">Apuntada solo con el importe, sin productos.</p>') +
    (c.pendientes.length ? '<div class="rows">' + c.pendientes.map((x) => filaPend({ c: c, x: x }, false)).join('') + '</div>' : '') +
    cuadreHTML(c.proveedor, c.fecha, c.lineas, c.id) +
    '<p class="hint">' + esc(fFecha(c.fecha)) + (c.recibe ? ' · Recibió: ' + esc(c.recibe) : '') + (nombre(c.por) ? ' · Lo subió: ' + esc(nombre(c.por)) : '') + (c.creado ? ' · ' + esc(new Date(c.creado).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : '') + '</p>' +
    '<div class="acciones">' +
    c.archivos
      .map((a, k) =>
        a.borrado
          ? '<span class="pill">' + (a.tipo === 'foto' ? 'Foto' : a.tipo === 'pdf' ? 'PDF' : 'Excel') + ' archivada en el ZIP del mes</span>'
          : '<button class="btn small" type="button" data-act="arch-ver" data-k="' + k + '">' + ICO_CLIP + (a.tipo === 'foto' ? 'Foto ' : a.tipo === 'pdf' ? 'PDF ' : 'Excel ') + (k + 1) + (a.pendiente ? ' (sin subir)' : '') + '</button>',
      )
      .join('') +
    (puede(1) ? '<button class="btn small" type="button" data-act="arch-add">Añadir prueba</button>' : '') +
    (puede(2) || esMio(c) ? '<button class="btn small peligro" type="button" data-act="co-borrar"' + (esMio(c) ? ' data-mio="1"' : '') + '>Eliminar compra</button>' : '') +
    '</div></div></details>'
  );
}
function listaCompras() {
  const todas = delMes(S.compras),
    l = todas.filter((c) => !filCompra || c.proveedor === filCompra).sort((a, z) => z.fecha.localeCompare(a.fecha) || z.creado.localeCompare(a.creado)),
    total = suma(l, (c) => c.importe);
  $('c-total').textContent = fEur.format(total);
  $('c-n').textContent = l.length === 1 ? '1 albarán' : l.length + ' albaranes';
  /* Agrupadas por día, de la más reciente a la más antigua */
  let html = '',
    dia = '';
  l.slice(0, lim.compras).forEach((c) => {
    if (c.fecha !== dia) {
      dia = c.fecha;
      const del = l.filter((x) => x.fecha === dia);
      html += '<h3 class="grupoh dia">' + esc(fFechaLarga(dia)) + '<small>' + del.length + (del.length === 1 ? ' albarán · ' : ' albaranes · ') + fEur.format(suma(del, (x) => x.importe)) + '</small></h3>';
    }
    html += compraHTML(c);
  });
  $('lista-compras').innerHTML = l.length
    ? html + masHTML('compras', l.length)
    : '<p class="hint" style="padding:10px 0">Sin compras apuntadas en ' + esc(fMes(mesM).toLowerCase()) + (filCompra ? ' de ' + esc(filCompra) : '') + '.</p>';
  const pm = {};
  todas.forEach((c) => {
    const k = c.proveedor || 'Sin proveedor';
    pm[k] = (pm[k] || 0) + c.importe;
  });
  const tt = suma(todas, (c) => c.importe),
    ks = Object.keys(pm).sort((a, z) => pm[z] - pm[a]);
  $('c-prov').innerHTML = ks.length
    ? ks
        .map((k) => {
          const pct = tt > 0 ? (pm[k] / tt) * 100 : 0;
          return '<div class="fila-barra"><span>' + esc(k) + '</span><span class="v">' + fNum(pct, 0) + ' % · ' + fEur.format(pm[k]) + '</span><span class="pista"><i style="width:' + pct + '%"></i></span></div>';
        })
        .join('')
    : '<p class="hint">Aquí verás cuánto gastas con cada proveedor.</p>';
  archivoHTML();
}
const fFechaLarga = (f) => {
  const d = new Date(f + 'T12:00:00'),
    t = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
/* Tarjeta del archivo de albaranes: plazo, ZIP por mes y aviso de lo que va a caducar */
function archivoHTML() {
  const el = $('c-arch');
  if (!el) return;
  const m = mesesConArchivos(),
    ks = Object.keys(m).sort().reverse(),
    lim = Date.now() - diasArchivo() * 864e5,
    sinZip = ks.filter((k) => S.ajustes.archivados.indexOf(k) < 0 && S.compras.some((c) => c.fecha.slice(0, 7) === k && c.archivos.some((a) => !a.borrado && new Date(a.subido).getTime() < lim)));
  el.innerHTML =
    '<p class="hint">Cada foto, PDF o Excel queda guardado ' + diasArchivo() + ' días. Antes de que se borre, descarga el ZIP del mes y guárdalo en tu Drive o en el correo: lleva todos los albaranes y un Excel con el detalle.</p>' +
    (sinZip.length ? '<p class="aviso">Hay albaranes de ' + sinZip.map((k) => fMes(k).toLowerCase()).join(', ') + ' con más de ' + diasArchivo() + ' días sin descargar. No se borran hasta que descargues su ZIP.</p>' : '') +
    (ks.length
      ? '<div class="rows">' +
        ks
          .map(
            (k) =>
              '<div class="row"><span class="n"><b>' + esc(fMes(k)) + '</b><span>' + m[k].n + (m[k].n === 1 ? ' archivo · ' : ' archivos · ') + fKB(m[k].bytes) + (S.ajustes.archivados.indexOf(k) >= 0 ? ' · ZIP descargado' : '') + '</span></span>' +
              '<span class="d"><button class="btn small" type="button" data-act="arch-zip" data-m="' + k + '">Descargar ZIP</button></span></div>',
          )
          .join('') +
        '</div>'
      : '<p class="hint">Todavía no hay albaranes con foto o documento.</p>') +
    '<p class="hint" id="arch-esp">' + (espacioArch ? 'En la nube: ' + espacioArch.n + ' archivos · ' + fKB(espacioArch.bytes) : '') + '</p>';
}
function vCompras() {
  $('dl-equipo').innerHTML = nombresEquipo().map((n) => '<option value="' + esc(n) + '"></option>').join('');
  if (escaneo) {
    $('vista').innerHTML = vEscaneo();
    return;
  }
  const provs = [...new Set(delMes(S.compras).map((c) => c.proveedor).filter(Boolean))].sort((a, z) => a.localeCompare(z, 'es'));
  if (filCompra && provs.indexOf(filCompra) < 0) filCompra = '';
  $('vista').innerHTML =
    '<div class="bar">' +
    mesHTML() +
    '<div class="resumen"><b class="g" id="c-total"></b><span id="c-n"></span></div>' +
    (sLim && sLim.images ? '<button class="btn primary" type="button" data-act="escanear">Leer albarán (foto o PDF)</button>' : '') +
    expHTML() +
    '</div>' +
    pendientesHTML() +
    avisoKgLHTML() +
    '<div class="dos"><div class="col"><section class="card"><details class="nueva-compra"><summary>Apuntar una compra a mano</summary><form id="form-compra" class="editor m6" style="margin:0" novalidate>' +
    '<div class="field"><label for="co-fecha">Fecha</label><input id="co-fecha" type="date" value="' + hoy() + '"></div><div class="field"><label for="co-prov">Proveedor</label><input id="co-prov" type="text" list="dl-proveedores" autocomplete="off"></div>' +
    '<div class="field"><label for="co-alb">Nº de albarán</label><input id="co-alb" type="text" autocomplete="off" placeholder="opcional"></div><div class="field"><label for="co-imp">Importe sin IVA €</label><input class="num" id="co-imp" type="text" inputmode="decimal" placeholder="0,00"></div>' +
    '<div class="field"><label for="co-rec">Recibido por *</label><input id="co-rec" type="text" list="dl-equipo" autocomplete="off" value="' + esc(miNombre()) + '"></div>' +
    '<div class="field"><label for="co-arch">Foto o documento</label><input id="co-arch" type="file" accept="image/*,.pdf,.xlsx,.xls,.csv" multiple></div>' +
    '<button class="btn primary full" type="submit">Apuntar compra</button><span class="hint full" id="co-msg" aria-live="polite"></span></form></details></section>' +
    '<section class="card">' +
    (provs.length > 1
      ? '<div class="field"><label for="f-cprov">Proveedor</label><select id="f-cprov"><option value="">Todos</option>' + provs.map((p) => '<option' + (p === filCompra ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select></div>'
      : '') +
    '<div class="rows" id="lista-compras"></div></section></div>' +
    '<div class="col"><section class="card"><h3>Por proveedor</h3><div class="barras" id="c-prov"></div></section><section class="card"><h3>Archivo de albaranes</h3><div id="c-arch"></div></section></div></div>';
  listaCompras();
  repasarFormatos();
  cargarEspacio();
  subirPendientes();
  /* Unos segundos después, con todos los datos ya cargados */
  setTimeout(limpiarArchivo, 4000);
}
/* Guarda las pruebas elegidas en una compra ya creada */
async function adjuntarA(c, files) {
  toast('Guardando ' + (files.length === 1 ? 'el archivo' : files.length + ' archivos') + '…');
  const base = c.archivos.length;
  /* Se preparan y se suben de 3 en 3: con varias fotos va mucho más rápido */
  const res = await enParalelo(
    files,
    async (f, k) => {
      try {
        return await subirArchivo(c, base + k, await prepararArchivo(f));
      } catch (e) {
        toast(e.message);
        return null;
      }
    },
    3,
  );
  const ok = res.filter(Boolean);
  if (!ok.length) return 0;
  ok.forEach((f) => c.archivos.push(f));
  guardar('compras', c, true);
  return ok.length;
}
