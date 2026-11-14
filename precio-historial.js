/* ---- Cambio de precio con historial (escáner) ---- */
function cambiarPrecio(p, nuevo) {
  nuevo = Math.round(nuevo * 1000) / 1000;
  if (!(nuevo > 0) || Math.abs(p.precio - nuevo) < 0.005) return false;
  if (p.precio > 0) {
    p.historial.push({ f: p.actualizado || '', p: p.precio });
    if (p.historial.length > 12) p.historial = p.historial.slice(-12);
    p.anterior = p.precio;
  }
  p.precio = nuevo;
  p.actualizado = new Date().toISOString();
  guardar('productos', p, true);
  return true;
}
function buscarProv(n, prov) {
  n = norm(n);
  if (!n) return null;
  const pv = norm(prov),
    mismos = pv ? S.productos.filter((p) => norm(p.proveedor) === pv) : [];
  const tk = n.split(' ').filter((x) => x.length > 2);
  let mejor = null,
    pm = 0;
  mismos.forEach((p) => {
    const pn = norm(p.nombre);
    let s = 0;
    if (pn === n) s = 2;
    else if (n.indexOf(pn) >= 0 || pn.indexOf(n) >= 0) s = 1;
    else {
      const pt = pn.split(' ');
      s = tk.filter((x) => pt.indexOf(x) >= 0).length / Math.max(pt.length, 1);
    }
    if (s > pm) {
      pm = s;
      mejor = p;
    }
  });
  return pm >= 0.6 ? mejor : buscarProd(n);
}
