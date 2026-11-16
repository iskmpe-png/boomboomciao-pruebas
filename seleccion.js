/* ---- Selección múltiple: mover fichas entre Platos y Elaboraciones y cambiar varios productos a la vez ---- */
let selModo = ''; // '', 'carta' o 'precios'
const selIds = new Set();
const selCaja = (id) => '<i class="selbox" aria-hidden="true"></i>';
function selBarHTML() {
  if (selModo === 'carta')
    return (
      '<div class="bar selbar"><b id="sel-n"></b><button class="btn small" type="button" data-act="sel-todos">Marcar todos</button>' +
      (enElab()
        ? '<button class="btn primary small" type="button" data-act="sel-mover" data-a="plato">Pasar a Platos</button>'
        : '<button class="btn primary small" type="button" data-act="sel-mover" data-a="elab">Pasar a Elaboraciones</button>') +
      '<button class="btn small" type="button" data-act="sel-fin">Terminar</button></div>'
    );
  if (selModo === 'precios')
    return (
      '<div class="bar selbar"><b id="sel-n"></b><button class="btn small" type="button" data-act="sel-todos">Marcar todos</button>' +
      '<div class="field corto"><label for="sel-campo">Cambiar</label><select id="sel-campo"><option value="proveedor">Proveedor</option><option value="familia">Grupo para comparar</option></select></div>' +
      '<div class="field"><label for="sel-valor">Nuevo valor</label><input id="sel-valor" type="text" list="dl-proveedores" autocomplete="off" placeholder="Ej. Makro"></div>' +
      '<button class="btn primary small" type="button" data-act="sel-aplicar">Cambiar en todos</button>' +
      '<button class="btn small" type="button" data-act="sel-fin">Terminar</button></div>'
    );
  return '';
}
/* Fila de producto mientras se selecciona: se marca, no se edita */
const selFilaProd = (p) =>
  '<button class="row selrow" type="button" data-act="sel" data-id="' + esc(p.id) + '" aria-pressed="' + selIds.has(p.id) + '"><span class="n"><b>' + selCaja() + esc(p.nombre) + '</b><span>' + esc(metaProd(p)) +
  '</span></span><span class="d"><b>' + fEur.format(p.precio) + '</b><span class="hint">' + UDP[p.unidad].slice(1) + '</span></span></button>';
function selCuenta() {
  const n = $('sel-n');
  if (n) n.textContent = selIds.size + (selIds.size === 1 ? ' seleccionado' : ' seleccionados');
}
function selFin() {
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
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'sel-ini') {
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
  $('sel-valor').placeholder = prov ? 'Ej. Makro' : 'Ej. huevo (vacío = automático)';
});
/* Al cambiar de pantalla se sale de la selección */
window.addEventListener('hashchange', selFin);
