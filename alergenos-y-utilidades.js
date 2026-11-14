/* ======== Ampliación: alérgenos, avisos, pedidos, compras, APPCC, producción, etiquetas, eventos, panel ======== */
const ALG = [
  ['gluten', 'Gluten'],
  ['crustaceos', 'Crustáceos'],
  ['huevo', 'Huevo'],
  ['pescado', 'Pescado'],
  ['cacahuete', 'Cacahuetes'],
  ['soja', 'Soja'],
  ['lacteos', 'Lácteos'],
  ['frutos', 'Frutos de cáscara'],
  ['apio', 'Apio'],
  ['mostaza', 'Mostaza'],
  ['sesamo', 'Sésamo'],
  ['sulfitos', 'Sulfitos'],
  ['altramuces', 'Altramuces'],
  ['moluscos', 'Moluscos'],
];
const ALGN = {};
ALG.forEach((a) => {
  ALGN[a[0]] = a[1];
});
function algDe(p, d) {
  const s = new Set(p.alergenos || []);
  if ((d || 0) < 6)
    p.ingredientes.forEach((i) => {
      const pr = prod(i.productoId);
      if (pr) pr.alergenos.forEach((a) => s.add(a));
      else {
        const b = baseDe(i);
        if (b) algDe(b, (d || 0) + 1).forEach((a) => s.add(a));
      }
    });
  return ALG.map((a) => a[0]).filter((a) => s.has(a));
}
const algTxt = (l) => l.map((a) => ALGN[a]).join(', ');
const algChips = (l) =>
  l.length
    ? l.map((a) => '<span class="chip">' + ALGN[a] + '</span>').join(' ')
    : '<span class="hint">Sin alérgenos marcados</span>';
const algBtns = (sel, act) =>
  ALG.map(
    (a) =>
      '<button type="button" class="tog" data-act="' +
      act +
      '" data-a="' +
      a[0] +
      '" aria-pressed="' +
      (sel.indexOf(a[0]) >= 0) +
      '">' +
      a[1] +
      '</button>',
  ).join('');
const famDe = (p) => norm((p.familia || p.nombre).replace(/\(.*?\)/g, ''));
const alternativas = (p) =>
  (idx().fam.get(famDe(p)) || [])
    .filter((o) => o.id !== p.id && o.unidad === p.unidad && o.precio > 0)
    .sort((a, z) => a.precio - z.precio);
const suma = (l, f) => l.reduce((t, x) => t + f(x), 0);
const delMes = (l) => l.filter((x) => x.fecha.slice(0, 7) === mesM);
const mesHTML = () => {
  const ms = {};
  ms[hoy().slice(0, 7)] = 1;
  ms[mesM] = 1;
  S.mermas.forEach((m) => {
    ms[m.fecha.slice(0, 7)] = 1;
  });
  S.compras.forEach((m) => {
    ms[m.fecha.slice(0, 7)] = 1;
  });
  S.ventas.forEach((v) => {
    if (/^\d{4}-\d{2}$/.test(v.id)) ms[v.id] = 1;
  });
  return (
    '<div class="field corto"><label for="m-mes">Mes</label><select id="m-mes">' +
    Object.keys(ms)
      .sort()
      .reverse()
      .map((k) => '<option value="' + k + '"' + (k === mesM ? ' selected' : '') + '>' + esc(fMes(k)) + '</option>')
      .join('') +
    '</select></div>'
  );
};
const margenUd = (p) => p.pvp / (1 + (p.iva || 0) / 100) - costeUd(p);
let pendAbrir = false,
  factor = 1,
  evId = null,
  planF = hoy(),
  apTipo = 'temp',
  apDia = hoy(),
  apPer = 'dia',
  edIni = null;
const et = { id: null, fecha: hoy(), resp: mem('bbc.resp') || '' };
function abrirPlato(id) {
  platoId = id;
  if (pant === 'carta') {
    abierta = true;
    vFicha();
    window.scrollTo(0, 0);
  } else {
    pendAbrir = true;
    sub.carta = 'platos';
    if (location.hash === '#carta-platos') ruta();
    else location.hash = '#carta-platos';
  }
}
function usaProd(pl, id, d) {
  return pl.ingredientes.some(
    (i) =>
      i.productoId === id ||
      ((d || 0) < 5 && i.baseId && idx().pl.get(i.baseId) && usaProd(idx().pl.get(i.baseId), id, (d || 0) + 1)),
  );
}
