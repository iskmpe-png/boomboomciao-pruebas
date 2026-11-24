/* ---- Imágenes: reducir antes de enviar ---- */
/* Reduce una foto antes de subirla (el lado mayor a «max» px, JPEG 0,8): de 3-5 MB pasa a unos 200 KB.
   Usa createImageBitmap cuando existe: decodifica fuera del hilo principal y es bastante más rápido en móviles. */
async function reducir(file, max) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bm = await createImageBitmap(file, { imageOrientation: 'from-image' }),
        k = Math.min(1, max / Math.max(bm.width, bm.height)),
        w = Math.max(1, Math.round(bm.width * k)),
        h = Math.max(1, Math.round(bm.height * k)),
        cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      cv.getContext('2d').drawImage(bm, 0, 0, w, h);
      if (bm.close) bm.close();
      const b = await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.8));
      if (b) return b;
    } catch (e) {
      /* formato raro (HEIC…): se intenta por el camino clásico */
    }
  }
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
      cv.toBlob((b) => (b ? ok(b) : ko(new Error('img'))), 'image/jpeg', 0.8);
    };
    im.onerror = () => {
      URL.revokeObjectURL(u);
      ko(new Error('img'));
    };
    im.src = u;
  });
}
/* Hace fn(x, i) con varios a la vez (por defecto 3), en orden de resultados */
async function enParalelo(lista, fn, n) {
  const out = new Array(lista.length);
  let i = 0;
  const trabajador = async () => {
    while (i < lista.length) {
      const k = i++;
      out[k] = await fn(lista[k], k);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n || 3, lista.length) }, trabajador));
  return out;
}
/* Abre el selector de archivos del sistema. capture: abre directamente la cámara trasera.
   Si se cancela, devuelve una lista vacía (antes la promesa se quedaba esperando). */
function pedirArchivo(accept, multiple, capture) {
  return new Promise((ok) => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = accept;
    i.multiple = !!multiple;
    if (capture) i.setAttribute('capture', 'environment');
    i.hidden = true;
    let hecho = false;
    const fin = (l) => {
      if (hecho) return;
      hecho = true;
      ok(l);
      i.remove();
    };
    i.addEventListener('change', () => fin(Array.from(i.files || [])));
    i.addEventListener('cancel', () => fin([]));
    document.body.appendChild(i);
    i.click();
  });
}
const esAndroid = () => /Android/i.test(navigator.userAgent || '');
/* En Android el selector del sistema falla mucho: con «varias fotos» o con fotos y PDF juntos
   no ofrece la cámara, y con la cámara solo deja una foto. Aquí se elige primero qué se quiere
   (cámara, galería o documento) y con la cámara se pueden hacer varias fotos seguidas.
   En iPhone y ordenador se abre el selector normal, que ya lo ofrece todo. */
function elegirArchivos(accept, multiple) {
  if (!esAndroid() || !/image/.test(accept)) return pedirArchivo(accept, multiple);
  const docs = accept
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x && !/^image/.test(x))
      .join(','),
    acum = [];
  return new Promise((ok) => {
    const h = document.createElement('div');
    h.className = 'hoja-arch';
    h.setAttribute('role', 'dialog');
    h.setAttribute('aria-modal', 'true');
    h.setAttribute('aria-label', 'Añadir fotos o archivos');
    const cerrar = (l) => {
      h.remove();
      ok(l);
    };
    const pinta = () => {
      h.innerHTML =
        '<div class="ha-c"><b>' + (acum.length ? (acum.length === 1 ? '1 foto lista' : acum.length + ' fotos listas') : 'Añadir') + '</b>' +
        '<button type="button" class="btn primary" data-ha="cam">' + (acum.length ? 'Hacer otra foto' : 'Hacer una foto') + '</button>' +
        (acum.length ? '<button type="button" class="btn" data-ha="fin">Listo</button>' : '<button type="button" class="btn" data-ha="gal">Elegir ' + (multiple ? 'fotos' : 'una foto') + ' de la galería</button>') +
        (docs && !acum.length ? '<button type="button" class="btn" data-ha="doc">Elegir un documento (PDF, Excel…)</button>' : '') +
        '<button type="button" class="link" data-ha="no">Cancelar</button></div>';
      const b = h.querySelector('button');
      if (b) b.focus();
    };
    h.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ha]');
      if (!b) {
        if (e.target === h) cerrar(acum.slice());
        return;
      }
      const a = b.dataset.ha;
      if (a === 'fin') return cerrar(acum.slice());
      if (a === 'no') return cerrar([]);
      (a === 'cam' ? pedirArchivo('image/*', false, true) : a === 'gal' ? pedirArchivo('image/*', multiple) : pedirArchivo(docs, multiple)).then((l) => {
        acum.push(...l);
        if (!acum.length) return;
        if (a !== 'cam' || !multiple) return cerrar(acum.slice());
        pinta(); // con la cámara: ¿otra foto o listo?
      });
    });
    h.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrar(acum.slice());
    });
    document.body.appendChild(h);
    pinta();
  });
}
/* Campo de fotos reutilizable: se van juntando (cámara o galería) y se ven antes de subirlas */
const FOTOS_SEL = {};
const fotosSel = (id) => FOTOS_SEL[id] || [];
function fotosCampoHTML(id, etiqueta) {
  return (
    '<div class="field wide fotos-campo" id="' + id + '"><span class="lbl">' + esc(etiqueta) + '</span>' +
    '<div class="fc-l" data-fc-l></div><div class="acciones"><button type="button" class="btn" data-act="fc-add" data-fc="' + id + '">＋ Añadir fotos</button></div>' +
    '<span class="hint" id="' + id + '-msg" aria-live="polite"></span></div>'
  );
}
function pintaFotosCampo(id) {
  const o = $(id);
  if (!o) return;
  const l = fotosSel(id),
    box = o.querySelector('[data-fc-l]');
  box.querySelectorAll('img').forEach((im) => URL.revokeObjectURL(im.src));
  box.innerHTML = l
    .map((f, k) => '<span class="fc-f"><img src="' + URL.createObjectURL(f) + '" alt="Foto ' + (k + 1) + ' elegida"><button type="button" class="fc-x" data-act="fc-quitar" data-fc="' + id + '" data-k="' + k + '" aria-label="Quitar la foto ' + (k + 1) + '">✕</button></span>')
    .join('');
  const m = $(id + '-msg');
  if (m) m.textContent = l.length ? (l.length === 1 ? '1 foto elegida' : l.length + ' fotos elegidas') : '';
}
function vaciarFotosCampo(id) {
  FOTOS_SEL[id] = [];
  pintaFotosCampo(id);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="fc-add"],[data-act="fc-quitar"]');
  if (!b) return;
  const id = b.dataset.fc;
  if (b.dataset.act === 'fc-quitar') {
    fotosSel(id).splice(+b.dataset.k, 1);
    pintaFotosCampo(id);
    return;
  }
  elegirArchivos('image/*', true).then((l) => {
    FOTOS_SEL[id] = fotosSel(id).concat(l.filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name))).slice(0, 30);
    pintaFotosCampo(id);
  });
});
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
