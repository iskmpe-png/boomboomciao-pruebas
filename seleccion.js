/* ---- Selección múltiple: mover fichas entre Platos y Elaboraciones y cambiar varios productos a la vez ---- */
let selModo = ''; // '', 'carta' o 'precios'
const selIds = new Set();
const selCaja = (id) => '<i class="selbox" aria-hidden="true"></i>';
function selBarHTML() {
  const bt = (act, txt, cls, attrs) => '<button class="btn small' + (cls ? ' ' + cls : '') + '" type="button" data-act="' + act + '"' + (attrs || '') + '>' + txt + '</button>';
  /* Mover de zona: se ofrece la otra (o las dos si se ve todo) */
  const zona = (area !== 'barra' ? bt('sel-zona', 'Pasar a Barra', '', ' data-a="barra"') : '') + (area !== 'cocina' ? bt('sel-zona', 'Pasar a Cocina', '', ' data-a=""') : '');
  let acc = '';
  if (selModo === 'carta')
    acc = enElab()
      ? '<div class="selgrupo"><select id="sel-grupo" aria-label="Grupo de elaboraciones">' + gruposElab().map((g) => '<option>' + esc(g) + '</option>').join('') + '<option value="">Sin grupo</option></select>' +
        bt('sel-grupo', 'Poner en el grupo', 'primary') + '</div>' +
        bt('sel-mover', 'Pasar a Platos', '', ' data-a="plato"') + bt('sel-a-prod', 'Pasar a Productos') + zona
      : '<div class="selgrupo"><select id="sel-grupo" aria-label="Grupo de la carta">' + gruposCarta().map((g) => '<option>' + esc(g) + '</option>').join('') + '<option value="">Sin grupo</option></select>' +
        bt('sel-grupo', 'Poner en el grupo', 'primary') + '</div>' +
        bt('sel-menu', 'Crear un menú con ellos') + bt('sel-mover', 'Pasar a Elaboraciones', '', ' data-a="elab"') + zona;
  else if (selModo === 'precios')
    acc =
      '<div class="selgrupo"><select id="sel-campo" aria-label="Qué cambiar"><option value="proveedor">Proveedor</option><option value="familia">Grupo para comparar</option></select>' +
      '<input id="sel-valor" type="text" list="dl-proveedores" autocomplete="off" aria-label="Nuevo valor" placeholder="Nuevo proveedor">' +
      bt('sel-aplicar', 'Cambiar', 'primary') + '</div>' +
      bt('sel-a-elab', 'Pasar a Elaboraciones') + zona;
  else return '';
  /* Barra fija abajo, como en las apps del móvil: no tapa la lista mientras se marca */
  return (
    '<div class="selbar"><div class="selbar-top"><b id="sel-n"></b>' + bt('sel-todos', 'Todos') +
    '<details class="selacc"><summary class="btn primary small">Acciones</summary><div class="selbar-acc">' + acc + bt('sel-borrar', 'Eliminar', 'peligro') + '</div></details>' +
    bt('sel-fin', 'Terminar') + '</div></div>'
  );
}
/* Fila de producto mientras se selecciona: se marca, no se edita */
const selFilaProd = (p) =>
  '<button class="row selrow" type="button" data-act="sel" data-id="' + esc(p.id) + '" aria-pressed="' + selIds.has(p.id) + '"><span class="n"><b>' + selCaja() + esc(p.nombre) + '</b><span>' + esc(metaProd(p)) +
  '</span></span><span class="d"><b>' + fEur.format(p.precio) + '</b><span class="hint">' + UDP[p.unidad].slice(1) + '</span></span></button>';
