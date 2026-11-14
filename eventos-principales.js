/* ---- Eventos ---- */
const V = $('vista');
let tb;
V.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.buscar) {
    const k = t.dataset.buscar;
    clearTimeout(tb);
    tb = setTimeout(() => {
      fil[k] = t.value;
      lim[k] = k === 'precios' ? 25 : 20;
      if (k === 'carta') listaCarta();
      else if (k === 'precios') {
        finEdicion();
        editProd = null;
        listaProd();
      } else if (k === 'sala') listaSala();
      else listaInv();
    }, 140);
    return;
  }
  if (nuevoInput2(e) || nuevoInput(e)) return;
  if (pant === 'carta' && abierta) {
    if (t.type !== 'checkbox' && t.tagName !== 'SELECT') inputFicha(e);
  } else if (pant === 'precios') {
    if (t.tagName !== 'SELECT') inputPrecios(e);
  } else if (pant === 'inventario') inputInventario(e);
  else if (pant === 'recetas' && t.id === 'r-elab') {
    const p = plato(recetaId);
    if (p) {
      p.elaboracion = t.value;
      guardar('platos', p);
      enlacesReceta();
    }
  } else if (pant === 'mermas' && t.id === 'me-nombre') autoMerma();
});
V.addEventListener('change', (e) => {
  const t = e.target;
  if (nuevoChange(e)) return;
  if (t.id === 'f-grupo') {
    grp = t.value;
    lim.carta = 20;
    listaCarta();
  } else if (t.id === 'f-prov') {
    prov = t.value;
    lim.precios = 25;
    finEdicion();
    editProd = null;
    listaProd();
  } else if (t.id === 'sel-receta') {
    recetaId = t.value;
    factor = 1;
    vRecetas();
  } else if (t.id === 'r-costes') {
    conCostes = t.checked;
    enlacesReceta();
  } else if (t.id === 'inv-fecha') {
    if (t.value) {
      const v = abierto(true);
      v.fecha = t.value;
      guardar('inventarios', v);
    }
  } else if (t.id === 'inv-per') {
    S.ajustes.periodo = t.value;
    guardar('ajustes', S.ajustes, true);
    $('inv-cierre').textContent = proximo();
  } else if (t.id === 'm-mes') {
    mesM = t.value;
    lim.mermas = 25;
    lim.compras = 25;
    pintar();
  } else if (pant === 'carta' && abierta && (t.type === 'checkbox' || t.tagName === 'SELECT')) inputFicha(e);
  else if (pant === 'precios' && t.tagName === 'SELECT') inputPrecios(e);
});
V.addEventListener('submit', (e) => {
  e.preventDefault();
  if (nuevoSubmit2(e.target) || nuevoSubmit(e.target)) return;
  if (e.target.id === 'form-prod') {
    const n = $('np-nombre').value.trim(),
      msg = $('np-msg');
    if (!n) {
      msg.textContent = 'Escribe el nombre del producto.';
      $('np-nombre').focus();
      return;
    }
    if (prodPorNombre(n)) {
      msg.textContent = 'Ya existe un producto con ese nombre. Búscalo y cambia su precio.';
      return;
    }
    crearProd(n, $('np-proveedor').value, parse($('np-precio').value), $('np-unidad').value);
    pintarListas();
    $('np-nombre').value = '';
    $('np-precio').value = '';
    msg.textContent = 'Producto añadido.';
    listaProd();
    $('np-nombre').focus();
  } else if (e.target.id === 'form-merma') {
    const n = $('me-nombre').value.trim(),
      c = parse($('me-cant').value),
      msg = $('me-msg'),
      p = prodPorNombre(n);
    if (!n) {
      msg.textContent = 'Escribe el producto.';
      $('me-nombre').focus();
      return;
    }
    if (!(c > 0)) {
      msg.textContent = 'Escribe la cantidad.';
      $('me-cant').focus();
      return;
    }
    const f = $('me-fecha').value || hoy();
    addMerma({
      fecha: f,
      nombre: p ? p.nombre : n,
      productoId: p ? p.id : '',
      proveedor: p ? p.proveedor : '',
      cantidad: c,
      unidad: p ? p.unidad : $('me-unidad').value,
      precio: p ? p.precio : parse($('me-precio').value),
      motivo: $('me-motivo').value,
    });
    if (f.slice(0, 7) !== mesM) {
      mesM = f.slice(0, 7);
      vMermas();
    } else {
      $('me-nombre').value = '';
      $('me-cant').value = '';
      $('me-precio').value = '';
      autoMerma();
      listaMermas();
      msg.textContent = 'Merma apuntada.';
      $('me-nombre').focus();
    }
  }
});
function confirmar(b, txt) {
  if (b.dataset.ok) return true;
  b.dataset.ok = '1';
  const o = b.textContent;
  b.textContent = txt;
  setTimeout(() => {
    if (b.isConnected) {
      delete b.dataset.ok;
      b.textContent = o;
    }
  }, 4000);
  return false;
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.exp'))
    document.querySelectorAll('.exp-m').forEach((m) => {
      m.hidden = true;
    });
});
V.addEventListener('click', (e) => {
  const x = e.target.closest('[data-exp]');
  if (x) {
    x.parentNode.hidden = true;
    exportar(x.dataset.exp);
    return;
  }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act,
    p = plato();
  if (permClick(b, a) || nuevoClick2(b, a) || nuevoClick(b, a)) return;
  if (a === 'exp-menu') {
    const m = b.nextElementSibling;
    m.hidden = !m.hidden;
  } else if (a === 'multi') {
    b.parentNode.hidden = true;
    abrirMulti();
  } else if (a === 'mas') {
    const k = b.dataset.k;
    lim[k] += 50;
    ({
      carta: listaCarta,
      precios: listaProd,
      inv: listaInv,
      mermas: listaMermas,
      sala: listaSala,
      appcc: listaAppcc,
      compras: listaCompras,
      hist: vHistorial,
      tarifa: vTarifa,
    })[k]();
  } else if (a === 'abrir') abrirPlato(b.dataset.id);
  else if (a === 'volver') {
    abierta = false;
    vCarta();
  } else if (a === 'ir-receta') {
    recetaId = platoId;
  } else if (a === 'nuevo-plato') {
    const np = nPlato({
      id: nuevoId('platos'),
      nombre: '',
      raciones: 1,
      objetivo: 30,
      iva: 10,
      grupo: grp && grp !== G_BASE ? grp : '',
      base: grp === G_BASE,
      ingredientes: [{}],
    });
    S.platos.push(np);
    platoId = np.id;
    abierta = true;
    guardar('platos', np);
    vFicha();
    $('p-nombre').focus();
  } else if (a === 'add-ing' && p) {
    p.ingredientes.push(nPlato({ ingredientes: [{}] }).ingredientes[0]);
    guardar('platos', p);
    vFicha();
    const u = $('ing-' + (p.ingredientes.length - 1) + '-nombre');
    if (u) u.focus();
  } else if (a === 'quitar-ing' && p) {
    p.ingredientes.splice(+b.closest('.ing').dataset.k, 1);
    guardar('platos', p);
    vFicha();
  } else if (a === 'guardar-prod' && p) {
    const i = p.ingredientes[+b.closest('.ing').dataset.k];
    if (!i) return;
    const ex = prodPorNombre(i.nombre) || crearProd(i.nombre, '', i.precio, i.unidad);
    i.productoId = ex.id;
    guardar('platos', p);
    pintarListas();
    vFicha();
  } else if (a === 'borrar-plato' && p) {
    if (!confirmar(b, 'Pulsa otra vez')) return;
    if (p.base) {
      const cu = r3(costeUd(p));
      S.platos.forEach((pl) => {
        let ch = false;
        pl.ingredientes.forEach((i) => {
          if (i.baseId === p.id) {
            i.nombre = p.nombre;
            i.precio = cu;
            i.unidad = p.unidadBase;
            i.baseId = '';
            ch = true;
          }
        });
        if (ch) guardar('platos', pl);
      });
    }
    borrar('platos', p.id);
    platoId = null;
    abierta = false;
    vCarta();
    estado('');
  } else if (a === 'add-prod') {
    addProd = !addProd;
    vPrecios();
    if (addProd) $('np-nombre').focus();
  } else if (a === 'editar-prod') {
    finEdicion();
    editProd = b.dataset.id;
    const ep = prod(editProd);
    edIni = ep ? { id: ep.id, precio: ep.precio, fecha: ep.actualizado } : null;
    listaProd();
    const i = $('ep-e');
    if (i) {
      i.focus();
      i.select();
    }
  } else if (a === 'cerrar-prod') {
    finEdicion();
    editProd = null;
    pintarListas();
    listaProd();
  } else if (a === 'borrar-prod') {
    if (!confirmar(b, 'Pulsa otra vez')) return;
    const id = b.closest('.editor').dataset.id,
      pr = prod(id);
    S.platos.forEach((pl) => {
      let ch = false;
      pl.ingredientes.forEach((i) => {
        if (i.productoId === id) {
          i.nombre = pr.nombre;
          i.precio = pr.precio;
          i.unidad = pr.unidad;
          i.productoId = '';
          ch = true;
        }
      });
      if (ch) guardar('platos', pl);
    });
    borrar('productos', id);
    editProd = null;
    pintarListas();
    listaProd();
  } else if (a === 'copiar-receta') {
    const t = $('r-texto').value,
      m = $('r-msg');
    const falla = () => {
      $('r-caja').hidden = false;
      $('r-texto').focus();
      $('r-texto').select();
      m.textContent = 'Mantén pulsado el texto y elige Copiar.';
    };
    try {
      navigator.clipboard.writeText(t).then(() => toast('Receta copiada'), falla);
    } catch (er) {
      falla();
    }
  } else if (a === 'inv-sub') {
    invSub = b.dataset.v;
    vInventario();
  } else if (a === 'sumar-inv') {
    const r = leerDictado($('inv-dictado').value);
    if (r.ok.length) {
      const v = abierto(true);
      r.ok.forEach((x) => {
        v.cantidades[x.p.id] = r3((Number(v.cantidades[x.p.id]) || 0) + x.cant);
      });
      guardar('inventarios', v, true);
      listaInv();
      calcInv();
    }
    msgDictado('inv-dictado', r);
  } else if (a === 'sumar-merma') {
    const r = leerDictado($('me-dictado').value),
      f = $('me-fecha').value || hoy();
    r.ok.forEach((x) =>
      addMerma({
        fecha: f,
        nombre: x.p.nombre,
        productoId: x.p.id,
        proveedor: x.p.proveedor,
        cantidad: r3(x.cant),
        unidad: x.p.unidad,
        precio: x.p.precio,
        motivo: $('me-motivo').value,
      }),
    );
    if (r.ok.length) listaMermas();
    msgDictado('me-dictado', r);
  } else if (a === 'cerrar-inv') cerrarInv();
  else if (a === 'borrar-inv') {
    if (!confirmar(b, 'Pulsa otra vez')) return;
    borrar('inventarios', b.closest('.row').dataset.id);
    vInventario();
  } else if (a === 'borrar-merma') {
    borrar('mermas', b.closest('.row').dataset.id);
    listaMermas();
  }
});
