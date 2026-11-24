/* ---- Deshacer: copia de cada registro tal como estaba antes del último cambio ---- */
const sombra = {},
  pila = [];
let deshaciendo = false,
  tDes,
  /* Mientras vale algo distinto de 0, todos los cambios forman un solo «deshacer» (por ejemplo, borrar 10 productos) */
  loteDes = 0;
/* Ejecuta f() de forma que todo lo que cambie se deshaga de una vez */
function enLote(f) {
  loteDes = Date.now();
  try {
    f();
  } finally {
    loteDes = 0;
  }
}
const cuantosLote = () => {
  const u = pila[pila.length - 1];
  if (!u || !u.lote) return 1;
  let n = 0;
  for (let k = pila.length - 1; k >= 0 && pila[k].lote === u.lote; k--) if (pila[k].baja) n++;
  return n;
};
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
  fotos: 'Foto',
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
    if (loteDes || !(u && u.key === key && !u.baja && !u.lote && Date.now() - u.t < 20000))
      pila.push({ key: key, col: col, id: obj.id, antes: antes, nombre: tituloDoc(col, obj), lote: loteDes });
    pila[pila.length - 1].t = Date.now();
    if (pila.length > 400) pila.shift();
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
      lote: loteDes,
    });
    pintaDeshacer(true);
  }
}
function pintaDeshacer(flota) {
  const u = pila[pila.length - 1],
    nl = cuantosLote(),
    t = u ? 'Deshacer: ' + (nl > 1 ? nl + ' elementos' : u.nombre) : '';
  $('m-des').hidden = !u;
  $('btn-des-menu').title = t;
  const b = $('btn-deshacer');
  b.textContent = u ? (nl > 1 ? 'Recuperar los ' + nl + ' eliminados' : (u.baja ? 'Recuperar ' : 'Deshacer cambio en ') + u.nombre) : '';
  clearTimeout(tDes);
  if (u && flota) {
    b.hidden = false;
    tDes = setTimeout(() => {
      b.hidden = true;
    }, 12000);
  } else b.hidden = true;
}
function deshacer() {
  const nl = cuantosLote(),
    u = pila.pop();
  if (!u) {
    pintaDeshacer();
    return;
  }
  /* Un lote se deshace entero, del último cambio al primero */
  const todos = [u];
  while (u.lote && pila.length && pila[pila.length - 1].lote === u.lote) todos.push(pila.pop());
  deshaciendo = true;
  try {
    todos.forEach((x) => {
      if (x.antes == null) borrar(x.col, x.id);
      else {
        const o = NORM[x.col](JSON.parse(x.antes)),
          i = S[x.col].findIndex((y) => y.id === x.id);
        if (i >= 0) S[x.col][i] = o;
        else S[x.col].push(o);
        guardar(x.col, o, true);
      }
    });
  } finally {
    deshaciendo = false;
  }
  if (nl > 1) u.nombre = nl + ' elementos';
  sucio();
  menu(false);
  pintar();
  pintaDeshacer();
  toast((u.baja ? 'Recuperado: ' : 'Cambio deshecho: ') + u.nombre);
}
$('btn-deshacer').addEventListener('click', deshacer);
$('btn-des-menu').addEventListener('click', deshacer);
