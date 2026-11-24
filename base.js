const $ = (id) => document.getElementById(id);
const q = (el, s) => el.querySelector(s);
const fEurN = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
/* El equipo (cocineros, bartenders) no ve precios ni costes, salvo en Compras para cuadrar las facturas */
let sinPrecios = false;
const fEur = { format: (v) => (sinPrecios && pant !== 'compras' ? '' : fEurN.format(v)) };
const verPrecios = () => !sinPrecios || pant === 'compras';
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
    ['turnos', 'Turnos y avisos'],
  ],
  carta: [
    ['platos', 'Platos'],
    ['elaboraciones', 'Elaboraciones'],
    ['eventos', 'Menús'],
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
  control: [
    ['consumo', 'Consumo y stock'],
    ['ingenieria', 'Ingeniería de menú'],
    ['manual', 'Manual del asistente'],
  ],
  almacen: [
    ['inventario', 'Inventario'],
    ['pedidos', 'Pedidos'],
    ['compras', 'Compras'],
    ['proveedores', 'Proveedores'],
    ['mermas', 'Mermas'],
  ],
};
const sub = { inicio: 'panel', carta: 'platos', precios: 'productos', cocina: 'recetas', control: 'consumo', almacen: 'inventario' };
const LEG = {
  'carta/platos': 'carta',
  'carta/elaboraciones': 'carta',
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
  /* Direcciones antiguas (3.0: Ingeniería y el Manual pasan a Control; Sala y alérgenos se quita) */
  'carta-ingenieria': 'control-ingenieria',
  'inicio-manual': 'control-manual',
  'carta-sala': 'carta-platos',
};
const PER = { diario: 'Diario', quincenal: 'Quincenal', mensual: 'Mensual' };
const MOTIVOS = ['Caducado', 'Mal estado', 'Quemado', 'Error de cocina', 'Devolución de sala', 'Rotura o caída', 'Otro'];
const G_BASE = 'Elaboraciones de la casa';
/* En Carta, el apartado Elaboraciones enseña lo que se produce en casa para usarlo en otros escandallos */
const enElab = () => sub.carta === 'elaboraciones';

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
  fotos: [],
  turnos: [],
  pedidos: [],
  anuncios: [],
  etiquetas: [],
  tareas: [],
  ajustes: { id: 'empresa', nombre: 'Boom Boom Ciao', periodo: 'mensual', grupos: [], gruposElab: [], diasAlbaranes: 30, archivados: [], horasFotos: 24, avisos: [] },
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
  'fotos',
  'turnos',
  'pedidos',
  'anuncios',
  'etiquetas',
  'tareas',
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
let ordCarta = ''; // '', 'fc' o 'coste'
let grp = '',
  prov = '',
  editProd = null,
  addProd = false,
  invSub = 'conteo',
  invSel = '', // inventario cerrado que se está viendo en el historial
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
/* Zona de trabajo de este dispositivo: 'cocina', 'barra' o '' (todo). La recuerda cada persona. */
let area = mem('bbc.area');
if (area !== 'barra' && area !== '') area = 'cocina';
const enArea = (x) => !area || (area === 'barra' ? x.area === 'barra' : x.area !== 'barra');
const areaNueva = () => (area === 'barra' ? 'barra' : '');
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
  : { xlsx: 'xlsx.full.min.js', pdf: 'pdf.min.js', pdfWorker: 'pdf.worker.min.js' };
