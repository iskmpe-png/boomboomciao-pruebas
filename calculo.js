/* ---- Datos y cálculo ---- */
const prod = (id) => (id ? idx().p.get(id) || null : null);
const prodPorNombre = (n) => {
  n = norm(n);
  return n ? idx().pn.get(n) || null : null;
};
const plato = (id) => idx().pl.get(id || platoId) || null;
const baseDe = (i) => {
  if (!i.baseId) return null;
  const b = idx().pl.get(i.baseId);
  return b && b.base ? b : null;
};
const basePorNombre = (n, salvo) => {
  n = norm(n);
  const b = n ? idx().bn.get(n) : null;
  return b && b.id !== salvo ? b : null;
};
let prof = 0;
function costeUd(b) {
  if (prof > 6) return 0;
  prof++;
  const c = costePlato(b) / (b.raciones > 0 ? b.raciones : 1);
  prof--;
  return c;
}
const enlace = (i) => prod(i.productoId) || baseDe(i);
const nom = (i) => {
  const p = prod(i.productoId);
  if (p) return p.nombre;
  const b = baseDe(i);
  return b ? b.nombre : i.nombre;
};
const pre = (i) => {
  const p = prod(i.productoId);
  if (p) return p.precio;
  const b = baseDe(i);
  return b ? costeUd(b) : i.precio;
};
const un = (i) => {
  const p = prod(i.productoId);
  if (p) return p.unidad;
  const b = baseDe(i);
  return b ? b.unidadBase : i.unidad;
};
const origen = (i) => {
  const p = prod(i.productoId);
  if (p) return p.proveedor;
  return baseDe(i) ? 'BB Ciao' : '';
};
const bruto = (i) => {
  const m = Math.min(Math.max(i.merma || 0, 0), 95) / 100;
  return (i.cantidad || 0) / (1 - m);
};
const coste = (i) => {
  const b = bruto(i);
  return un(i) === 'ud' ? b * pre(i) : (b / 1000) * pre(i);
};
const costePlato = (p) => p.ingredientes.reduce((t, i) => t + coste(i), 0);
const fcDe = (p) => {
  if (p.base || !(p.pvp > 0)) return null;
  const c = costeUd(p);
  return c > 0 ? (c / (p.pvp / (1 + (p.iva || 0) / 100))) * 100 : null;
};
const usos = (id) => S.platos.filter((p) => p.ingredientes.some((i) => i.productoId === id)).length;
const usosBase = (id) => S.platos.filter((p) => p.ingredientes.some((i) => i.baseId === id)).length;
const rinde = (p) =>
  fNum(p.raciones, 2) + ' ' + (p.base ? UDI[p.unidadBase] : p.raciones === 1 ? 'ración' : 'raciones');
const ordenados = (l) => l.slice().sort((a, z) => a.nombre.localeCompare(z.nombre, 'es'));
const grupoDe = (p) => (p.base ? G_BASE : p.grupo.trim() || 'Platos');
function abierto(crear) {
  let v = S.inventarios.filter((x) => !x.cerrado)[0];
  if (!v && crear) {
    v = nInv({ id: nuevoId('inventarios'), fecha: hoy(), periodo: S.ajustes.periodo });
    S.inventarios.push(v);
  }
  return v;
}
function pillFC(p) {
  const fc = fcDe(p);
  if (fc == null) return p.base ? '<span class="chip">Base</span>' : '<span class="pill">Sin precio</span>';
  const o = p.objetivo > 0 ? p.objetivo : 30;
  return '<span class="pill ' + (fc <= o ? 'ok' : fc <= o + 5 ? 'warn' : 'crit') + '">' + fNum(fc) + ' %</span>';
}
