/* ---- Fotos de los platos ----
   Cada plato puede tener una foto. Se guarda una miniatura cuadrada y ligera (unos 30 KB)
   en la colección «fotos», con el mismo id que el plato. */
const fotoDe = (id) => {
  const f = S.fotos.find((x) => x.id === id);
  return f && f.img ? f.img : '';
};
const ICO_FOTO =
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
/* Miniatura para las listas: la foto o, si no hay, la inicial sobre el color de la marca */
function miniFoto(p) {
  const f = fotoDe(p.id);
  if (f) return '<img class="mini-foto" src="' + f + '" alt="" loading="lazy" decoding="async">';
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
      ? '<img src="' + f + '" alt="Foto de ' + esc(p.nombre) + '">'
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
  let o = S.fotos.find((x) => x.id === p.id);
  if (!o) {
    o = nFoto({ id: p.id, img: img });
    S.fotos.push(o);
  } else o.img = img;
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
