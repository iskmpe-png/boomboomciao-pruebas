/* ---- Escáner de albaranes ---- */
let escaneo = null;
async function escanear() {
  if (!sAPI) {
    toast('La lectura de albaranes necesita la IA activada.');
    return;
  }
  /* Fotos o PDF (escaneado o digital). Varias fotos = varias páginas del mismo albarán. */
  const fs = await elegirArchivos('image/*,.pdf', true);
  if (!fs.length) return;
  escaneo = { estado: 'leyendo', n: fs.length };
  vCompras();
  try {
    const textos = [],
      imgs = [];
    for (const f of fs) {
      const d = await leerDocumento(f);
      textos.push(...d.textos);
      imgs.push(...d.imagenes);
    }
    const pr =
      'Esto es UN albarán o factura de proveedor de un restaurante en España' + (imgs.length > 1 ? ', en varias páginas' : '') + '. Extrae los datos y responde SOLO con JSON con esta forma exacta:\n' +
      '{"proveedor":"nombre comercial del proveedor","fecha":"AAAA-MM-DD","albaran":"número de albarán o factura","base_imponible":número sin IVA o null,"total":número con IVA o null,"lineas":[{"descripcion":"texto de la línea tal cual","producto":"nombre EXACTO de la lista de productos si es claramente el mismo producto (misma variedad y presentación), si no \\"\\"","cantidad":número,"unidad":"kg"|"l"|"ud","contenido":número o null,"contenido_unidad":"g"|"kg"|"ml"|"cl"|"l"|null,"precio":número,"importe":número}]}\n' +
      'Cómo rellenar cada línea, copiando lo que pone el documento SIN hacer tú las cuentas:\n' +
      '- cantidad y unidad: lo que se factura. Si se cobra al peso o al volumen ("2,350 kg", "5 L") usa "kg" o "l". Si se cobra por unidades, botes, botellas, latas, bolsas, bandejas, cajas o paquetes, usa "ud" y cantidad = cuántos.\n' +
      '- contenido y contenido_unidad: SOLO cuando unidad es "ud": cuánto pesa o trae CADA una de esas unidades según la descripción o el documento ("Nata 1L" → 1 y "l"; "Rúcula bandeja 125 g" → 125 y "g"; "Agua caja 6x1,5L" facturada por cajas → 9 y "l"; "Atún lata 1,8 kg" → 1.8 y "kg"). Si no lo dice en ningún sitio, null. No lo inventes ni lo supongas.\n' +
      '- precio: precio de UNA unidad facturada (un kg, un litro o una unidad/caja), sin IVA y con el descuento de la línea ya aplicado.\n' +
      '- importe: importe de la línea sin IVA.\n' +
      'Ejemplo: «10 Nata 250ml 5,00 50,00» → {"cantidad":10,"unidad":"ud","contenido":250,"contenido_unidad":"ml","precio":5,"importe":50}. Números con punto decimal. Si un dato no se lee, null. No inventes líneas. No incluyas como línea los totales, el IVA, los portes ni los descuentos generales.\n' +
      'Proveedores conocidos: ' +
      proveedores().join(', ') +
      '\nProductos conocidos: ' +
      S.productos.map((p) => p.nombre + (p.proveedor ? ' (' + p.proveedor + ')' : '')).join('; ').slice(0, 15000) +
      (textos.length ? '\n\nTEXTO DEL DOCUMENTO (las columnas van separadas por ;):\n' + textos.join('\n').slice(0, 30000) : '');
    /* Hasta 4 páginas por consulta; si hay más, se leen por tandas y se juntan las líneas */
    let d = null;
    const tandas = [];
    for (let k = 0; k < Math.max(1, imgs.length); k += 4) tandas.push(imgs.slice(k, k + 4));
    for (let k = 0; k < tandas.length; k++) {
      const r = await sAPI.json(pr + (tandas.length > 1 ? '\nEstas son las páginas ' + (k * 4 + 1) + ' a ' + (k * 4 + tandas[k].length) + ' de ' + imgs.length + '.' : ''), { images: tandas[k], cache: false, nivel: 'alto' });
      if (!d) d = r || {};
      else if (r && Array.isArray(r.lineas)) d.lineas = (Array.isArray(d.lineas) ? d.lineas : []).concat(r.lineas);
      if (d && r && !d.total && r.total) d.total = r.total;
      if (d && r && !d.base_imponible && r.base_imponible) d.base_imponible = r.base_imponible;
    }
    const prov = String((d && d.proveedor) || '').trim(),
      pvx = proveedores().filter((x) => norm(x) === norm(prov))[0] || prov;
    const lineas = (Array.isArray(d && d.lineas) ? d.lineas : []).map((l) => lineaEscaneada(l, pvx));
    lineas.forEach((l) => {
      const p = prod(l.pid);
      /* El producto está en €/ud y el albarán dice cuánto trae: se propone pasarlo a €/kg o €/L */
      l.pasar = !!(p && puedeArea(p) && p.unidad === 'ud' && l.conv && l.unidad !== 'ud');
      l.act = !!(
        p &&
        puedeArea(p) &&
        (p.unidad === l.unidad || l.pasar) &&
        l.precio > 0 &&
        Math.abs(p.precio - l.precio) >= 0.005 &&
        (!p.proveedor || !pvx || norm(p.proveedor) === norm(pvx))
      );
      /* Quien no puede aprobar pide que lo creen: queda pendiente para el encargado */
      l.nuevo = !p && !puedeArea(areaNueva()) && !!l.nombre.trim();
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
      /* Los archivos leídos se guardan como prueba de la compra */
      archivos: fs,
      recibe: miNombre(),
    };
  } catch (e) {
    escaneo = { estado: 'error', msg: errIA(e) };
  }
  if (pant === 'compras') vCompras();
}
/* Una línea leída por la IA → línea de la app, ya en kg o L si se sabe cuánto trae cada unidad */
function lineaEscaneada(l, pvx) {
  const u = ['kg', 'l', 'ud'].indexOf(l.unidad) >= 0 ? l.unidad : 'ud',
    c = Number(l.cantidad) || 0,
    im = Number(l.importe) || 0;
  let pr = Number(l.precio) || 0;
  if (!pr && im && c) pr = im / c;
  /* Si precio × cantidad no cuadra con el importe, manda el importe (la IA a veces lee mal una columna) */
  if (im > 0 && c > 0 && pr > 0 && Math.abs(pr * c - im) / im > 0.15) pr = im / c;
  const desc = String(l.descripcion || ''),
    p = prodPorNombre(l.producto) || buscarProv(desc, pvx),
    x = { desc: desc, nombre: p ? p.nombre : desc, pid: p ? p.id : '', cantidad: c, unidad: u, precio: r3(pr), importe: im },
    k = aKgL({ cantidad: c, unidad: u, precio: pr, importe: im, contenido: l.contenido, contenido_unidad: l.contenido_unidad, desc: desc + ' ' + (p ? p.nombre : '') });
  if (k) Object.assign(x, k);
  return x;
}
const PEND_TXT = 'queda pendiente de aprobar por el encargado';
function notaLinea(l) {
  return (l.conv ? '<span class="hint sc-conv">' + esc(convTxt(l.conv, l.cantidad, l.precio)) + '</span>' : '') + notaLinea0(l);
}
function notaLinea0(l) {
  const p = prod(l.pid);
  if (!p) {
    if (!l.nombre.trim()) return '<span class="hint">No está en Precios</span>';
    return puedeArea(areaNueva())
      ? '<label class="check"><input type="checkbox" data-sc="nuevo"' + (l.nuevo ? ' checked' : '') + '> No está en Precios: crearlo</label>'
      : '<label class="check"><input type="checkbox" data-sc="nuevo"' + (l.nuevo ? ' checked' : '') + '> No está en Precios: pedir al encargado que lo cree</label>';
  }
  const otro = p.proveedor && escaneo.proveedor && norm(p.proveedor) !== norm(escaneo.proveedor),
    dif = l.precio > 0 && Math.abs(p.precio - l.precio) >= 0.005;
  if (p.unidad === 'ud' && l.conv && l.unidad !== 'ud' && puedeArea(p))
    return (
      '<label class="check"><input type="checkbox" data-sc="pasar"' + (l.pasar ? ' checked' : '') + '> Pasar «' + esc(p.nombre) + '» a ' + UDP[l.unidad] +
      ' (1 ud = ' + medTxt(l.conv.c, l.conv.u) + ') y poner ' + fEur.format(l.precio) + '. Las fichas que lo usan se ajustan solas.</label>'
    );
  if (p.unidad !== l.unidad)
    return '<span class="hint">En Precios va en ' + UDP[p.unidad] + (puedeArea(p) ? ': revisa la unidad antes de actualizar.' : ': el cambio de formato ' + PEND_TXT + '.') + '</span>';
  if (!dif) return '<span class="hint">Mismo precio que en Precios.</span>';
  return (
    (puedeArea(p)
      ? '<label class="check"><input type="checkbox" data-sc="act"' +
        (l.act ? ' checked' : '') +
        '> Actualizar precio: ' +
        fEur.format(p.precio) +
        ' → ' +
        fEur.format(l.precio) +
        '</label>'
      : '<span class="hint" style="color:var(--warn)">Precio distinto (' + fEur.format(p.precio) + ' en Precios → ' + fEur.format(l.precio) + '): ' + PEND_TXT + '.</span>') +
    (otro ? '<span class="hint" style="color:var(--warn)">Ojo: en Precios es de ' + esc(p.proveedor) + '.</span>' : '')
  );
}
function vEscaneo() {
  const e = escaneo;
  if (e.estado === 'leyendo')
    return (
      '<section class="card estado"><strong>Leyendo el albarán…</strong><span>' +
      e.n +
      (e.n === 1 ? ' archivo' : ' archivos') +
      '. Tarda unos segundos.</span></section>'
    );
  if (e.estado === 'error')
    return (
      '<section class="card estado"><strong>No se pudo leer</strong><span>' +
      esc(e.msg) +
      '</span><div class="acciones"><button class="btn primary" type="button" data-act="escanear">Probar con otro archivo</button><button class="btn" type="button" data-act="sc-cancelar">Cancelar</button></div></section>'
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
    '"></div>' +
    '<div class="field"><label for="sc-rec">Recibido por *</label><input id="sc-rec" data-scg="recibe" type="text" list="dl-equipo" autocomplete="off" value="' + esc(e.recibe || '') + '"></div></div>' +
    (e.archivos && e.archivos.length
      ? '<p class="hint">' + ICO_CLIP + ' Se guardará ' + (e.archivos.length === 1 ? 'el archivo' : 'los ' + e.archivos.length + ' archivos') + ' como prueba: ' + esc(e.archivos.map((f) => f.name).join(', ')) + '</p>'
      : '') +
    (e.total ? '<p class="hint">Total con IVA en el albarán: ' + fEur.format(e.total) + '</p>' : '') +
    '</section>' +
    '<div id="sc-extra" class="col">' + scExtraHTML() + '</div>' +
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
async function guardarEscaneo() {
  const e = escaneo;
  if (e.guardando) return;
  if (!e.proveedor.trim()) {
    toast('Escribe el proveedor.');
    $('sc-prov').focus();
    return;
  }
  if (!String(e.recibe || '').trim()) {
    toast('Escribe quién recibió la mercancía.');
    $('sc-rec').focus();
    return;
  }
  e.guardando = true;
  let act = 0,
    nue = 0,
    pas = 0;
  const lineas = [],
    pend = [],
    pid0 = Date.now().toString(36);
  e.lineas.forEach((l, k) => {
    let p = prod(l.pid);
    if (!p && l.nuevo && l.nombre.trim() && !prodPorNombre(l.nombre)) {
      if (puedeArea(areaNueva())) {
        p = crearProd(l.nombre, e.proveedor, l.precio, l.unidad);
        nue++;
      } else pend.push({ id: pid0 + k, tipo: 'nuevo', k: lineas.length, nombre: l.nombre.trim(), unidad: l.unidad, precio: l.precio, area: areaNueva() });
    } else if (p && !puedeArea(p)) {
      /* Cocina sube el albarán tal cual; lo que cambia Precios lo aprueba el encargado */
      if (p.unidad !== l.unidad && l.precio > 0) pend.push({ id: pid0 + k, tipo: 'formato', k: lineas.length, pid: p.id, nombre: p.nombre, unidad: l.unidad, precio: l.precio, de: p.unidad });
      else if (l.precio > 0 && Math.abs(p.precio - l.precio) >= 0.005) pend.push({ id: pid0 + k, tipo: 'precio', k: lineas.length, pid: p.id, nombre: p.nombre, unidad: l.unidad, precio: l.precio, de: p.precio });
    } else if (p) {
      if (l.pasar && p.unidad === 'ud' && l.conv && l.unidad !== 'ud') {
        convertirProducto(p, l.unidad, cvCalculo(p.precio, 'ud', l.unidad, l.conv.c));
        pas++;
      }
      if (l.act && p.unidad === l.unidad && cambiarPrecio(p, l.precio)) act++;
    }
    lineas.push({
      nombre: p ? p.nombre : l.nombre,
      productoId: p ? p.id : '',
      cantidad: l.cantidad,
      unidad: l.unidad,
      precio: l.precio,
      desc: l.desc,
      conv: l.conv,
    });
  });
  const c = nCompra({
    id: nuevoId('compras'),
    fecha: e.fecha || hoy(),
    proveedor: e.proveedor.trim(),
    albaran: e.albaran,
    importe: e.importe || suma(lineas, (l) => l.cantidad * l.precio),
    lineas: lineas,
    recibe: String(e.recibe).trim(),
    creado: new Date().toISOString(),
    por: miId || '',
    pendientes: pend,
  });
  /* Primero la prueba: así la compra se guarda ya con su foto o documento */
  if (e.archivos && e.archivos.length) {
    const b = q($('vista'), '#form-scan [type="submit"]');
    if (b) {
      b.disabled = true;
      b.textContent = 'Guardando la prueba…';
    }
    const base = c.archivos.length;
    (await enParalelo(e.archivos, async (f, k) => {
      try {
        return await subirArchivo(c, base + k, await prepararArchivo(f));
      } catch (er) {
        toast(er.message || 'No se pudo guardar un archivo.');
        return null;
      }
    }, 3)).forEach((f) => {
      if (f) c.archivos.push(f);
    });
  }
  S.compras.push(c);
  guardar('compras', c, true);
  enlazarPedido(c);
  escaneo = null;
  mesM = c.fecha.slice(0, 7);
  pintarListas();
  vCompras();
  toast(
    'Albarán guardado' +
      (act ? ' · ' + act + (act === 1 ? ' precio actualizado' : ' precios actualizados') : '') +
      (nue ? ' · ' + nue + (nue === 1 ? ' producto nuevo' : ' productos nuevos') : '') +
      (pas ? ' · ' + pas + (pas === 1 ? ' producto pasado a kg/L' : ' productos pasados a kg/L') : '') +
      (pend.length ? ' · ' + pend.length + (pend.length === 1 ? ' cambio queda pendiente' : ' cambios quedan pendientes') + ' de aprobar' : ''),
  );
}
