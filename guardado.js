/* ---- Guardado: una escritura a la vez por documento ---- */
const busy = (col, id) => {
  const p = pend[col + '/' + id];
  return !!(p && (p.dirty || p.saving));
};
const persistLocal = () => mem('esc2.datos', JSON.stringify(S));
const ref = (col, id) => (col === 'ajustes' ? db.doc('ajustes/empresa') : db.collection(col).doc(id));
const limpio = (o) => {
  const c = JSON.parse(JSON.stringify(o));
  delete c.id;
  return c;
};
function guardar(col, obj, ya) {
  if (COLNIV[col] != null && !puede(COLNIV[col])) {
    estado('Tu usuario no puede guardar este cambio.');
    return;
  }
  if (col === 'platos' || col === 'productos') sucio();
  if (col !== 'ajustes') anotar(col, obj);
  const key = col + '/' + obj.id,
    p = pend[key] || (pend[key] = {});
  p.obj = obj;
  p.col = col;
  p.dirty = true;
  if (soloLectura) {
    estado('Cambios sin guardar: solo lectura');
    return;
  }
  estado('Guardando…');
  clearTimeout(p.timer);
  p.timer = setTimeout(() => volcar(key), ya ? 0 : 700);
}
function volcar(key) {
  const p = pend[key];
  if (!p || !p.dirty) return;
  if (p.saving) {
    p.again = true;
    return;
  }
  p.saving = true;
  p.dirty = false;
  let t;
  try {
    if (db) t = ref(p.col, p.obj.id).set(limpio(p.obj));
    else {
      persistLocal();
      t = Promise.resolve();
    }
  } catch (e) {
    t = Promise.reject(e);
  }
  t.then(
    () =>
      estado(
        db
          ? db.pend && db.pend()
            ? 'Guardado en este dispositivo. Se subirá al volver la conexión.'
            : 'Cambios guardados'
          : 'Guardado solo en este navegador',
      ),
    (e) => {
      if (e && e.code === 'invalid_argument') {
        soloLectura = true;
        aviso('Puedes consultar y calcular, pero no tienes permiso para guardar cambios en esta página.');
        estado('Solo lectura');
      } else {
        p.dirty = true;
        estado('No se pudo guardar. Se reintentará con tu próximo cambio.');
      }
    },
  ).then(() => {
    p.saving = false;
    if (p.again) {
      p.again = false;
      volcar(key);
    }
  });
}
function borrar(col, id) {
  if (!puede(2) && !deshaciendo) {
    toast('Solo el encargado puede eliminar.');
    return;
  }
  anotarBaja(col, id);
  const p = pend[col + '/' + id];
  if (p) {
    clearTimeout(p.timer);
    p.dirty = false;
  }
  S[col] = S[col].filter((x) => x.id !== id);
  sucio();
  if (db)
    ref(col, id)
      .delete()
      .catch(() => aviso('No se pudo eliminar. Inténtalo de nuevo.'));
  else persistLocal();
}
const nuevoId = (col) =>
  db ? db.collection(col).doc().id : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
