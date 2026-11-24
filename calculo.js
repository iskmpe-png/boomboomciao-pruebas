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
/* Food cost que cuenta para la media general: lo que solo se vende dentro de un menú no entra,
   porque su precio suelto no es real. En su lugar cuenta el food cost del menú entero. */
const fcGen = (p) => (p.soloMenu ? null : fcDe(p));
/* Tiempos de un menú con opciones: { 'Entrante': [platos…], 'Principal': […] }.
   Un plato sin tiempo cuenta como un tiempo propio (siempre va en el menú). */
const T_SOLO = '·';
const tmpo = (x) => String((x && x.tiempo) || '').trim();
function tiemposMenu(e) {
  const t = {};
  e.platos.forEach((x) => {
    const k = tmpo(x) || T_SOLO + x.id;
    (t[k] || (t[k] = [])).push(x);
  });
  return t;
}
const costeOp = (x) => {
  const p = idx().pl.get(x.id);
  return p ? x.n * costeUd(p) : 0;
};
/* Coste por persona. Menú cerrado: todos los platos. Con opciones: de cada tiempo, la media de sus opciones. */
const costeMenu = (e) => {
  if (!e.opciones) return suma(e.platos, costeOp);
  const t = tiemposMenu(e);
  return suma(Object.keys(t), (k) => suma(t[k], costeOp) / t[k].length);
};
/* Lo más caro que puede salir (si todos eligen la opción más cara de cada tiempo) */
const costeMenuMax = (e) => {
  if (!e.opciones) return costeMenu(e);
  const t = tiemposMenu(e);
  return suma(Object.keys(t), (k) => Math.max(...t[k].map(costeOp)));
};
/* Menús vendidos a partir de los platos del TPV: de cada tiempo se suman sus opciones,
   y el total del menú es el tiempo que más vendió (cada persona toma uno de cada). */
function menusVendidos(e, uds) {
  const t = tiemposMenu(e);
  let max = 0;
  Object.keys(t).forEach((k) => {
    const s = suma(t[k], (x) => Number(uds[x.id]) || 0);
    if (s > max) max = s;
  });
  return max;
}
const fcMenu = (e) => {
  const c = costeMenu(e);
  return e.precio > 0 && c > 0 ? (c / (e.precio / 1.1)) * 100 : null;
};
const fcMenus = () => S.eventos.map(fcMenu).filter((x) => x != null);
const usos = (id) => S.platos.filter((p) => p.ingredientes.some((i) => i.productoId === id)).length;
const usosBase = (id) => S.platos.filter((p) => p.ingredientes.some((i) => i.baseId === id)).length;
const rinde = (p) =>
  fNum(p.raciones, 2) + ' ' + (p.base ? UDI[p.unidadBase] : p.raciones === 1 ? 'ración' : 'raciones');
const ordenados = (l) => l.slice().sort((a, z) => a.nombre.localeCompare(z.nombre, 'es'));
/* Grupos de la carta: primero los que ha ordenado el encargado, luego los que solo existen en alguna ficha */
function gruposCarta() {
  const l = S.ajustes.grupos.slice(),
    extra = {};
  S.platos.forEach((p) => {
    const g = p.grupo.trim();
    if (!p.base && g && l.indexOf(g) < 0) extra[g] = 1;
  });
  return l.concat(Object.keys(extra).sort((a, z) => a.localeCompare(z, 'es')));
}
/* Lo mismo para las elaboraciones de la casa */
function gruposElab() {
  const l = (S.ajustes.gruposElab || []).slice(),
    extra = {};
  S.platos.forEach((p) => {
    const g = p.grupo.trim();
    if (p.base && g && l.indexOf(g) < 0) extra[g] = 1;
  });
  return l.concat(Object.keys(extra).sort((a, z) => a.localeCompare(z, 'es')));
}
/* Los grupos de la lista que se está viendo: Platos o Elaboraciones */
const gruposLista = () => (enElab() ? gruposElab() : gruposCarta());
/* Grupo de una ficha dentro de su lista (lo que no tiene grupo va a «Sin grupo») */
const grupoLista = (p) => p.grupo.trim() || SIN_GRUPO;
const SIN_GRUPO = 'Platos'; // así se llama, por dentro, lo que no tiene grupo
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
  if (p.base) return '';
  if (fc == null) return '<span class="pill">' + (p.soloMenu ? 'En menú' : 'Sin precio') + '</span>';
  if (p.soloMenu) return '<span class="pill">En menú · ' + fNum(fc) + ' %</span>';
  const o = p.objetivo > 0 ? p.objetivo : 30;
  return '<span class="pill ' + (fc <= o ? 'ok' : fc <= o + 5 ? 'warn' : 'crit') + '">' + fNum(fc) + ' %</span>';
}
/* ---- Enlaces: cada producto y cada elaboración tiene que llegar al menos a un plato de la carta,
   directamente o a través de otras elaboraciones. Así todo lo que se compra se puede calcular. ---- */
let enlCache = null;
function enlaces() {
  if (enlCache) return enlCache;
  const P = new Map(),
    B = new Map(),
    add = (m, k, v) => {
      let s = m.get(k);
      if (!s) m.set(k, (s = new Set()));
      s.add(v);
    };
  const visita = (p, raiz, d) => {
    if (d > 6) return;
    p.ingredientes.forEach((i) => {
      if (i.productoId && prod(i.productoId)) add(P, i.productoId, raiz);
      else {
        const b = baseDe(i);
        if (b) {
          add(B, b.id, raiz);
          visita(b, raiz, d + 1);
        }
      }
    });
  };
  S.platos.filter((p) => !p.base).forEach((p) => visita(p, p.id, 0));
  enlCache = { P: P, B: B };
  return enlCache;
}
/* Platos de la carta a los que llega un producto (o una elaboración, con base=true) */
const platosDe = (id, base) => (enlaces()[base ? 'B' : 'P'].get(id) || new Set());
const elabsCon = (pid) => S.platos.filter((b) => b.base && b.ingredientes.some((i) => i.productoId === pid));
function sinEnlazar() {
  const e = enlaces();
  return S.productos
    .filter((p) => !p.general && enArea(p) && !e.P.has(p.id))
    .map((p) => ({ x: p, base: false }))
    .concat(S.platos.filter((b) => b.base && b.nombre && enArea(b) && !e.B.has(b.id)).map((b) => ({ x: b, base: true })));
}
function enlaceHTML(p) {
  if (p.general) return '<span class="pill">Uso general</span>';
  const n = platosDe(p.id).size,
    el = elabsCon(p.id).length;
  if (!n) return '<span class="pill crit">Sin enlazar a un plato</span>';
  return '<span class="enl">En ' + n + (n === 1 ? ' plato' : ' platos') + (el ? ' · ' + el + (el === 1 ? ' elaboración' : ' elaboraciones') : '') + '</span>';
}
