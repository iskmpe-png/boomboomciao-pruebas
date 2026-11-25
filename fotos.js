/* ---- Fotos de los platos ----
   Cada plato puede tener una foto: una miniatura cuadrada y ligera en la colección «fotos», con el mismo id
   que el plato. La imagen vive en el almacén privado «fotos» de Supabase (<restaurante>/<plato>-<marca>.jpg)
   y en la ficha solo va su ruta: así la sincronización no descarga todas las fotos cada vez.
   Cada foto se baja una vez y queda guardada en el dispositivo (también sin conexión).
   Las fotos antiguas (guardadas como texto dentro de la ficha) se siguen viendo y se pasan solas al almacén
   la próxima vez que entre un dueño o encargado. */
const FOTOS = 'fotos',
  FOTO_VACIA = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
  fotoUrl = new Map(),
  fotoPedida = new Set();
const fotoFicha = (id) => S.fotos.find((x) => x.id === id);
const fotoDe = (id) => {
  const f = fotoFicha(id);
  if (!f) return '';
  if (f.img) return f.img;
  if (!f.ruta) return '';
  const u = fotoUrl.get(f.ruta);
  if (u) return u;
  cargarFoto(f.ruta);
  return FOTO_VACIA; // hueco transparente mientras llega; luego se cambia sola
};
/* Marca la imagen para poder cambiarla en cuanto llegue la foto */
const attrFoto = (id) => {
  const f = fotoFicha(id);
  return f && !f.img && f.ruta ? ' data-foto="' + esc(f.ruta) + '"' : '';
};
async function cargarFoto(ruta) {
  if (fotoPedida.has(ruta)) return;
  fotoPedida.add(ruta);
  let b = null;
  try {
    b = await idb.get('foto:' + ruta);
    if (!b && sb && rid) {
      const r = await sb.storage.from(FOTOS).download(ruta);
      if (!r.error && r.data) {
        b = r.data;
        idb.set('foto:' + ruta, b);
      }
    }
  } catch (e) {
    b = null;
  }
  if (!b) {
    setTimeout(() => fotoPedida.delete(ruta), 60000); // sin red o sin permiso: se reintenta más tarde
    return;
  }
  const u = URL.createObjectURL(b);
  fotoUrl.set(ruta, u);
  document.querySelectorAll('img[data-foto]').forEach((i) => {
    if (i.dataset.foto === ruta) i.src = u;
  });
}
function blobDeDataUrl(u) {
  const i = u.indexOf(','),
    bin = atob(u.slice(i + 1)),
    a = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k);
  return new Blob([a], { type: u.slice(5, i).split(';')[0] || 'image/jpeg' });
}
/* Sube la miniatura al almacén. Devuelve la ruta, o '' si no se pudo (sin conexión, sin permiso…) */
async function subirFoto(platoId, dataUrl) {
  if (!(sb && rid) || sinRed) return '';
  const ruta = rid + '/' + String(platoId).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60) + '-' + Date.now().toString(36) + '.jpg',
    b = blobDeDataUrl(dataUrl);
  try {
    const r = await sb.storage.from(FOTOS).upload(ruta, b, { contentType: 'image/jpeg', upsert: false });
    if (r.error) return '';
  } catch (e) {
    return '';
  }
  idb.set('foto:' + ruta, b);
  fotoUrl.set(ruta, URL.createObjectURL(b));
  return ruta;
}
/* Pasa al almacén las fotos que aún van dentro de la ficha (una a una, sin prisa) */
let migrandoFotos = false;
async function migrarFotos() {
  if (migrandoFotos || !(sb && rid) || sinRed || !puede(2)) return;
  migrandoFotos = true;
  try {
    for (const f of S.fotos.filter((x) => x.img && !x.ruta)) {
      const ruta = await subirFoto(f.id, f.img);
      if (!ruta) break;
      f.ruta = ruta;
      f.img = '';
      guardar('fotos', f, true);
      await new Promise((ok) => setTimeout(ok, 400));
    }
  } finally {
    migrandoFotos = false;
  }
}
setTimeout(migrarFotos, 20000);
setInterval(migrarFotos, 10 * 60000);
const ICO_FOTO =
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
/* Miniatura para las listas: la foto o, si no hay, la inicial sobre el color de la marca */
function miniFoto(p) {
  const f = fotoDe(p.id);
  if (f) return '<img class="mini-foto" src="' + f + '"' + attrFoto(p.id) + ' alt="" loading="lazy" decoding="async">';
  const ini = (p.nombre || '?').trim().charAt(0).toUpperCase() || '?';
  return '<span class="mini-foto vacia' + (p.area === 'barra' ? ' barra' : '') + '" aria-hidden="true">' + esc(ini) + '</span>';
}
/* Foto grande de la ficha y de la receta, con los botones para ponerla o quitarla */
function fotoCaja(p, editable) {
  const f = fotoDe(p.id),
    puedo = editable && puede(2);
  return (
    '<div class="foto-caja">' +
    (f
      ? '<img src="' + f + '"' + attrFoto(p.id) + ' alt="Foto de ' + esc(p.nombre) + '">'
      : puedo
        ? '<button class="foto-vacia" type="button" data-act="foto-poner" aria-label="Añadir foto del plato">' + ICO_FOTO + '<span>Añadir foto</span></button>'
        : '<span class="foto-vacia">' + ICO_FOTO + '</span>') +
    (f && puedo
      ? '<span class="foto-bts"><button class="link" type="button" data-act="foto-poner">Cambiar</button><button class="link" type="button" data-act="foto-quitar">Quitar</button></span>'
      : '') +
    '</div>'
  );
}
/* Recorta al centro en cuadrado y la deja en 420 px: suficiente para verse bien y ligera para sincronizar */
function miniaturaDe(file) {
  return new Promise((ok, ko) => {
    const u = URL.createObjectURL(file),
      im = new Image();
    im.onload = () => {
      const L = 420,
        lado = Math.min(im.width, im.height),
        cv = document.createElement('canvas');
      cv.width = cv.height = L;
      cv.getContext('2d').drawImage(im, (im.width - lado) / 2, (im.height - lado) / 2, lado, lado, 0, 0, L, L);
      URL.revokeObjectURL(u);
      ok(cv.toDataURL('image/jpeg', 0.74));
    };
    im.onerror = () => {
      URL.revokeObjectURL(u);
      ko(new Error(/heic|heif/i.test(file.type + file.name) ? 'heic' : 'img'));
    };
    im.src = u;
  });
}
async function ponerFoto(p) {
  const f = (await pedirArchivo('image/*', false))[0];
  if (!f) return;
  let img;
  try {
    img = await miniaturaDe(f);
  } catch (e) {
    toast(
      e.message === 'heic'
        ? 'Esa foto está en formato HEIC. En el iPhone: Ajustes › Cámara › Formatos › «Más compatible», o haz una captura de la foto y súbela.'
        : 'No se pudo abrir esa imagen. Prueba con otra.',
    );
    return;
  }
  /* En el almacén si hay conexión; si no, dentro de la ficha (se pasará al almacén más tarde) */
  const ruta = await subirFoto(p.id, img);
  let o = S.fotos.find((x) => x.id === p.id);
  if (!o) {
    o = nFoto({ id: p.id });
    S.fotos.push(o);
  }
  o.img = ruta ? '' : img;
  o.ruta = ruta;
  guardar('fotos', o, true);
  sucio();
  pintar();
  toast('Foto guardada.');
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="foto-poner"],[data-act="foto-quitar"]');
  if (!b) return;
  const p = pant === 'recetas' ? plato(recetaId) : plato();
  if (!p || !puede(2)) return;
  if (b.dataset.act === 'foto-poner') ponerFoto(p);
  else if (confirmar(b, 'Pulsa otra vez')) {
    borrar('fotos', p.id);
    pintar();
  }
});
