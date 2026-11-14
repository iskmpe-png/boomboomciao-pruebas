/* ---- Escáner de albaranes ---- */
let escaneo = null;
async function escanear() {
  if (!sAPI || !sLim || !sLim.images) {
    toast('Desde aquí no se pueden leer fotos con la IA.');
    return;
  }
  const fs = (
    await pedirArchivo((sLim.images.mediaTypes || ['image/jpeg', 'image/png']).join(',') + ',image/*', true)
  ).slice(0, Math.min(4, sLim.images.maxCount || 1));
  if (!fs.length) return;
  escaneo = { estado: 'leyendo', n: fs.length };
  vCompras();
  try {
    const imgs = await Promise.all(fs.map((f) => reducir(f, 2000)));
    const pr =
      'Estas ' +
      imgs.length +
      ' imágenes son las páginas de UN albarán o factura de proveedor de un restaurante en España. Extrae los datos y responde SOLO con JSON con esta forma exacta:\n' +
      '{"proveedor":"nombre comercial del proveedor","fecha":"AAAA-MM-DD","albaran":"número de albarán o factura","base_imponible":número sin IVA o null,"total":número con IVA o null,"lineas":[{"descripcion":"texto de la línea tal cual","producto":"nombre EXACTO de la lista de productos si es claramente el mismo producto, si no \\"\\"","cantidad":número,"unidad":"kg"|"l"|"ud","precio":precio por kg, litro o unidad SIN IVA,"importe":importe de la línea sin IVA}]}\n' +
      'Reglas: números con punto decimal. Si la línea viene en cajas o formatos, convierte a kg, litros o unidades cuando el albarán lo indique; si no, usa "ud". Si un dato no se lee, pon null. No inventes líneas.\n' +
      'Proveedores conocidos: ' +
      proveedores().join(', ') +
      '\nProductos conocidos: ' +
      S.productos.map((p) => p.nombre + (p.proveedor ? ' (' + p.proveedor + ')' : '')).join('; ');
    const d = await sAPI.json(pr, { images: imgs, cache: false });
    const prov = String((d && d.proveedor) || '').trim(),
      pvx = proveedores().filter((x) => norm(x) === norm(prov))[0] || prov;
    const lineas = (Array.isArray(d && d.lineas) ? d.lineas : []).map((l) => {
      const u = ['kg', 'l', 'ud'].indexOf(l.unidad) >= 0 ? l.unidad : 'ud',
        c = Number(l.cantidad) || 0;
      let pr = Number(l.precio) || 0;
      const im = Number(l.importe) || 0;
      if (!pr && im && c) pr = im / c;
      const p = prodPorNombre(l.producto) || buscarProv(l.descripcion || '', pvx);
      return {
        desc: String(l.descripcion || ''),
        nombre: p ? p.nombre : String(l.descripcion || ''),
        pid: p ? p.id : '',
        cantidad: c,
        unidad: p && p.unidad === u ? u : u,
        precio: r3(pr),
        importe: im,
      };
    });
    lineas.forEach((l) => {
      const p = prod(l.pid);
      l.act = !!(
        p &&
        puede(2) &&
        p.unidad === l.unidad &&
        l.precio > 0 &&
        Math.abs(p.precio - l.precio) >= 0.005 &&
        (!p.proveedor || !pvx || norm(p.proveedor) === norm(pvx))
      );
      l.nuevo = false;
    });
    const fe = /^\d{4}-\d{2}-\d{2}$/.test((d && d.fecha) || '') ? d.fecha : hoy();
    escaneo = {
      estado: 'revisar',
      proveedor: pvx,
      fecha: fe,
      albaran: String((d && d.albaran) || ''),
      importe: r3(Number(d && d.base_imponible) || suma(lineas, (l) => l.importe) || 0),
      total: Number(d && d.total) || 0,
      lineas: lineas,
    };
  } catch (e) {
    escaneo = { estado: 'error', msg: errIA(e) };
  }
  if (pant === 'compras') vCompras();
}
function notaLinea(l) {
  const p = prod(l.pid);
  if (!p)
    return puede(2) && l.nombre.trim()
      ? '<label class="check"><input type="checkbox" data-sc="nuevo"' +
          (l.nuevo ? ' checked' : '') +
          '> No está en Precios: crearlo</label>'
      : '<span class="hint">No está en Precios</span>';
  const otro = p.proveedor && escaneo.proveedor && norm(p.proveedor) !== norm(escaneo.proveedor),
    dif = l.precio > 0 && Math.abs(p.precio - l.precio) >= 0.005;
  if (p.unidad !== l.unidad)
    return '<span class="hint">En Precios va en ' + UDP[p.unidad] + ': revisa la unidad antes de actualizar.</span>';
  if (!dif) return '<span class="hint">Mismo precio que en Precios.</span>';
  return (
    (puede(2)
      ? '<label class="check"><input type="checkbox" data-sc="act"' +
        (l.act ? ' checked' : '') +
        '> Actualizar precio: ' +
        fEur.format(p.precio) +
        ' → ' +
        fEur.format(l.precio) +
        '</label>'
      : '<span class="hint">Precio distinto (' + fEur.format(p.precio) + ' en Precios). Avísale al encargado.</span>') +
    (otro ? '<span class="hint" style="color:var(--warn)">Ojo: en Precios es de ' + esc(p.proveedor) + '.</span>' : '')
  );
}
function vEscaneo() {
  const e = escaneo;
  if (e.estado === 'leyendo')
    return (
      '<section class="card estado"><strong>Leyendo el albarán…</strong><span>' +
      e.n +
      (e.n === 1 ? ' foto' : ' fotos') +
      '. Tarda unos segundos.</span></section>'
    );
  if (e.estado === 'error')
    return (
      '<section class="card estado"><strong>No se pudo leer</strong><span>' +
      esc(e.msg) +
      '</span><div class="acciones"><button class="btn primary" type="button" data-act="escanear">Probar otra foto</button><button class="btn" type="button" data-act="sc-cancelar">Cancelar</button></div></section>'
    );
  return (
    '<form id="form-scan" class="col" novalidate><section class="card"><h2>Revisa el albarán</h2><p class="hint">Comprueba lo que leyó la IA antes de guardar. Puedes corregir cualquier dato.</p>' +
    '<div class="ficha"><div class="field"><label for="sc-prov">Proveedor</label><input id="sc-prov" data-scg="proveedor" type="text" list="dl-proveedores" autocomplete="off" value="' +
    esc(e.proveedor) +
    '"></div>' +
    '<div class="field"><label for="sc-fecha">Fecha</label><input id="sc-fecha" data-scg="fecha" type="date" value="' +
    esc(e.fecha) +
    '"></div>' +
    '<div class="field"><label for="sc-alb">Nº de albarán</label><input id="sc-alb" data-scg="albaran" type="text" autocomplete="off" value="' +
    esc(e.albaran) +
    '"></div>' +
    '<div class="field"><label for="sc-imp">Importe sin IVA €</label><input class="num" id="sc-imp" data-scg="importe" type="text" inputmode="decimal" value="' +
    esc(show(e.importe)) +
    '"></div></div>' +
    (e.total ? '<p class="hint">Total con IVA en el albarán: ' + fEur.format(e.total) + '</p>' : '') +
    '</section>' +
    '<section class="card"><h3>' +
    e.lineas.length +
    (e.lineas.length === 1 ? ' línea' : ' líneas') +
    '</h3><div class="rows">' +
    e.lineas
      .map(
        (l, k) =>
          '<div class="sc-l" data-k="' +
          k +
          '"><span class="hint">' +
          esc(l.desc) +
          '</span><div class="sc-g"><div class="field"><label for="scn-' +
          k +
          '">Producto</label><input id="scn-' +
          k +
          '" data-sl="nombre" type="text" list="dl-solo-prod" autocomplete="off" value="' +
          esc(l.nombre) +
          '"></div>' +
          '<div class="field"><label for="scc-' +
          k +
          '">Cantidad</label><input class="num" id="scc-' +
          k +
          '" data-sl="cantidad" type="text" inputmode="decimal" value="' +
          esc(show(l.cantidad)) +
          '"></div>' +
          '<div class="field"><label for="scp-' +
          k +
          '">Precio</label><div class="precio"><input class="num" id="scp-' +
          k +
          '" data-sl="precio" type="text" inputmode="decimal" value="' +
          esc(show(l.precio)) +
          '"><select data-sl="unidad" aria-label="Unidad">' +
          ['kg', 'l', 'ud']
            .map((x) => '<option value="' + x + '"' + (x === l.unidad ? ' selected' : '') + '>' + UDP[x] + '</option>')
            .join('') +
          '</select></div></div>' +
          '<button class="icon" type="button" data-act="sc-quitar" aria-label="Quitar línea">×</button></div><div class="sc-n" data-out="n">' +
          notaLinea(l) +
          '</div></div>',
      )
      .join('') +
    '</div></section>' +
    '<div class="acciones"><button class="btn primary" type="submit">Guardar compra</button><button class="btn" type="button" data-act="sc-cancelar">Descartar</button></div></form>'
  );
}
function guardarEscaneo() {
  const e = escaneo;
  if (!e.proveedor.trim()) {
    toast('Escribe el proveedor.');
    $('sc-prov').focus();
    return;
  }
  let act = 0,
    nue = 0;
  const lineas = [];
  e.lineas.forEach((l) => {
    let p = prod(l.pid);
    if (!p && l.nuevo && puede(2) && l.nombre.trim() && !prodPorNombre(l.nombre)) {
      p = crearProd(l.nombre, e.proveedor, l.precio, l.unidad);
      nue++;
    } else if (p && l.act && puede(2) && cambiarPrecio(p, l.precio)) act++;
    lineas.push({
      nombre: p ? p.nombre : l.nombre,
      productoId: p ? p.id : '',
      cantidad: l.cantidad,
      unidad: l.unidad,
      precio: l.precio,
    });
  });
  const c = nCompra({
    id: nuevoId('compras'),
    fecha: e.fecha || hoy(),
    proveedor: e.proveedor.trim(),
    albaran: e.albaran,
    importe: e.importe || suma(lineas, (l) => l.cantidad * l.precio),
    lineas: lineas,
    creado: new Date().toISOString(),
    por: miId || '',
  });
  S.compras.push(c);
  guardar('compras', c, true);
  escaneo = null;
  mesM = c.fecha.slice(0, 7);
  pintarListas();
  vCompras();
  toast(
    'Albarán guardado' +
      (act ? ' · ' + act + (act === 1 ? ' precio actualizado' : ' precios actualizados') : '') +
      (nue ? ' · ' + nue + (nue === 1 ? ' producto nuevo' : ' productos nuevos') : ''),
  );
}
