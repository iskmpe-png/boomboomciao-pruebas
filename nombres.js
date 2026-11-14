/* ---- Nombres de quien registra (se guardan solo ids) ---- */
const nombres = new Map(),
  pendNom = new Set();
let tNom;
function nombre(id) {
  if (!id || !uAPI) return '';
  if (nombres.has(id)) return nombres.get(id);
  nombres.set(id, '');
  pendNom.add(id);
  clearTimeout(tNom);
  tNom = setTimeout(() => {
    const ids = [...pendNom];
    pendNom.clear();
    uAPI
      .profiles(ids)
      .then((ps) => {
        ids.forEach((i) => nombres.set(i, (ps && ps[i] && ps[i].name) || ''));
        refrescar();
      })
      .catch(() => {});
  }, 60);
  return '';
}
const porTxt = (id) => {
  const n = nombre(id);
  return n ? ' · ' + n : '';
};
