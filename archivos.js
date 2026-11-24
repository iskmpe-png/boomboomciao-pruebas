/* ---- Archivo de albaranes ----
   La foto, el PDF o el Excel de cada compra se guarda en el almacén privado «albaranes» de Supabase,
   en la carpeta del restaurante y del mes: <restaurante>/<AAAA-MM>/<compra>-<n>.<ext>.
   Sin conexión (o en la versión de prueba sin servidor) se guarda en el propio dispositivo
   y se sube solo cuando vuelve internet. */
const ARCH = 'albaranes',
  ARCH_MAX = 12 * 1024 * 1024,
  MIME_ARCH = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
  };
const diasArchivo = () => S.ajustes.diasAlbaranes || 30;
const enNube = () => !!(sb && rid);
/* Deja cada archivo listo para guardar: las fotos se reducen a 1800 px (unos 250 KB), lo demás va tal cual */
async function prepararArchivo(f) {
  const ext = (String(f.name).split('.').pop() || '').toLowerCase();
  if (/^image\//.test(f.type) || /^(jpe?g|png|webp|heic|heif)$/.test(ext)) {
    try {
      return { blob: await reducir(f, 1600), ext: 'jpg', tipo: 'foto', nombre: f.name };
    } catch (e) {
      throw new Error(/heic|heif/i.test(f.type + f.name) ? '«' + f.name + '» es HEIC: en el iPhone, Ajustes › Cámara › Formatos › «Más compatible».' : 'No se pudo abrir «' + f.name + '».');
    }
  }
  const e2 = ext === 'jpeg' ? 'jpg' : ext;
  if (!MIME_ARCH[e2]) throw new Error('«' + f.name + '»: solo se guardan fotos, PDF, Excel o CSV.');
  if (f.size > ARCH_MAX) throw new Error('«' + f.name + '» pesa más de 12 MB.');
  return { blob: f, ext: e2, tipo: e2 === 'pdf' ? 'pdf' : 'hoja', nombre: f.name };
}
/* Sube uno y devuelve la ficha que se guarda en la compra */
async function subirArchivo(compra, k, a) {
  const ruta = (rid || 'local') + '/' + compra.fecha.slice(0, 7) + '/' + compra.id + '-' + k + '.' + a.ext,
    ficha = { ruta: ruta, nombre: a.nombre.slice(0, 120), tipo: a.tipo, tam: a.blob.size, subido: new Date().toISOString(), por: miId || '' };
  if (!enNube()) {
    await idb.set('arch:' + ruta, a.blob);
    return ficha;
  }
  try {
    const r = await sb.storage.from(ARCH).upload(ruta, a.blob, { contentType: MIME_ARCH[a.ext], upsert: true });
    if (r.error) throw r.error;
  } catch (e) {
    /* Sin internet: se queda en el dispositivo y se sube después */
    await idb.set('archpend:' + ruta, a.blob);
    ficha.pendiente = true;
  }
  return ficha;
}
async function blobArchivo(ruta) {
  const local = (await idb.get('archpend:' + ruta)) || (await idb.get('arch:' + ruta));
  if (local) return local;
  if (!enNube()) return null;
  const r = await sb.storage.from(ARCH).download(ruta);
  if (r.error) throw r.error;
  return r.data;
}
async function borrarArchivos(rutas) {
  if (!rutas.length) return;
  await Promise.all(rutas.map((r) => Promise.all([idb.del('arch:' + r), idb.del('archpend:' + r)])));
  if (enNube()) {
    const r = await sb.storage.from(ARCH).remove(rutas);
    if (r.error) throw r.error;
  }
}
/* Sube lo que se quedó pendiente sin conexión */
let subiendoPend = false;
async function subirPendientes() {
  if (subiendoPend || !enNube() || sinRed) return;
  subiendoPend = true;
  try {
    for (const c of S.compras) {
      let ch = false;
      for (const a of c.archivos) {
        if (!a.pendiente) continue;
        const b = await idb.get('archpend:' + a.ruta);
        if (!b) continue;
        const r = await sb.storage.from(ARCH).upload(a.ruta, b, { contentType: b.type || 'application/octet-stream', upsert: true });
        if (r.error) continue;
        await idb.del('archpend:' + a.ruta);
        delete a.pendiente;
        ch = true;
      }
      if (ch) guardar('compras', c, true);
    }
  } finally {
    subiendoPend = false;
  }
}
setInterval(subirPendientes, 60000);
window.addEventListener('online', () => setTimeout(subirPendientes, 3000));

