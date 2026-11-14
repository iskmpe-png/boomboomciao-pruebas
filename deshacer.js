/* ---- Deshacer: copia de cada registro tal como estaba antes del último cambio ---- */
const sombra = {},
  pila = [];
let deshaciendo = false,
  tDes;
const COLTXT = {
  platos: 'Fichas',
  productos: 'Precios',
  inventarios: 'Inventario',
  mermas: 'Mermas',
  compras: 'Compras',
  appcc: 'APPCC',
  ventas: 'Ventas',
  planes: 'Producción',
  eventos: 'Eventos',
  proveedores: 'Proveedores',
  ajustes: 'Ajustes',
};
const tituloDoc = (col, o) =>
  (o && (o.nombre || o.proveedor || (o.fecha ? fFecha(o.fecha) : ''))) || COLTXT[col] || col;
function sombrear(col) {
  S[col].forEach((o) => {
    if (!busy(col, o.id)) sombra[col + '/' + o.id] = JSON.stringify(o);
  });
}
function anotar(col, obj) {
  const key = col + '/' + obj.id,
    antes = sombra[key] || null,
    ahora = JSON.stringify(obj);
  if (antes === ahora) return;
  if (!deshaciendo) {
    const u = pila[pila.length - 1];
    if (!(u && u.key === key && !u.baja && Date.now() - u.t < 20000))
      pila.push({ key: key, col: col, id: obj.id, antes: antes, nombre: tituloDoc(col, obj) });
    pila[pila.length - 1].t = Date.now();
    if (pila.length > 40) pila.shift();
    pintaDeshacer(true);
  }
  sombra[key] = ahora;
}
function anotarBaja(col, id) {
  const key = col + '/' + id,
    o = S[col].find((x) => x.id === id),
    antes = sombra[key] || (o ? JSON.stringify(o) : null);
  delete sombra[key];
  if (!deshaciendo && antes) {
    pila.push({
      key: key,
      col: col,
      id: id,
      antes: antes,
      baja: true,
      nombre: tituloDoc(col, o || JSON.parse(antes)),
      t: Date.now(),
    });
    pintaDeshacer(true);
  }
}
function pintaDeshacer(flota) {
  const u = pila[pila.length - 1],
    t = u ? 'Deshacer: ' + u.nombre : '';
  $('m-des').hidden = !u;
  $('btn-des-menu').title = t;
  const b = $('btn-deshacer');
  b.textContent = u ? (u.baja ? 'Recuperar ' : 'Deshacer cambio en ') + u.nombre : '';
  clearTimeout(tDes);
  if (u && flota) {
    b.hidden = false;
    tDes = setTimeout(() => {
      b.hidden = true;
    }, 12000);
  } else b.hidden = true;
}
function deshacer() {
  const u = pila.pop();
  if (!u) {
    pintaDeshacer();
    return;
  }
  deshaciendo = true;
  try {
    if (u.antes == null) borrar(u.col, u.id);
    else {
      const o = NORM[u.col](JSON.parse(u.antes)),
        i = S[u.col].findIndex((x) => x.id === u.id);
      if (i >= 0) S[u.col][i] = o;
      else S[u.col].push(o);
      guardar(u.col, o, true);
    }
  } finally {
    deshaciendo = false;
  }
  sucio();
  menu(false);
  pintar();
  pintaDeshacer();
  toast((u.baja ? 'Recuperado: ' : 'Cambio deshecho: ') + u.nombre);
}
$('btn-deshacer').addEventListener('click', deshacer);
$('btn-des-menu').addEventListener('click', deshacer);
