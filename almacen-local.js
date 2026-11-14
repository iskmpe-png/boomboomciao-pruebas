/* Almacén del dispositivo (IndexedDB): última copia de los datos y cambios pendientes de subir */
const idb = (() => {
  let p;
  const abrir = () =>
    p ||
    (p = new Promise((ok, ko) => {
      const q = indexedDB.open('bbc' + (PFX ? '-pruebas' : ''), 1);
      q.onupgradeneeded = () => q.result.createObjectStore('kv');
      q.onsuccess = () => ok(q.result);
      q.onerror = () => ko(q.error);
    }));
  const op = (modo, fn) =>
    abrir()
      .then(
        (d) =>
          new Promise((ok, ko) => {
            const tx = d.transaction('kv', modo),
              rq = fn(tx.objectStore('kv'));
            tx.oncomplete = () => ok(rq.result);
            tx.onerror = tx.onabort = () => ko(tx.error);
          }),
      )
      .catch(() => undefined);
  return {
    get: (k) => op('readonly', (s) => s.get(k)),
    set: (k, v) => op('readwrite', (s) => s.put(v, k)),
    del: (k) => op('readwrite', (s) => s.delete(k)),
  };
})();
const esRed = (e) =>
  (typeof navigator !== 'undefined' && navigator.onLine === false) ||
  !!(
    e &&
    !(e.code && String(e.code).length >= 4) &&
    /fetch|network|load failed|timed? ?out|aborted/i.test(String(e.message || e))
  );
let sinRed = false;
function conexion(ok, pendientes) {
  sinRed = !ok;
  if (!ok)
    aviso(
      'Sin conexión. Trabajas con los datos guardados en este dispositivo' +
        (pendientes
          ? ' y hay ' + pendientes + (pendientes === 1 ? ' cambio pendiente' : ' cambios pendientes') + ' de subir'
          : '') +
        '. Se sincroniza solo al volver internet.',
    );
  else {
    if ($('aviso').textContent.indexOf('Sin conexión') === 0) aviso('');
    if (sb && rid && !miembros.length) cargarMiembros();
  }
  document.body.classList.toggle('sin-red', !ok);
}
