/* ---- Imágenes: reducir antes de enviar ---- */
function reducir(file, max) {
  return new Promise((ok, ko) => {
    const u = URL.createObjectURL(file),
      im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)),
        cv = document.createElement('canvas');
      cv.width = Math.round(im.width * k);
      cv.height = Math.round(im.height * k);
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(u);
      cv.toBlob((b) => (b ? ok(b) : ko(new Error('img'))), 'image/jpeg', 0.85);
    };
    im.onerror = () => {
      URL.revokeObjectURL(u);
      ko(new Error('img'));
    };
    im.src = u;
  });
}
function pedirArchivo(accept, multiple) {
  return new Promise((ok) => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = accept;
    i.multiple = !!multiple;
    i.hidden = true;
    i.addEventListener('change', () => {
      ok(Array.from(i.files || []));
      i.remove();
    });
    document.body.appendChild(i);
    i.click();
  });
}
const ERRS = {
  not_granted: 'Claude no tiene permiso en esta página. Actívalo en el menú del artefacto para usar la IA.',
  sampling_disabled: 'La IA no está disponible en esta cuenta.',
  rate_limited: 'Has llegado al límite de uso por ahora. Prueba en un rato.',
  session_expired: 'Vuelve a iniciar sesión en Claude.',
  image_rejected: 'No se pudo leer la imagen. Prueba con otra foto, más cerca y con buena luz.',
  refused: 'Claude no pudo responder a esa petición.',
  invalid_json: 'No pude ordenar los datos. Inténtalo de nuevo.',
  prompt_too_large: 'El archivo es demasiado grande. Prueba con menos días o una foto.',
  images_unavailable: 'Desde aquí no se pueden enviar fotos a Claude.',
};
const errIA = (e) => (e && e.msgIA) || ERRS[e && e.code] || 'No se pudo conectar con la IA. Inténtalo de nuevo.';
const sinIA = () =>
  vacio(
    'La IA no está disponible aquí',
    'Abre la app desde Claude con tu cuenta iniciada para usar el asistente, el escáner y la importación de ventas.',
    '',
  );
