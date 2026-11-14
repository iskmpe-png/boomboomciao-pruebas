/* ---- Copia de seguridad ---- */
let esLocal = false;
$('btn-copia').addEventListener('click', () => {
  const d = { app: 'boomboomciao', version: 1, fecha: new Date().toISOString(), datos: S };
  entregar(new Blob([JSON.stringify(d)], { type: 'application/json' }), 'BoomBoomCiao-copia-' + hoy() + '.json');
});
const puedeRest = () => esLocal || (db && db.nube && nivel === 'admin');
$('btn-restaurar').addEventListener('click', (e) => {
  if (!puedeRest()) return;
  if (confirmar(e.currentTarget, esLocal ? '¿Reemplazar todo?' : '¿Cargar la copia?')) {
    delete e.currentTarget.dataset.ok;
    e.currentTarget.textContent = 'Restaurar';
    $('f-copia').value = '';
    $('f-copia').click();
  }
});
$('f-copia').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f || !puedeRest()) return;
  f.text()
    .then((t) => {
      const j = JSON.parse(t),
        d = j && j.datos ? j.datos : j;
      if (!d || !Array.isArray(d.platos) || !Array.isArray(d.productos)) throw 0;
      const aj = d.ajustes
        ? {
            id: 'empresa',
            nombre: String(d.ajustes.nombre || ''),
            periodo: PER[d.ajustes.periodo] ? d.ajustes.periodo : 'mensual',
          }
        : null;
      if (!esLocal) {
        const filas = [];
        COLS.forEach((c) =>
          (Array.isArray(d[c]) ? d[c] : []).forEach((x) => {
            if (x && x.id) filas.push([c, String(x.id), limpio(NORM[c](x))]);
          }),
        );
        if (aj) filas.push(['ajustes', 'empresa', { nombre: aj.nombre, periodo: aj.periodo }]);
        menu(false);
        toast('Subiendo la copia…');
        return db.lote(filas).then(
          () => toast('Copia cargada: ' + filas.length + ' registros.'),
          () => toast('No se pudo subir la copia. Revisa la conexión y vuelve a intentarlo.'),
        );
      }
      COLS.forEach((c) => {
        S[c] = (Array.isArray(d[c]) ? d[c] : []).map(NORM[c]);
      });
      if (aj) S.ajustes = aj;
      COLS.forEach(sombrear);
      pila.length = 0;
      pintaDeshacer();
      persistLocal();
      sucio();
      menu(false);
      pintar();
      toast('Copia restaurada: ' + S.platos.length + ' fichas y ' + S.productos.length + ' productos.');
    })
    .catch(() => toast('Ese archivo no es una copia de Boom Boom Ciao.'));
});
