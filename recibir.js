/* ---- Arranque ---- */
function recibir(col, lista) {
  const vivos = S[col].filter((x) => busy(col, x.id)),
    ids = {};
  S[col] = lista.map((d) => {
    ids[d.id] = 1;
    for (let k = 0; k < vivos.length; k++) if (vivos[k].id === d.id) return vivos[k];
    return NORM[col](d);
  });
  vivos.forEach((v) => {
    if (!ids[v.id]) S[col].push(v);
  });
  sombrear(col);
  cargado[col] = true;
  sucio();
  refrescar();
}