function selCuenta() {
  document.body.classList.toggle('seleccionando', !!selModo);
  const n = $('sel-n');
  if (n) n.textContent = selIds.size + (selIds.size === 1 ? ' marcado' : ' marcados');
}
function selFin() {
  document.body.classList.remove('seleccionando');
  if (!selModo) return;
  selModo = '';
  selIds.clear();
}
/* Lo que rinde una ficha que pasa a ser elaboración: la suma de sus ingredientes, si no se había tocado */
function selRinde(p) {
  const g = p.ingredientes.reduce((t, i) => t + (un(i) === 'ud' ? 0 : i.cantidad), 0);
  return p.raciones === 1 && g > 0 ? r3(g / 1000) : p.raciones;
}
function selMover(aElab) {
  const l = S.platos.filter((p) => selIds.has(p.id) && !!p.base !== aElab);
  if (!l.length) {
    toast('Marca primero las fichas que quieres mover.');
    return;
  }
  l.forEach((p) => {
    if (aElab) {
      p.raciones = selRinde(p);
      p.unidadBase = 'kg';
      p.soloMenu = false;
    }
    /* Los grupos de Platos y de Elaboraciones son distintos: al cambiar de lista se queda sin grupo */
    if (p.base !== aElab) p.grupo = '';
    p.base = aElab;
    guardar('platos', p, true);
  });
  selFin();
  sucio();
  pintar();
  toast(
    aElab
      ? (l.length === 1 ? '1 ficha pasada' : l.length + ' fichas pasadas') + ' a Elaboraciones. Revisa en cada una cuánto rinde.'
      : (l.length === 1 ? '1 ficha pasada' : l.length + ' fichas pasadas') + ' a Platos. Ponles raciones y precio de carta.',
  );
}
function selAplicar() {
  const campo = $('sel-campo').value === 'familia' ? 'familia' : 'proveedor',
    valor = $('sel-valor').value.trim(),
    l = S.productos.filter((p) => selIds.has(p.id));
  if (!l.length) {
    toast('Marca primero los productos que quieres cambiar.');
    return;
  }
  if (campo === 'proveedor' && !valor) {
    toast('Escribe el proveedor que quieres poner.');
    $('sel-valor').focus();
    return;
  }
  const filas = l.filter((p) => p[campo] !== valor);
  filas.forEach((p) => (p[campo] = valor));
  sucio();
  /* Con la base de datos propia se sube todo de una vez; si no, de uno en uno */
  if (filas.length && db && db.lote && !sinRed) {
    estado('Guardando…');
    db.lote(filas.map((p) => ['productos', p.id, limpio(p)])).then(
      () => estado('Cambios guardados'),
      () => filas.forEach((p) => guardar('productos', p, true)),
    );
  } else filas.forEach((p) => guardar('productos', p, true));
  selFin();
  pintar();
  toast((campo === 'proveedor' ? 'Proveedor' : 'Grupo para comparar') + ' cambiado en ' + l.length + (l.length === 1 ? ' producto.' : ' productos.'));
}
/* Varias fichas al mismo grupo. Se sigue en modo selección para ir repartiendo el resto */
function selGrupo() {
  const g = $('sel-grupo').value,
    el = enElab(),
    l = S.platos.filter((p) => selIds.has(p.id) && !!p.base === el);
  if (!l.length) {
    toast(el ? 'Marca primero las elaboraciones que quieres poner en el grupo.' : 'Marca primero los platos que quieres poner en el grupo.');
    return;
  }
  l.forEach((p) => {
    if (p.grupo.trim() === g) return;
    p.grupo = g;
    guardar('platos', p, true);
  });
  selIds.clear();
  pintar();
  if ($('sel-grupo')) $('sel-grupo').value = g;
  toast((el ? (l.length === 1 ? '1 elaboración' : l.length + ' elaboraciones') : l.length === 1 ? '1 plato' : l.length + ' platos') + (g ? ' en «' + g + '».' : ' sin grupo.'));
}
/* Un producto comprado que en realidad se hace en casa: pasa a ser una elaboración.
   Conserva su precio como coste hasta que se le pongan los ingredientes de verdad. */
