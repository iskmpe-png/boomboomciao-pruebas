/* ---- Normalizadores ---- */
/* Ajustes del restaurante. "grupos" son las subdivisiones de la carta, en el orden que elige el encargado */
const nAjustes = (a) => ({
  id: 'empresa',
  nombre: String((a && a.nombre) || ''),
  periodo: a && PER[a.periodo] ? a.periodo : 'mensual',
  grupos: (a && Array.isArray(a.grupos) ? a.grupos : [])
    .map((g) => String(g || '').trim().slice(0, 60))
    .filter((g, i, l) => g && l.indexOf(g) === i),
  /* Grupos de las elaboraciones (salsas, masas, caldos…), en su orden */
  gruposElab: (a && Array.isArray(a.gruposElab) ? a.gruposElab : [])
    .map((g) => String(g || '').trim().slice(0, 60))
    .filter((g, i, l) => g && l.indexOf(g) === i),
  /* Archivo de albaranes: días que se guardan y meses ya descargados en ZIP */
  diasAlbaranes: Number(a && a.diasAlbaranes) >= 7 ? Math.min(365, Number(a.diasAlbaranes)) : 30,
  archivados: (a && Array.isArray(a.archivados) ? a.archivados : []).filter((m) => /^\d{4}-\d{2}$/.test(m)),
  /* Horas que se guardan las fotos de limpieza (de 1 a 48) y avisos personalizados al móvil */
  horasFotos: Number(a && a.horasFotos) >= 1 ? Math.min(48, Math.round(Number(a.horasFotos))) : 24,
  avisos: (a && Array.isArray(a.avisos) ? a.avisos : []).filter((x) => x && x.id).slice(0, 40).map(nAvisoP),
});
const HORA = (h) => (/^\d{2}:\d{2}$/.test(h || '') ? h : '');
const nAvisoP = (x) => ({
  id: String(x.id),
  titulo: String(x.titulo || '').slice(0, 60),
  texto: String(x.texto || '').slice(0, 200),
  hora: HORA(x.hora) || '10:00',
  dias: (Array.isArray(x.dias) ? x.dias : []).map(Number).filter((d, i, l) => d >= 0 && d <= 6 && l.indexOf(d) === i),
  para: ['todos', 'encargados', 'personas'].indexOf(x.para) >= 0 ? x.para : 'todos',
  personas: String(x.personas || '').slice(0, 200),
  activo: x.activo !== false,
});
/* Semana del horario de turnos: el id es el lunes (AAAA-MM-DD). Cada fila es una tarea o un rol,
   con quién la hace cada día por la mañana (am) y por la tarde (pm) y a qué hora se avisa. */