/* ---- Ver un archivo ---- */
let visorUrl = '';
async function verArchivo(compraId, k) {
  const c = S.compras.find((x) => x.id === compraId),
    a = c && c.archivos[k];
  if (!a || a.borrado) return;
  capa(capaTop(a.nombre || 'Albarán', c.proveedor + ' · ' + fFecha(c.fecha)) + '<div class="visor"><p class="hint">Cargando…</p></div>');
  try {
    const b = await blobArchivo(a.ruta);
    if (!b) throw new Error('no');
    if (visorUrl) URL.revokeObjectURL(visorUrl);
    visorUrl = URL.createObjectURL(b);
    const v = q($('capa'), '.visor');
    if (!v) return;
    v.innerHTML =
      (a.tipo === 'foto' ? '<img src="' + visorUrl + '" alt="Albarán de ' + esc(c.proveedor) + '">' : '<p class="hint">' + (a.tipo === 'pdf' ? 'Documento PDF' : 'Hoja de cálculo') + ' · ' + fKB(a.tam) + '</p>') +
      '<div class="acciones"><a class="btn primary" href="' + visorUrl + '" target="_blank" rel="noopener">Abrir</a><button class="btn" type="button" data-capa="arch-bajar">Descargar</button></div>';
    v.dataset.nombre = nombreArchivo(c, k);
  } catch (e) {
    const v = q($('capa'), '.visor');
    if (v) v.innerHTML = '<p class="aviso">No se pudo abrir el archivo' + (sinRed ? ': no hay conexión.' : '.') + '</p>';
  }
}
const fKB = (n) => (n >= 1048576 ? fNum(n / 1048576, 1) + ' MB' : fNum(Math.max(1, n / 1024), 0) + ' KB');
/* Nombre ordenado para descargar: fecha_proveedor_albarán_n.ext */
function nombreArchivo(c, k) {
  const a = c.archivos[k],
    lim = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  return [c.fecha, lim(c.proveedor) || 'proveedor', lim(c.albaran) || 'sin-numero', k + 1].join('_') + '.' + a.ruta.split('.').pop();
}
$('capa').addEventListener('click', (e) => {
  const b = e.target.closest('[data-capa="arch-bajar"]');
  if (!b || !visorUrl) return;
  fetch(visorUrl)
    .then((r) => r.blob())
    .then((bl) => entregar(bl, q($('capa'), '.visor').dataset.nombre || 'albaran'));
});

/* ---- Archivo mensual: descargar el ZIP y liberar espacio ----
   Los archivos se guardan «diasArchivo()» días. Pasado ese plazo solo se borran si el mes
   ya se descargó en ZIP; si no, la app avisa para que nadie pierda un albarán. */
function mesesConArchivos() {
  const m = {};
  S.compras.forEach((c) =>
    c.archivos.forEach((a) => {
      if (a.borrado) return;
      const k = c.fecha.slice(0, 7);
      (m[k] || (m[k] = { n: 0, bytes: 0 })).n++;
      m[k].bytes += a.tam || 0;
    }),
  );
  return m;
}
async function zipDelMes(mes) {
  const cs = S.compras.filter((c) => c.fecha.slice(0, 7) === mes && c.archivos.some((a) => !a.borrado)).sort((a, z) => a.fecha.localeCompare(z.fecha)),
    arch = [];
  let fallos = 0;
  toast('Preparando el ZIP de ' + fMes(mes).toLowerCase() + '…');
  for (const c of cs)
    for (let k = 0; k < c.archivos.length; k++) {
      if (c.archivos[k].borrado) continue;
      try {
        const b = await blobArchivo(c.archivos[k].ruta);
        arch.push(['albaranes/' + nombreArchivo(c, k), new Uint8Array(await b.arrayBuffer())]);
      } catch (e) {
        fallos++;
      }
    }
  if (!arch.length) {
    toast('No se pudo descargar ningún archivo' + (sinRed ? ': no hay conexión.' : '.'));
    return;
  }
  /* Dentro va también el detalle de las compras del mes en Excel */
  const antes = mesM;
  mesM = mes;
  const det = await xlsxDe(infCompras());
  mesM = antes;
  arch.push(['compras-' + mes + '.xlsx', new Uint8Array(await det.arrayBuffer())]);
  const ok = await entregar(zip(arch, 'application/zip'), 'BoomBoomCiao-albaranes-' + mes + '.zip');
  if (!ok) return;
  if (fallos) {
    toast('Faltaron ' + fallos + ' archivos: el mes no se marca como guardado. Vuelve a intentarlo con conexión.');
    return;
  }
  if (puede(2) && S.ajustes.archivados.indexOf(mes) < 0) {
    S.ajustes.archivados.push(mes);
    guardar('ajustes', S.ajustes, true);
  }
  if (pant === 'compras') listaCompras();
}
/* Borra del almacén lo que pasó el plazo y ya está guardado en ZIP. Lo hace un encargado, una vez al día. */
async function limpiarArchivo() {
  if (!listo() || !puede(2) || !enNube() || sinRed || mem('bbc.limpieza') === hoy()) return;
  const lim = Date.now() - diasArchivo() * 864e5,
    porCompra = [];
  S.compras.forEach((c) => {
    if (S.ajustes.archivados.indexOf(c.fecha.slice(0, 7)) < 0) return;
    const viejos = c.archivos.filter((a) => !a.borrado && !a.pendiente && new Date(a.subido).getTime() < lim);
    if (viejos.length) porCompra.push([c, viejos]);
  });
  if (!porCompra.length) {
    mem('bbc.limpieza', hoy());
    return;
  }
  try {
    await borrarArchivos([].concat(...porCompra.map((x) => x[1].map((a) => a.ruta))));
  } catch (e) {
    return;
  }
  mem('bbc.limpieza', hoy());
  porCompra.forEach(([c, viejos]) => {
    viejos.forEach((a) => (a.borrado = hoy()));
    guardar('compras', c, true);
  });
}
/* Cuánto ocupa el archivo en la nube */
let espacioArch = null;
function cargarEspacio() {
  if (!enNube()) return;
  sb.rpc('espacio_albaranes', { p_rid: rid }).then(
    (r) => {
      const d = r && !r.error && (Array.isArray(r.data) ? r.data[0] : r.data);
      if (d) {
        espacioArch = { n: Number(d.archivos) || 0, bytes: Number(d.bytes) || 0 };
        if (pant === 'compras' && $('arch-esp')) $('arch-esp').textContent = 'En la nube: ' + espacioArch.n + ' archivos · ' + fKB(espacioArch.bytes);
      }
    },
    () => {},
  );
}