function selProdAElab() {
  const l = S.productos.filter((p) => selIds.has(p.id));
  if (!l.length) {
    toast('Marca primero los productos que son elaboraciones.');
    return;
  }
  let hechos = 0,
    saltados = 0;
  l.forEach((p) => {
    const ya = S.platos.find((x) => norm(x.nombre) === norm(p.nombre));
    if (ya && (!ya.base || ya.unidadBase !== p.unidad)) {
      saltados++;
      return;
    }
    const b =
      ya ||
      nPlato({
        area: p.area,
        id: nuevoId('platos'),
        nombre: p.nombre,
        base: true,
        unidadBase: p.unidad,
        raciones: 1,
        alergenos: p.alergenos,
        ingredientes: p.precio > 0 ? [{ nombre: 'Coste anterior (cámbialo por los ingredientes)', precio: p.precio, unidad: p.unidad, cantidad: p.unidad === 'ud' ? 1 : 1000 }] : [],
      });
    if (!ya) S.platos.push(b);
    sucio();
    S.platos.forEach((pl) => {
      let toca = pl === b && !ya;
      pl.ingredientes.forEach((i) => {
        if (i.productoId !== p.id || pl.id === b.id) return;
        i.productoId = '';
        i.baseId = b.id;
        i.nombre = b.nombre;
        i.unidad = b.unidadBase;
        i.precio = r3(costeUd(b));
        toca = true;
      });
      if (toca) guardar('platos', pl, true);
    });
    borrar('productos', p.id);
    hechos++;
  });
  selFin();
  sucio();
  pintar();
  toast(
    (hechos === 1 ? '1 producto pasado' : hechos + ' productos pasados') + ' a Elaboraciones' + (hechos ? ': ábrelos en Carta › Elaboraciones para ponerles sus ingredientes.' : '.') +
      (saltados ? ' ' + saltados + ' no se movieron porque ya hay una ficha con ese nombre.' : ''),
  );
}
/* Una elaboración que en realidad se compra hecha: pasa a ser un producto con su coste como precio */
function selElabAProd() {
  const l = S.platos.filter((b) => selIds.has(b.id) && b.base);
  if (!l.length) {
    toast('Marca primero las elaboraciones que quieres pasar a productos.');
    return;
  }
  let hechos = 0,
    saltados = 0;
  const ahora = new Date().toISOString();
  l.forEach((b) => {
    if (prodPorNombre(b.nombre)) {
      saltados++;
      return;
    }
    const p = nProd({ area: b.area, id: nuevoId('productos'), nombre: b.nombre, proveedor: '', precio: r3(costeUd(b)), unidad: b.unidadBase, alergenos: b.alergenos, actualizado: ahora });
    S.productos.push(p);
    S.platos.forEach((pl) => {
      let toca = false;
      pl.ingredientes.forEach((i) => {
        if (i.baseId !== b.id) return;
        i.baseId = '';
        i.productoId = p.id;
        i.nombre = p.nombre;
        i.unidad = p.unidad;
        i.precio = p.precio;
        toca = true;
      });
      if (toca && pl.id !== b.id) guardar('platos', pl, true);
    });
    guardar('productos', p, true);
    borrar('platos', b.id);
    hechos++;
  });
  selFin();
  sucio();
  pintar();
  toast(
    (hechos === 1 ? '1 elaboración pasada' : hechos + ' elaboraciones pasadas') + ' a Productos' + (hechos ? ': ya están en Precios, sin proveedor.' : '.') +
      (saltados ? ' ' + saltados + ' no se movieron porque ya hay un producto con ese nombre.' : ''),
  );
}
/* Cambia de zona (cocina o barra) todo lo marcado */
function selZona(dest) {
  const prods = selModo === 'precios',
    l = (prods ? S.productos : S.platos).filter((x) => selIds.has(x.id) && x.area !== dest);
  if (!selIds.size) {
    toast('Marca primero lo que quieres mover.');
    return;
  }
  enLote(() => l.forEach((x) => {
    x.area = dest;
    guardar(prods ? 'productos' : 'platos', x, true);
  }));
  const n = selIds.size;
  selFin();
  sucio();
  pintar();
  toast((n === 1 ? '1 elemento pasado' : n + ' elementos pasados') + ' a ' + (dest === 'barra' ? 'Barra' : 'Cocina') + (area && area !== (dest || 'cocina') ? ': cambia la zona arriba para verlos.' : '.'));
}
/* Borra de una vez todo lo marcado. Las fichas que usaban un producto o una elaboración
   borrados se quedan con su nombre y su último precio, como al borrar uno solo. */
