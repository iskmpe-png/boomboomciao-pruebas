/* ---- Tarifas: cargar la lista de precios de un proveedor desde cualquier documento ---- */
let tarifa = null;
const TF_PROMPT =
  'Eres un lector de tarifas, listas de precios y catálogos de proveedores de hostelería en España. Devuelve SOLO JSON con esta forma: ' +
  '{"proveedor":"","items":[{"nombre":"","proveedor":"","precio":0,"unidad":"kg","formato":""}]}.\n' +
  'Reglas:\n- "items": una entrada por producto que tenga precio. Ignora cabeceras, totales, direcciones y textos que no sean productos.\n' +
  '- "nombre": el del producto, limpio, sin códigos ni referencias, con mayúscula inicial.\n' +
  '- "precio": sin IVA y por kilo, litro o unidad; número con punto decimal. "unidad" solo puede ser "kg", "l" o "ud".\n' +
  '- Si el precio es por caja, saco, pack o formato y se puede saber cuánto trae (por ejemplo «caja 6 x 1 L» o «saco 25 kg»), calcula el precio por kilo o litro y escribe el formato original en "formato". Si no se puede saber, deja "ud" y el precio del formato.\n' +
  '- "proveedor": el proveedor de esa línea si el documento mezcla varios; si no, déjalo vacío y pon el del documento en el "proveedor" de arriba.\n' +
  '- No inventes nada: si un precio no se lee con seguridad, omite esa línea.\n';
