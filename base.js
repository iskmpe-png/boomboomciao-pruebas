const $ = (id) => document.getElementById(id);
const q = (el, s) => el.querySelector(s);
const fEur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const fNum = (v, d) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: d == null ? 1 : d }).format(v);
const parse = (s) => {
  const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) ? n : 0;
};
const show = (n) => (n ? String(n).replace('.', ',') : '');
const r3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;
const esc = (s) =>
  String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const uni = (u) => (u === 'l' || u === 'ud' ? u : 'kg');
const pad = (n) => String(n).padStart(2, '0');
const hoy = () => {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};
const fFecha = (s) => {
  const d = s && s.length <= 10 ? new Date(s + 'T12:00:00') : new Date(s);
  return isNaN(d) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fMes = (m) => {
  const d = new Date(m + '-15T12:00:00');
  const t = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const UD = { kg: 'g', l: 'ml', ud: 'ud' },
  UDP = { kg: '€/kg', l: '€/L', ud: '€/ud' },
  UDI = { kg: 'kg', l: 'L', ud: 'ud' };
const SUBS = {
  inicio: [
    ['panel', 'Panel'],
    ['asistente', 'Asistente'],
    ['manual', 'Manual'],
  ],
  carta: [
    ['platos', 'Platos'],
    ['sala', 'Sala y alérgenos'],
    ['ingenieria', 'Ingeniería'],
    ['eventos', 'Eventos'],
  ],
  precios: [
    ['productos', 'Productos'],
    ['comparar', 'Comparar'],
    ['alertas', 'Alertas'],
  ],
  cocina: [
    ['recetas', 'Recetas'],
    ['produccion', 'Producción'],
    ['etiquetas', 'Etiquetas'],
    ['appcc', 'APPCC'],
  ],
  almacen: [
    ['inventario', 'Inventario'],
    ['pedidos', 'Pedidos'],
    ['compras', 'Compras'],
    ['proveedores', 'Proveedores'],
    ['mermas', 'Mermas'],
  ],
};
const sub = { inicio: 'panel', carta: 'platos', precios: 'productos', cocina: 'recetas', almacen: 'inventario' };
const LEG = {
  'carta/platos': 'carta',
  'precios/productos': 'precios',
  'cocina/recetas': 'recetas',
  'almacen/inventario': 'inventario',
  'almacen/mermas': 'mermas',
};
const ALIAS = {
  escandallos: 'carta',
  proveedores: 'precios',
  recetas: 'cocina-recetas',
  inventario: 'almacen-inventario',
  mermas: 'almacen-mermas',
};
const PER = { diario: 'Diario', quincenal: 'Quincenal', mensual: 'Mensual' };
const MOTIVOS = ['Caducado', 'Mal estado', 'Error de cocina', 'Devolución de sala', 'Rotura o caída', 'Otro'];
const G_BASE = 'Elaboraciones de la casa';

const S = {
  platos: [],
  productos: [],
  inventarios: [],
  mermas: [],
  compras: [],
  appcc: [],
  ventas: [],
  planes: [],
  eventos: [],
  proveedores: [],
  manual: [],
  dudas: [],
  ajustes: { id: 'empresa', nombre: 'Boom Boom Ciao', periodo: 'mensual' },
};
const COLS = [
  'platos',
  'productos',
  'inventarios',
  'mermas',
  'compras',
  'appcc',
  'ventas',
  'planes',
  'eventos',
  'proveedores',
  'manual',
  'dudas',
];
const cargado = {};
let vista = 'inicio',
  pant = 'panel',
  platoId = null,
  abierta = false,
  recetaId = null,
  db = null,
  soloLectura = false,
  conCostes = false;
const fil = { carta: '', precios: '', inv: '', sala: '' },
  lim = { carta: 20, precios: 25, inv: 20, mermas: 25, sala: 20, appcc: 25, compras: 25, hist: 30, tarifa: 40 };
let grp = '',
  prov = '',
  editProd = null,
  addProd = false,
  invSub = 'conteo',
  mesM = hoy().slice(0, 7);
const pend = {};

const aviso = (t) => {
  const a = $('aviso');
  a.textContent = t || '';
  a.hidden = !t;
};
const estado = (t) => {
  $('guardado').textContent = t;
};
const PFX = window.BBC_SUPABASE && window.BBC_SUPABASE.entorno === 'pruebas' ? 'pru.' : '';
function mem(k, v) {
  k = PFX + k;
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
  } catch (e) {}
  return null;
}
let tt;
function toast(t) {
  const el = $('toast');
  el.textContent = t;
  el.hidden = false;
  clearTimeout(tt);
  tt = setTimeout(() => {
    el.hidden = true;
  }, 3500);
}

/* Librerías que se cargan solo cuando hacen falta (leer Excel y PDF) */
const LIBS = window.claude
  ? {
      xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
      pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    }
  : { xlsx: 'vendor/xlsx.full.min.js', pdf: 'vendor/pdf.min.js', pdfWorker: 'vendor/pdf.worker.min.js' };
