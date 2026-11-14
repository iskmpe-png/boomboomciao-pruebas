/* ======== Permisos, asistente, escáner de albaranes e importación de ventas ======== */
const LV = { view: 0, interact: 1, admin: 2 };
let nivel = 'admin',
  uAPI = null,
  sAPI = null,
  sLim = null,
  miId = null,
  obs = null;
const NIVTXT = { admin: 'Acceso completo', interact: 'Equipo', view: 'Solo consulta' };
const COLNIV = {
  platos: 2,
  productos: 2,
  ventas: 2,
  eventos: 2,
  ajustes: 2,
  proveedores: 2,
  manual: 2,
  dudas: 1,
  inventarios: 1,
  mermas: 1,
  compras: 1,
  appcc: 1,
  planes: 1,
};
const ACT2 = new Set([
  'tf-importar',
  'tf-aplicar',
  'man-nuevo',
  'man-editar',
  'man-borrar',
  'duda-responder',
  'duda-borrar',
  'pp-copiar',
  'nuevo-plato',
  'add-ing',
  'quitar-ing',
  'guardar-prod',
  'borrar-plato',
  'alg-plato',
  'add-prod',
  'editar-prod',
  'borrar-prod',
  'alg-prod',
  'cambiar-prov',
  'visto-alerta',
  'ev-nuevo',
  'ev-add',
  'ev-quitar',
  'ev-borrar',
  'borrar-inv',
  'borrar-merma',
  'co-borrar',
  'ap-borrar',
  'ventas-importar',
  'vi-guardar',
]);
const ACT1 = new Set(['cerrar-inv', 'sumar-inv', 'sumar-merma', 'escanear', 'plan-sugerir', 'sc-guardar']);
const FORMNIV = {
  'form-prod': 2,
  'form-merma': 1,
  'form-compra': 1,
  'form-appcc': 1,
  'form-scan': 1,
  'form-ventas': 2,
};
const PANTNIV = {
  carta: 2,
  precios: 2,
  recetas: 2,
  ingenieria: 2,
  eventos: 2,
  comparar: 2,
  alertas: 2,
  inventario: 1,
  produccion: 1,
  appcc: 1,
  compras: 1,
  mermas: 1,
  proveedores: 2,
  manual: 2,
};
const LIBRE = new Set([
  'm-mes',
  'f-grupo',
  'f-prov',
  'sel-receta',
  'r-cant',
  'r-costes',
  'sim-pvp',
  'sim-sube',
  'et-plato',
  'et-fecha',
  'et-resp',
  'ap-dia',
  'ap-per',
  'plan-fecha',
  'as-input',
  'b-carta',
  'b-prod',
  'b-inv',
  'b-sala',
]);
const ID2 = new Set(['inv-per', 'et-dias']);
const puede = (n) => LV[nivel] >= n;
function aplicarPermisos() {
  if (nivel === 'admin') return;
  const r = $('vista'),
    base = PANTNIV[pant] || 0;
  r.querySelectorAll('input,select,textarea').forEach((el) => {
    if (el.type === 'search' || el.type === 'file' || LIBRE.has(el.id) || el.closest('[data-libre]')) return;
    const f = el.closest('form'),
      need = ID2.has(el.id) ? 2 : f && FORMNIV[f.id] != null ? FORMNIV[f.id] : base;
    if (!puede(need)) el.disabled = true;
  });
  r.querySelectorAll('[data-act]').forEach((b) => {
    const a = b.dataset.act;
    if (b.classList.contains('row')) return;
    if ((ACT2.has(a) && !puede(2)) || (ACT1.has(a) && !puede(1))) b.hidden = true;
  });
  r.querySelectorAll('form').forEach((f) => {
    if (FORMNIV[f.id] != null && !puede(FORMNIV[f.id]))
      f.querySelectorAll('button[type=submit]').forEach((b) => {
        b.hidden = true;
      });
  });
  if (base > 0 && !puede(base) && !$('perm-av') && r.firstElementChild) {
    const p = document.createElement('p');
    p.id = 'perm-av';
    p.className = 'hint';
    p.textContent =
      nivel === 'view'
        ? 'Tienes acceso de solo consulta.'
        : 'Puedes consultar esta sección, pero solo el encargado puede cambiarla.';
    r.firstElementChild.after(p);
  }
}
function setNivel(n) {
  nivel = n;
  $('m-copia').hidden = n !== 'admin';
  $('rol').textContent = NIVTXT[n];
  if (n !== 'admin' && !obs) {
    let pend = false;
    obs = new MutationObserver(() => {
      if (pend) return;
      pend = true;
      queueMicrotask(() => {
        pend = false;
        aplicarPermisos();
      });
    });
    obs.observe($('vista'), { childList: true, subtree: true });
  }
  pintar();
}
function permClick(b, a) {
  if ((ACT2.has(a) && !puede(2)) || (ACT1.has(a) && !puede(1))) {
    toast('Tu usuario no tiene permiso para esto.');
    return true;
  }
  return false;
}
