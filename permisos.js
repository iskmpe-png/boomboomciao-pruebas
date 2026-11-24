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
  fotos: 2,
  inventarios: 1,
  mermas: 1,
  compras: 1,
  appcc: 1,
  planes: 1,
  turnos: 2,
  pedidos: 1,
  anuncios: 2,
  etiquetas: 1,
  tareas: 1,
};
const ACT2 = new Set([
  'enl-abrir', 'enl-todas',
  'tf-importar',
  'conv-ud',
  'sel-ini',
  'arch-zip',
  'vi-crear-todos',
  'sel-borrar',
  'sel-grupo',
  'sel-a-elab',
  'sel-a-prod',
  'gr-editar',
  'sel-mover',
  'sel-aplicar',
  'ei-importar',
  'ei-texto',
  'ei-aplicar',
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
  'tu-crear',
  'vimp-quitar',
  'vimp-repes',
  'vimp-mes',
  'cn-minimos',
  'tu-repartir',
  'tu-subir',
  'tu-add',
  'tu-borrar',
  'tu-copiar',
  'av-borrar',
]);
const ACT1 = new Set(['et-guardar', 'et-borrar', 'et-tn-guardar', 'et-tn-nueva', 'et-tn-borrar', 'et-fm-nuevo', 'et-fm-editar', 'et-fm-guardar', 'et-fm-borrar', 'arch-add', 'cerrar-inv', 'sumar-inv', 'sumar-merma', 'escanear', 'plan-sugerir', 'sc-guardar']);
const FORMNIV = {
  'form-enl': 2,
  'form-anuncio': 2,
  'form-prod': 2,
  'form-merma': 1,
  'form-mplato': 1,
  'form-compra': 1,
  'form-appcc': 1,
  'form-scan': 1,
  'form-ventas': 2,
  'form-turnos': 2,
  'form-avisop': 2,
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
  'b-cns',
  'cn-todo',
  'cn-per',
  'cn-d',
  'cn-h',
]);
const ID2 = new Set(['inv-per', 'lf-horas']);
const puede = (n) => LV[nivel] >= n;
/* ---- Áreas: un encargado de barra no cambia lo de cocina, y al revés ---- */
let miAreaV = 'todas';
const miArea = () => miAreaV;
const areaDe = (x) => (x === 'barra' || (x && x.area === 'barra') ? 'barra' : 'cocina');
/* ¿Puede este usuario cambiar algo de esa área? (a: 'barra', 'cocina', '' o un producto/plato) */
const puedeArea = (a) => puede(2) && (miAreaV === 'todas' || areaDe(a) === miAreaV);
function fijarArea(a) {
  miAreaV = a === 'cocina' || a === 'barra' ? a : 'todas';
  if (miAreaV !== 'todas') {
    /* Cada uno trabaja en su zona por defecto */
    area = miAreaV;
    if ($('area-sel')) $('area-sel').value = area;
    vigilarVista();
  }
}
function aplicarArea(r) {
  if (miAreaV === 'todas') return;
  const bloque = (el) => {
    const c = el.closest('[data-area]');
    return c ? !puedeArea(c.dataset.area) : r.dataset.area != null && !puedeArea(r.dataset.area);
  };
  r.querySelectorAll('input,select,textarea').forEach((el) => {
    if (el.type === 'search' || LIBRE.has(el.id) || el.closest('[data-libre]')) return;
    if (bloque(el)) el.disabled = true;
  });
  r.querySelectorAll('[data-act]').forEach((b) => {
    if (b.classList.contains('row') || b.closest('[data-libre]')) return;
    if ((ACT2.has(b.dataset.act) || AREA_ACT.has(b.dataset.act)) && bloque(b)) b.hidden = true;
  });
}
/* Lo que cada uno subió (un registro de limpieza, una merma, una compra) lo puede borrar él mismo
   aunque su usuario no pueda borrar lo de los demás. La base de datos lo comprueba también. */
const ACT_MIO = new Set(['ap-borrar', 'borrar-merma', 'co-borrar']);
const esMio = (x) => !!(miId && x && x.por && x.por === miId);
const mioOk = (b, a) => ACT_MIO.has(a) && b && b.dataset && b.dataset.mio === '1' && puede(1);
const AREA_ACT = new Set(['borrar-prod', 'add-ing', 'quitar-ing', 'borrar-plato', 'duplicar', 'guardar-prod', 'conv-ud']);
function aplicarPermisos() {
  const r = $('vista');
  aplicarArea(r);
  if (nivel === 'admin') return;
  const base = PANTNIV[pant] || 0;
  r.querySelectorAll('input,select,textarea').forEach((el) => {
    if (el.type === 'search' || el.type === 'file' || LIBRE.has(el.id) || el.closest('[data-libre]')) return;
    const f = el.closest('form'),
      need = ID2.has(el.id) ? 2 : f && FORMNIV[f.id] != null ? FORMNIV[f.id] : base;
    if (!puede(need)) el.disabled = true;
  });
  r.querySelectorAll('[data-act]').forEach((b) => {
    const a = b.dataset.act;
    if (b.classList.contains('row')) return;
    if (mioOk(b, a)) return;
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
  aplicarMenuRol();
  $('m-copia').hidden = n !== 'admin';
  $('rol').textContent = NIVTXT[n];
  if (n !== 'admin') vigilarVista();
  pintar();
}
function vigilarVista() {
  if (!obs) {
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
}
function permClick(b, a) {
  if (mioOk(b, a)) return false;
  if ((ACT2.has(a) && !puede(2)) || (ACT1.has(a) && !puede(1))) {
    toast('Tu usuario no tiene permiso para esto.');
    return true;
  }
  return false;
}
