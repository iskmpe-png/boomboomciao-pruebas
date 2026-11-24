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
/* Familia para comparar: el "principio" del nombre. «Huevos camperos L 30 ud» y «Huevo fresco» son la misma. */
const FAM_VACIAS = new Set('de del la el los las y e o con sin para en al a por kg kgs g gr grs kilo kilos gramos l lt lts litro litros ml cl ud uds und unds unidad unidades caja cajas bandeja bandejas pack bolsa bolsas saco sacos lata latas bote botes botella botellas docena tarrina tarrinas paquete paquetes x aprox'.split(' '));
/* Con estas palabras no basta la primera: «Aceite de oliva» y «Aceite de girasol» no son lo mismo */
const FAM_GENERICAS = new Set('aceite queso harina tomate vino salsa carne pan leche nata azucar sal pimienta jamon pasta arroz vinagre crema zumo agua cerveza chocolate pimiento cebolla patata pescado lomo filete pollo ternera cerdo cordero fruta verdura refresco licor cafe te caldo mermelada pure fondo masa base'.split(' '));
const famSingular = (w) => {
  if (w.length > 3 && /[^s]s$/.test(w)) {
    w = w.slice(0, -1);
    if (/[lnrdj]e$/.test(w) && w.length > 4) w = w.slice(0, -1);
  }
  return w;
};
/* Presentación y conservación: con esto dos productos con el mismo nombre ya no son comparables
   (boletus seco ≠ boletus congelado, atún en lata ≠ atún en lomo) */
const FAM_PRESENTA = { seco: 'seco', seca: 'seco', secos: 'seco', secas: 'seco', deshidratado: 'seco', deshidratada: 'seco', congelado: 'congelado', congelada: 'congelado', congelados: 'congelado', congeladas: 'congelado', ultracongelado: 'congelado', fresco: 'fresco', fresca: 'fresco', frescos: 'fresco', frescas: 'fresco', lata: 'lata', latas: 'lata', conserva: 'lata', bolsa: 'bolsa', bolsas: 'bolsa', lomo: 'lomo', lomos: 'lomo', ahumado: 'ahumado', ahumada: 'ahumado', rallado: 'rallado', rallada: 'rallado', loncheado: 'loncheado', loncheada: 'loncheado', lonchas: 'loncheado', polvo: 'polvo', entero: 'entero', entera: 'entero', triturado: 'triturado', triturada: 'triturado', pelado: 'pelado', pelada: 'pelado', liquido: 'liquido', liquida: 'liquido', precocinado: 'precocinado', precocinada: 'precocinado', cocido: 'cocido', cocida: 'cocido', crudo: 'crudo', cruda: 'crudo', ecologico: 'eco', ecologica: 'eco', bio: 'eco' };
/* Sin la IA: las dos primeras palabras con significado y la presentación.
   Mejor no comparar dos cosas iguales escritas distinto que comparar dos cosas distintas. */
const famAuto = (nombre) => {
  const todas = norm(String(nombre).replace(/\(.*?\)/g, '')).split(' ').filter(Boolean),
    pres = [...new Set(todas.map((w) => FAM_PRESENTA[w]).filter(Boolean))].sort(),
    ws = todas.filter((w) => !FAM_VACIAS.has(w) && !FAM_PRESENTA[w] && !/^\d/.test(w)).map(famSingular);
  if (!ws.length) return norm(nombre);
  return ws.slice(0, 2).concat(pres).join(' ');
};
/* El grupo para comparar: el que puso alguien a mano, el que asignó la IA (si el nombre no ha
   cambiado desde entonces) o, si no, el automático */
const claveIA = (p) => (p.clave && p.claveDe === norm(p.nombre) ? norm(p.clave) : '');
const famDe = (p) => (p.familia.trim() ? norm(p.familia) : claveIA(p) || famAuto(p.nombre));
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
    const pl = plato(id),
      h = '#carta-' + (pl && pl.base ? 'elaboraciones' : 'platos');
    sub.carta = h.slice(7);
    if (location.hash === h) ruta();
    else location.hash = h;
  }
}
function usaProd(pl, id, d) {
  return pl.ingredientes.some(
    (i) =>
      i.productoId === id ||
      ((d || 0) < 5 && i.baseId && idx().pl.get(i.baseId) && usaProd(idx().pl.get(i.baseId), id, (d || 0) + 1)),
  );
}