const diasMapa = (o) => {
  const r = {};
  Object.keys(mapa(o)).forEach((k) => {
    const t = String(o[k] || '').trim().slice(0, 80);
    if (/^[0-6]$/.test(k) && t) r[k] = t;
  });
  return r;
};
const TURNO_D = ['am', 'pm', 'completo', 'libre'];
const nTurno = (t) => ({
  id: t.id,
  /* Horario de trabajo de la semana (de donde sale el reparto de la limpieza) */
  horario: (Array.isArray(t.horario) ? t.horario : []).filter((x) => x && x.nombre).slice(0, 60).map((x) => {
    const dias = {};
    Object.keys(mapa(x.dias)).forEach((k) => {
      if (/^[0-6]$/.test(k) && TURNO_D.indexOf(x.dias[k]) >= 0) dias[k] = x.dias[k];
    });
    return { nombre: String(x.nombre).slice(0, 60), dias: dias, horas: diasMapa(x.horas) };
  }),
  filas: (Array.isArray(t.filas) ? t.filas : []).filter((f) => f && f.id).slice(0, 30).map((f) => ({
    id: String(f.id),
    tarea: String(f.tarea || '').slice(0, 80),
    nota: String(f.nota || '').slice(0, 160),
    excluir: String(f.excluir || '').slice(0, 200),
    horaAm: HORA(f.horaAm),
    horaPm: HORA(f.horaPm),
    am: diasMapa(f.am),
    pm: diasMapa(f.pm),
  })),
});
/* Pedido enviado a un proveedor: se guarda para cuadrarlo después con el albarán */
const nPedido = (p) => ({
  id: p.id,
  fecha: String(p.fecha || hoy()),
  proveedor: String(p.proveedor || ''),
  enviado: String(p.enviado || ''),
  por: String(p.por || ''),
  compraId: String(p.compraId || ''),
  lineas: (Array.isArray(p.lineas) ? p.lineas : []).map((l) => ({
    nombre: String(l.nombre || ''),
    productoId: String(l.productoId || ''),
    cantidad: Number(l.cantidad) || 0,
    unidad: uni(l.unidad),
  })),
});
const nPlato = (p) => ({
  id: p.id,
  nombre: String(p.nombre || ''),
  raciones: Number(p.raciones) || 1,
  objetivo: Number(p.objetivo) || 30,
  iva: p.iva == null ? 10 : Number(p.iva) || 0,
  pvp: Number(p.pvp) || 0,
  elaboracion: String(p.elaboracion || ''),
  base: !!p.base,
  soloMenu: !!p.soloMenu,
  area: p.area === 'barra' ? 'barra' : '',
  /* Otros nombres con los que sale en el TPV (para reconocerlo en los informes de ventas) */
  alias: (Array.isArray(p.alias) ? p.alias : []).map((a) => String(a || '').trim().slice(0, 80)).filter(Boolean).slice(0, 12),
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
  /* Grupo para comparar que asigna la IA (producto + variedad + presentación) y el nombre que tenía entonces */
  ...(p.clave ? { clave: String(p.clave).slice(0, 60), claveDe: String(p.claveDe || '') } : {}),
  area: p.area === 'barra' ? 'barra' : '',
  /* Uso general de la cocina (aceite de freidora, gas del soplete…): no va en ningún escandallo */
  general: !!p.general,
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
  /* Un plato entero que se tira (quemado, devuelto…): se valora a su coste de producción */
  platoId: String(m.platoId || ''),
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
  /* Quién recibió la mercancía (obligatorio) y las pruebas guardadas en el archivo de albaranes */
  recibe: String(c.recibe || ''),
  archivos: (Array.isArray(c.archivos) ? c.archivos : [])
    .filter((a) => a && typeof a.ruta === 'string')
    .map((a) => ({
      ruta: a.ruta,
      nombre: String(a.nombre || ''),
      tipo: ['foto', 'pdf', 'hoja'].indexOf(a.tipo) >= 0 ? a.tipo : 'foto',
      tam: Number(a.tam) || 0,
      subido: String(a.subido || ''),
      por: String(a.por || ''),
      ...(a.pendiente ? { pendiente: true } : {}),
      ...(a.borrado ? { borrado: String(a.borrado) } : {}),
    })),
  lineas: (Array.isArray(c.lineas) ? c.lineas : []).map((l) => ({
    nombre: String(l.nombre || ''),
    productoId: String(l.productoId || ''),
    cantidad: Number(l.cantidad) || 0,
    unidad: uni(l.unidad),
    precio: Number(l.precio) || 0,
    /* Lo que ponía el albarán y cómo se pasó a kg/L (10 ud × 250 ml a 5 €): para revisarlo después */
    ...(l.desc ? { desc: String(l.desc).slice(0, 160) } : {}),
    ...(l.conv && Number(l.conv.c) > 0 ? { conv: { n: Number(l.conv.n) || 0, c: Number(l.conv.c), u: l.conv.u === 'l' ? 'l' : 'kg', pud: Number(l.conv.pud) || 0 } } : {}),
  })),
  /* Cambios que pidió cocina al subir el albarán y que el encargado tiene que aprobar:
     producto nuevo, cambio de precio o de formato (unidad) */
  pendientes: (Array.isArray(c.pendientes) ? c.pendientes : [])
    .filter((x) => x && ['nuevo', 'precio', 'formato'].indexOf(x.tipo) >= 0)
    .map((x) => ({
      id: String(x.id || ''),
      tipo: x.tipo,
      k: Number(x.k) || 0,
      pid: String(x.pid || ''),
      nombre: String(x.nombre || ''),
      unidad: uni(x.unidad),
      precio: Number(x.precio) || 0,
      de: String(x.de == null ? '' : x.de),
      area: x.area === 'barra' ? 'barra' : '',
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
  /* Fotos de limpieza: duran unas horas en la nube y luego se borran solas (queda el registro) */
  fotos: (Array.isArray(a.fotos) ? a.fotos : [])
    .filter((f) => f && typeof f.ruta === 'string')
    .map((f) => ({ ruta: f.ruta, tam: Number(f.tam) || 0, subido: String(f.subido || ''), ...(f.pendiente ? { pendiente: true } : {}) })),
  fotosBorradas: Number(a.fotosBorradas) || 0,
});
const nVenta = (v) => ({
  id: v.id,
  unidades: mapa(v.unidades),
  semanas: mapa(v.semanas),
  importes: Array.isArray(v.importes) ? v.importes : [],
  /* Menús vendidos en el mes y platos vendidos dentro de menús (no cuentan con su precio de carta) */
  menus: mapa(v.menus),
  enMenu: mapa(v.enMenu),
});
/* Foto de un plato: una miniatura JPEG pequeña guardada como texto, con el id del plato */
const nFoto = (f) => ({ id: f.id, img: /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/.test(String(f.img || '')) ? String(f.img) : '' });
const nPlan = (v) => ({ id: v.id, items: mapa(v.items), hecho: mapa(v.hecho) });
const nEvento = (e) => ({
  id: e.id,
  nombre: String(e.nombre || ''),
  pax: Number(e.pax) || 0,
  precio: Number(e.precio) || 0,
  enCarta: !!e.enCarta,
  /* Menú con opciones: cada cliente elige un plato de cada tiempo (entrante, principal, postre…).
     Si no, es un menú cerrado: cada persona come todos los platos (como el de Nochevieja). */
  opciones: !!e.opciones,
  platos: (Array.isArray(e.platos) ? e.platos : []).map((x) => ({ id: String(x.id || ''), n: Number(x.n) || 0, tiempo: String(x.tiempo || '').slice(0, 40) })),
});
const nProv = (p) => ({
  id: p.id,
  nombre: String(p.nombre || ''),
  whatsapp: String(p.whatsapp || ''),
  email: String(p.email || ''),
  nota: String(p.nota || ''),
  /* Días en que acepta pedidos (0 = domingo … 6 = sábado), hora límite y con cuántas horas avisar */
  diasPedido: (Array.isArray(p.diasPedido) ? p.diasPedido : []).map(Number).filter((d) => d >= 0 && d <= 6),
  horaPedido: /^\d{2}:\d{2}$/.test(p.horaPedido || '') ? p.horaPedido : '',
  avisoHoras: Number(p.avisoHoras) > 0 ? Math.min(48, Number(p.avisoHoras)) : 5,
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
/* Anuncios del tablón (los publican dueño y encargados) */
const nAnuncio = (a) => ({
  id: a.id,
  titulo: String(a.titulo || '').slice(0, 120),
  texto: String(a.texto || '').slice(0, 2000),
  fecha: String(a.fecha || ''),
  por: String(a.por || ''),
  porNombre: String(a.porNombre || ''),
  fijado: !!a.fijado,
});
/* Etiquetas guardadas: elaboraciones que no están en la carta, o etiquetas con datos propios */
/* Tareas del día del tablón: qué hay que hacer, cuánto se hizo y quién lo hizo */
const nTarea = (t) => ({
  id: t.id,
  fecha: /^\d{4}-\d{2}-\d{2}$/.test(t.fecha || '') ? t.fecha : hoy(),
  texto: String(t.texto || '').slice(0, 120),
  cant: String(t.cant || '').slice(0, 40),
  area: t.area === 'barra' ? 'barra' : '',
  orden: Number(t.orden) || 0,
  hecha: !!t.hecha,
  hechaCant: String(t.hechaCant || '').slice(0, 40),
  hechaPor: String(t.hechaPor || '').slice(0, 60),
  hechaEn: String(t.hechaEn || ''),
  /* Si viene de otro día (no se terminó), la fecha en que se apuntó por primera vez */
  desde: /^\d{4}-\d{2}-\d{2}$/.test(t.desde || '') ? t.desde : '',
  por: String(t.por || ''),
  porNombre: String(t.porNombre || '').slice(0, 60),
});
/* La colección «etiquetas» guarda tres cosas: etiquetas sueltas (tipo ''), listas por estación
   (tipo 'lista': nombres con cuántas copias de cada una) y formatos de impresión (tipo 'formato') */
const CAMPOS_ET = ['elab', 'cad', 'alg', 'cons', 'nota', 'lote', 'resp'];
/* Lo que se cambió a mano en una etiqueta de una lista (nombre, días, alérgenos…) */
const edEt = (e) => {
  if (!e || typeof e !== 'object') return null;
  const o = {};
  if (e.nombre !== undefined) o.nombre = String(e.nombre).slice(0, 60);
  if (Number(e.dias) >= 0 && e.dias !== undefined && e.dias !== '') o.dias = Math.min(365, Math.round(Number(e.dias)));
  if (Array.isArray(e.alg)) o.alg = e.alg.map(String);
  if (e.conserva !== undefined) o.conserva = String(e.conserva).slice(0, 30);
  if (e.nota !== undefined) o.nota = String(e.nota).slice(0, 24);
  return Object.keys(o).length ? o : null;
};
const nEtiqueta = (e) => {
  const tipo = e.tipo === 'lista' || e.tipo === 'formato' ? e.tipo : '',
    x = { id: e.id, tipo: tipo, nombre: String(e.nombre || '').slice(0, 80), area: e.area === 'barra' ? 'barra' : '' };
  if (tipo === 'lista') {
    x.items = (Array.isArray(e.items) ? e.items : [])
      .filter((i) => i && i.ref)
      .slice(0, 80)
      .map((i) => {
        const o = { ref: String(i.ref), n: Math.min(50, Math.max(0, Math.round(Number(i.n) || 0))) };
        if (i.nombre) o.nombre = String(i.nombre).slice(0, 60);
        if (i.f) o.f = String(i.f).slice(0, 40);
        const ed = edEt(i.ed);
        if (ed) o.ed = ed;
        return o;
      });
    x.formato = String(e.formato || '');
  } else if (tipo === 'formato') {
    const c = e.campos || {};
    x.campos = {};
    CAMPOS_ET.forEach((k) => (x.campos[k] = !!c[k]));
    x.tit = ['m', 'l', 'xl'].indexOf(e.tit) >= 0 ? e.tit : 'l';
    x.centro = !!e.centro;
  } else {
    x.dias = Number(e.dias) > 0 ? Math.min(365, Math.round(Number(e.dias))) : 3;
    x.alergenos = (Array.isArray(e.alergenos) ? e.alergenos : []).map(String);
    x.conserva = String(e.conserva || '');
    x.nota = String(e.nota || '').slice(0, 60);
  }
  return x;
};
const NORM = {
  anuncios: nAnuncio,
  tareas: nTarea,
  etiquetas: nEtiqueta,
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
  fotos: nFoto,
  planes: nPlan,
  eventos: nEvento,
  turnos: nTurno,
  pedidos: nPedido,
};
