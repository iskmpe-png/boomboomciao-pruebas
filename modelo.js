/* ---- Normalizadores ---- */
const nPlato = (p) => ({
  id: p.id,
  nombre: String(p.nombre || ''),
  raciones: Number(p.raciones) || 1,
  objetivo: Number(p.objetivo) || 30,
  iva: p.iva == null ? 10 : Number(p.iva) || 0,
  pvp: Number(p.pvp) || 0,
  elaboracion: String(p.elaboracion || ''),
  base: !!p.base,
  unidadBase: uni(p.unidadBase),
  grupo: String(p.grupo || ''),
  descripcion: String(p.descripcion || ''),
  vino: String(p.vino || ''),
  alergenos: Array.isArray(p.alergenos) ? p.alergenos.map(String) : [],
  caducidad: Number(p.caducidad) || 0,
  ingredientes: (Array.isArray(p.ingredientes) ? p.ingredientes : []).map((i) => ({
    nombre: String(i.nombre || ''),
    productoId: String(i.productoId || ''),
    baseId: String(i.baseId || ''),
    precio: Number(i.precio) || 0,
    unidad: uni(i.unidad),
    cantidad: Number(i.cantidad) || 0,
    merma: Number(i.merma) || 0,
  })),
});
const nProd = (p) => ({
  id: p.id,
  nombre: String(p.nombre || ''),
  proveedor: String(p.proveedor || ''),
  precio: Number(p.precio) || 0,
  unidad: uni(p.unidad),
  actualizado: String(p.actualizado || ''),
  alergenos: Array.isArray(p.alergenos) ? p.alergenos.map(String) : [],
  minimo: Number(p.minimo) || 0,
  familia: String(p.familia || ''),
  anterior: Number(p.anterior) || 0,
  historial: (Array.isArray(p.historial) ? p.historial : [])
    .slice(-12)
    .map((h) => ({ f: String(h.f || ''), p: Number(h.p) || 0 })),
});
const nInv = (v) => ({
  id: v.id,
  fecha: String(v.fecha || hoy()),
  periodo: PER[v.periodo] ? v.periodo : 'mensual',
  cerrado: !!v.cerrado,
  cantidades: v.cantidades && typeof v.cantidades === 'object' ? v.cantidades : {},
  lineas: Array.isArray(v.lineas) ? v.lineas : [],
  total: Number(v.total) || 0,
  por: String(v.por || ''),
});
const nMerma = (m) => ({
  id: m.id,
  fecha: String(m.fecha || hoy()),
  nombre: String(m.nombre || ''),
  productoId: String(m.productoId || ''),
  proveedor: String(m.proveedor || ''),
  cantidad: Number(m.cantidad) || 0,
  unidad: uni(m.unidad),
  precio: Number(m.precio) || 0,
  motivo: String(m.motivo || 'Otro'),
  creado: String(m.creado || ''),
  por: String(m.por || ''),
});
const mapa = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
const nCompra = (c) => ({
  id: c.id,
  fecha: String(c.fecha || hoy()),
  proveedor: String(c.proveedor || ''),
  albaran: String(c.albaran || ''),
  importe: Number(c.importe) || 0,
  creado: String(c.creado || ''),
  por: String(c.por || ''),
  lineas: (Array.isArray(c.lineas) ? c.lineas : []).map((l) => ({
    nombre: String(l.nombre || ''),
    productoId: String(l.productoId || ''),
    cantidad: Number(l.cantidad) || 0,
    unidad: uni(l.unidad),
    precio: Number(l.precio) || 0,
  })),
});
const nAppcc = (a) => ({
  id: a.id,
  fecha: String(a.fecha || hoy()),
  hora: String(a.hora || ''),
  tipo: ['temp', 'limpieza', 'recepcion'].indexOf(a.tipo) >= 0 ? a.tipo : 'temp',
  punto: String(a.punto || ''),
  valor: a.valor === '' || a.valor == null ? null : Number(a.valor),
  ok: a.ok !== false,
  nota: String(a.nota || ''),
  quien: String(a.quien || ''),
  por: String(a.por || ''),
});
const nVenta = (v) => ({
  id: v.id,
  unidades: mapa(v.unidades),
  semanas: mapa(v.semanas),
  importes: Array.isArray(v.importes) ? v.importes : [],
});
const nPlan = (v) => ({ id: v.id, items: mapa(v.items), hecho: mapa(v.hecho) });
const nEvento = (e) => ({
  id: e.id,
  nombre: String(e.nombre || ''),
  pax: Number(e.pax) || 0,
  precio: Number(e.precio) || 0,
  platos: (Array.isArray(e.platos) ? e.platos : []).map((x) => ({ id: String(x.id || ''), n: Number(x.n) || 0 })),
});
const nProv = (p) => ({
  id: p.id,
  nombre: String(p.nombre || ''),
  whatsapp: String(p.whatsapp || ''),
  email: String(p.email || ''),
  nota: String(p.nota || ''),
});
/* Manual de la casa: lo que el equipo necesita saber cuando el encargado no está */
const nManual = (m) => ({
  id: m.id,
  titulo: String(m.titulo || ''),
  texto: String(m.texto || ''),
  actualizado: String(m.actualizado || ''),
});
/* Preguntas que el asistente no supo responder con los datos de la casa */
const nDuda = (d) => ({ id: d.id, pregunta: String(d.pregunta || ''), fecha: String(d.fecha || ''), por: String(d.por || '') });
const NORM = {
  manual: nManual,
  dudas: nDuda,
  proveedores: nProv,
  platos: nPlato,
  productos: nProd,
  inventarios: nInv,
  mermas: nMerma,
  compras: nCompra,
  appcc: nAppcc,
  ventas: nVenta,
  planes: nPlan,
  eventos: nEvento,
};