const tfUnidad = (u) => {
  u = norm(u);
  return /^(l|lt|lts|litro|litros)$/.test(u) ? 'l' : /^(kg|kilo|kilos|kgs)$/.test(u) ? 'kg' : 'ud';
};
/* Busca el producto de la app que corresponde a una línea de la tarifa */
function tfEnlace(nombre, proveedor) {
  const n = norm(nombre);
  if (!n) return null;
  const iguales = S.productos.filter((p) => norm(p.nombre) === n);
  if (!iguales.length) return null;
  const mismo = proveedor ? iguales.filter((p) => norm(p.proveedor) === norm(proveedor)) : [];
  if (mismo.length) return mismo[0];
  return proveedor && iguales.some((p) => p.proveedor) ? null : iguales[0];
}
function tfEstado(x) {
  const p = x.prodId ? prod(x.prodId) : null;
  if (!p) return 'nuevo';
  if (p.unidad !== x.unidad) return 'unidad';
  return Math.abs(p.precio - x.precio) < 0.005 ? 'igual' : 'cambio';
}
async function importarTarifa() {
  if (!sAPI) {
    toast('La lectura de documentos necesita la IA activada.');
    return;
  }
  const fs = await pedirArchivo('.xlsx,.xls,.ods,.csv,.tsv,.txt,.pdf,image/*', true);
  if (!fs.length) return;
  tarifa = { estado: 'leyendo', paso: 'Abriendo ' + (fs.length === 1 ? fs[0].name : fs.length + ' archivos') + '…', items: [], avisos: [] };
  pintar();
  const trabajos = [];
  for (let n = 0; n < fs.length; n++) {
    const f = fs[n];
    try {
      const d = await leerDocumento(f);
      d.textos.forEach((t) => trocear(t, 7000).forEach((c) => trabajos.push({ doc: n, texto: c })));
      for (let k = 0; k < d.imagenes.length; k += 2) trabajos.push({ doc: n, imagenes: d.imagenes.slice(k, k + 2) });
      if (!d.textos.length && !d.imagenes.length) tarifa.avisos.push('«' + f.name + '» está vacío.');
    } catch (e) {
      tarifa.avisos.push((e && e.message) || 'No se pudo abrir «' + f.name + '».');
    }
  }
  if (!tarifa) return;
  if (!trabajos.length) {
    tarifa = { estado: 'error', msg: tarifa.avisos.join(' ') || 'No encontré nada que leer en esos archivos.' };
    pintar();
    return;
  }
  const provDoc = {}; // proveedor de cada archivo, para las líneas que no lo traen
  for (let k = 0; k < trabajos.length; k++) {
    if (!tarifa) return; // cancelado
    tarifa.paso = 'Leyendo precios: parte ' + (k + 1) + ' de ' + trabajos.length + '…';
    if (pant === 'precios') vTarifa();
    const t = trabajos[k];
    try {
      const r = await sAPI.json(TF_PROMPT + (t.texto ? '\nDOCUMENTO (las columnas van separadas por ;):\n' + t.texto : '\nLee las fotos adjuntas.'), {
        images: t.imagenes || [],
        cache: false,
      });
      if (!tarifa) return;
      if (r && r.proveedor && !provDoc[t.doc]) provDoc[t.doc] = String(r.proveedor).trim();
      ((r && r.items) || []).forEach((i) => {
        const precio = Math.round((Number(i.precio) || 0) * 1000) / 1000,
          nombre = String(i.nombre || '').trim().slice(0, 120);
        if (!nombre || !(precio > 0)) return;
        tarifa.items.push({ doc: t.doc, nombre, proveedor: String(i.proveedor || '').trim(), precio, unidad: tfUnidad(i.unidad), formato: String(i.formato || '').slice(0, 80) });
      });
    } catch (e) {
      if (e && (e.code === 'rate_limited' || e.code === 'session_expired')) {
        tarifa.avisos.push(errIA(e));
        break;
      }
      tarifa.avisos.push('Una parte del documento no se pudo leer (' + (k + 1) + ' de ' + trabajos.length + ').');
    }
  }
  if (!tarifa) return;
  if (!tarifa.items.length) {
    tarifa = { estado: 'error', msg: tarifa.avisos.join(' ') || 'No encontré productos con precio en esos archivos.' };
    pintar();
    return;
  }
  /* Quita repetidos y enlaza cada línea con el producto que ya existe */
  const vistos = {};
  tarifa.items = tarifa.items.filter((x) => {
    if (!x.proveedor) x.proveedor = provDoc[x.doc] || '';
    const k = norm(x.nombre) + '|' + norm(x.proveedor);
    if (vistos[k]) return false;
    vistos[k] = 1;
    const p = tfEnlace(x.nombre, x.proveedor);
    x.prodId = p ? p.id : '';
    const e = tfEstado(x);
    x.ok = e === 'nuevo' || e === 'cambio';
    return true;
  });
  tarifa.estado = 'revisar';
  tarifa.ver = 'todo';
  lim.tarifa = 40;
  pintar();
}
function tfFila(x, k) {
  const e = tfEstado(x),
    p = x.prodId ? prod(x.prodId) : null,
    dif = p && p.precio > 0 ? ((x.precio - p.precio) / p.precio) * 100 : 0;
  return (
    '<div class="tf" data-k="' + k + '"><input type="checkbox" data-tf="ok" aria-label="Aplicar ' + esc(x.nombre) + '"' + (x.ok ? ' checked' : '') + '>' +
    '<div class="tf-n"><input type="text" data-tf="nombre" aria-label="Nombre" value="' + esc(x.nombre) + '"><small>' +
    esc(x.proveedor || 'Sin proveedor') + (x.formato ? ' · ' + esc(x.formato) : '') + '</small></div>' +
    '<div class="tf-p"><input class="num" type="text" inputmode="decimal" data-tf="precio" aria-label="Precio" value="' + show(x.precio) + '">' +
    '<select data-tf="unidad" aria-label="Unidad">' + ['kg', 'l', 'ud'].map((u) => '<option value="' + u + '"' + (u === x.unidad ? ' selected' : '') + '>' + UDP[u] + '</option>').join('') + '</select></div>' +
    '<div class="tf-e">' +
    (e === 'nuevo'
      ? '<span class="pill ok">Nuevo</span>'
      : e === 'igual'
        ? '<span class="pill">Sin cambio</span>'
        : e === 'unidad'
          ? '<span class="pill crit">Otra unidad</span><small>en la app: ' + fEur.format(p.precio) + UDP[p.unidad].slice(1) + '</small>'
          : '<span class="pill ' + (dif > 0 ? 'crit' : 'ok') + '">' + (dif > 0 ? '+' : '') + fNum(dif) + ' %</span><small>antes ' + fEur.format(p.precio) + '</small>') +
    '</div></div>'
  );
}
function vTarifa() {
  const t = tarifa;
  if (t.estado === 'leyendo') {
    $('vista').innerHTML =
      '<section class="card estado"><strong>Leyendo el documento</strong><span>' + esc(t.paso) + '</span>' +
      (t.items.length ? '<span>' + t.items.length + ' productos encontrados hasta ahora</span>' : '') +
      '<button class="btn" type="button" data-act="tf-cancelar">Cancelar</button></section>';
    return;
  }
  if (t.estado === 'error') {
    $('vista').innerHTML =
      '<section class="card estado"><strong>No se pudo leer la tarifa</strong><span>' + esc(t.msg) + '</span><div class="acciones" style="justify-content:center"><button class="btn primary" type="button" data-act="tf-importar">Probar con otro archivo</button><button class="btn" type="button" data-act="tf-cancelar">Volver</button></div></section>';
    return;
  }
  const cuenta = { nuevo: 0, cambio: 0, igual: 0, unidad: 0 };
  t.items.forEach((x) => cuenta[tfEstado(x)]++);
  const l = t.items.map((x, k) => [x, k]).filter(([x]) => t.ver === 'todo' || tfEstado(x) === t.ver || (t.ver === 'cambio' && tfEstado(x) === 'unidad')),
    marcados = t.items.filter((x) => x.ok).length;
  $('vista').innerHTML =
    '<div class="bar"><span class="hint grow"><b>' + t.items.length + ' productos leídos.</b> Revisa, corrige lo que haga falta y aplica. Nada cambia hasta que pulses Aplicar.</span>' +
    '<button class="btn" type="button" data-act="tf-cancelar">Descartar</button><button class="btn primary" type="button" data-act="tf-aplicar"' + (marcados ? '' : ' disabled') + '>Aplicar ' + marcados + '</button></div>' +
    (t.avisos.length ? '<p class="aviso">' + esc(t.avisos.join(' ')) + ' Revisa que no falte nada.</p>' : '') +
    '<div class="seg" role="group" aria-label="Qué ver">' +
    [['todo', 'Todo (' + t.items.length + ')'], ['nuevo', 'Nuevos (' + cuenta.nuevo + ')'], ['cambio', 'Cambian (' + (cuenta.cambio + cuenta.unidad) + ')'], ['igual', 'Sin cambio (' + cuenta.igual + ')']]
      .map(([v, n]) => '<button type="button" data-act="tf-ver" data-v="' + v + '" aria-pressed="' + (t.ver === v) + '">' + n + '</button>').join('') +
    '</div><section class="card"><div class="acciones"><button class="link" type="button" data-act="tf-todos">Marcar los que se ven</button><button class="link" type="button" data-act="tf-ninguno">Desmarcar los que se ven</button></div>' +
    '<div class="tf-lista">' + (l.length ? l.slice(0, lim.tarifa).map(([x, k]) => tfFila(x, k)).join('') : '<p class="hint" style="padding:10px 0">Nada en este grupo.</p>') + '</div>' + masHTML('tarifa', l.length) + '</section>';
}
/* Aplica lo marcado: cambia precios (guardando el anterior) y crea los productos nuevos */
function aplicarTarifa() {
  const t = tarifa,
    sel = t.items.filter((x) => x.ok && x.nombre.trim() && x.precio > 0);
  if (!sel.length) return;
  let nuevos = 0,
    cambios = 0;
  const ahora = new Date().toISOString(),
    filas = [];
  sel.forEach((x) => {
    let p = x.prodId ? prod(x.prodId) : null;
    if (p) {
      if (Math.abs(p.precio - x.precio) < 0.005 && p.unidad === x.unidad) return;
      if (p.precio > 0) {
        p.historial.push({ f: p.actualizado || '', p: p.precio });
        if (p.historial.length > 12) p.historial = p.historial.slice(-12);
        p.anterior = p.precio;
      }
      p.precio = x.precio;
      p.unidad = x.unidad;
      p.actualizado = ahora;
      cambios++;
    } else {
      p = nProd({ id: nuevoId('productos'), nombre: x.nombre.trim(), proveedor: x.proveedor, precio: x.precio, unidad: x.unidad, actualizado: ahora });
      S.productos.push(p);
      nuevos++;
    }
    filas.push(p);
  });
  sucio();
  /* Con la base de datos propia se sube todo de una vez; si no, de uno en uno */
  if (db && db.lote && !sinRed) {
    estado('Guardando…');
    db.lote(filas.map((p) => ['productos', p.id, limpio(p)])).then(
      () => estado('Cambios guardados'),
      () => filas.forEach((p) => guardar('productos', p, true)),
    );
  } else filas.forEach((p) => guardar('productos', p, true));
  tarifa = null;
  pintar();
  toast('Tarifa aplicada: ' + nuevos + (nuevos === 1 ? ' producto nuevo' : ' productos nuevos') + ' y ' + cambios + (cambios === 1 ? ' precio actualizado' : ' precios actualizados') + '.');
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act,
    visibles = () => tarifa.items.filter((x) => tarifa.ver === 'todo' || tfEstado(x) === tarifa.ver || (tarifa.ver === 'cambio' && tfEstado(x) === 'unidad'));
  if (a === 'tf-importar') importarTarifa();
  else if (a === 'tf-cancelar') {
    tarifa = null;
    pintar();
  } else if (!tarifa || tarifa.estado !== 'revisar') return;
  else if (a === 'tf-ver') {
    tarifa.ver = b.dataset.v;
    lim.tarifa = 40;
    vTarifa();
  } else if (a === 'tf-todos' || a === 'tf-ninguno') {
    visibles().forEach((x) => (x.ok = a === 'tf-todos'));
    vTarifa();
  } else if (a === 'tf-aplicar') aplicarTarifa();
});
V.addEventListener('change', (e) => {
  const t = e.target,
    f = t.closest('.tf');
  if (!f || !tarifa || !t.dataset.tf) return;
  const x = tarifa.items[Number(f.dataset.k)];
  if (!x) return;
  if (t.dataset.tf === 'ok') x.ok = t.checked;
  else if (t.dataset.tf === 'nombre') {
    x.nombre = t.value.trim();
    const p = tfEnlace(x.nombre, x.proveedor);
    x.prodId = p ? p.id : '';
  } else if (t.dataset.tf === 'precio') x.precio = Math.round(parse(t.value) * 1000) / 1000;
  else if (t.dataset.tf === 'unidad') x.unidad = uni(t.value);
  /* Al corregir una línea, se marca sola si ahora hay algo que aplicar */
  if (t.dataset.tf !== 'ok') x.ok = tfEstado(x) !== 'igual';
  vTarifa();
});