function selBorrar() {
  const prods = selModo === 'precios',
    l = prods ? S.productos.filter((p) => selIds.has(p.id)) : S.platos.filter((p) => selIds.has(p.id));
  if (!l.length) return;
  const ids = new Set(l.map((x) => x.id));
  enLote(() => {
    S.platos.forEach((pl) => {
      if (!prods && ids.has(pl.id)) return;
      let ch = false;
      pl.ingredientes.forEach((i) => {
        const o = prods ? (ids.has(i.productoId) ? prod(i.productoId) : null) : ids.has(i.baseId) ? plato(i.baseId) : null;
        if (!o) return;
        i.nombre = o.nombre;
        if (prods) {
          i.precio = o.precio;
          i.unidad = o.unidad;
          i.productoId = '';
        } else {
          i.precio = r3(costeUd(o));
          i.unidad = o.unidadBase;
          i.baseId = '';
        }
        ch = true;
      });
      if (ch) guardar('platos', pl, true);
    });
    /* Los platos borrados salen también de los menús */
    if (!prods)
      S.eventos.forEach((ev) => {
        const n = ev.platos.length;
        ev.platos = ev.platos.filter((x) => !ids.has(x.id));
        if (ev.platos.length !== n) guardar('eventos', ev, true);
      });
    l.forEach((x) => {
      borrar(prods ? 'productos' : 'platos', x.id);
      if (!prods && fotoDe(x.id)) borrar('fotos', x.id);
    });
  });
  selFin();
  sucio();
  pintar();
  pintaDeshacer(true);
  toast((l.length === 1 ? '1 eliminado' : l.length + ' eliminados') + '. Puedes recuperarlos con «Deshacer».');
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'sel-zona') selZona(b.dataset.a);
  else if (a === 'sel-menu') selMenu();
  else if (a === 'sel-borrar') {
    if (!selIds.size) toast('Marca primero lo que quieres eliminar.');
    else if (confirmar(b, 'Eliminar ' + selIds.size + ': pulsa otra vez')) selBorrar();
  } else if (a === 'sel-grupo') selGrupo();
  else if (a === 'sel-a-elab') selProdAElab();
  else if (a === 'sel-a-prod') {
    if (!selIds.size) toast('Marca primero las elaboraciones que quieres pasar a productos.');
    else if (confirmar(b, 'Se borra su receta: pulsa otra vez')) selElabAProd();
  } else if (a === 'grupo') {
    grp = b.dataset.g;
    lim.carta = 20;
    pintar();
  } else if (a === 'sel-ini') {
    finEdicion();
    editProd = null;
    selIds.clear();
    selModo = b.dataset.m;
    pintar();
  } else if (a === 'sel-fin') {
    selFin();
    pintar();
  } else if (a === 'sel') {
    const id = b.dataset.id;
    if (selIds.has(id)) selIds.delete(id);
    else selIds.add(id);
    b.setAttribute('aria-pressed', selIds.has(id));
    selCuenta();
  } else if (a === 'sel-todos') {
    const l = selModo === 'carta' ? filtradosCarta() : filtradosProd('precios'),
      todos = l.length && l.every((p) => selIds.has(p.id));
    l.forEach((p) => (todos ? selIds.delete(p.id) : selIds.add(p.id)));
    pintar();
  } else if (a === 'sel-mover') selMover(b.dataset.a === 'elab');
  else if (a === 'sel-aplicar') selAplicar();
});
V.addEventListener('change', (e) => {
  if (e.target.id !== 'sel-campo') return;
  const prov = e.target.value === 'proveedor';
  $('sel-valor').setAttribute('list', prov ? 'dl-proveedores' : '');
  $('sel-valor').placeholder = prov ? 'Nuevo proveedor' : 'Ej. huevo (vacío = automático)';
});
/* Al cambiar de pantalla se sale de la selección */
window.addEventListener('hashchange', selFin);
