/* ---- Escandallos: crear o actualizar varias fichas a la vez desde fotos, PDF o Excel ---- */
let escImp = null;
const EI_PROMPT =
  'Eres un lector de escandallos y fichas técnicas de cocina. Devuelve SOLO JSON con esta forma: ' +
  '{"platos":[{"nombre":"","tipo":"plato","raciones":1,"rinde":0,"rinde_medida":"g","pvp":0,"grupo":"","elaboracion":"","ingredientes":[{"nombre":"","cantidad":0,"medida":"g","merma":0,"precio":0,"proveedor":""}]}]}.\n' +
  'Reglas:\n- Una entrada en "platos" por cada escandallo, ficha o receta que aparezca. Si no hay ninguno, devuelve la lista vacía.\n' +
  '- "tipo": "elaboracion" si es una producción interna que no se vende tal cual y sirve de ingrediente para otros platos (una mayonesa, una salsa, una masa, un fondo, un aliño, una crema); "plato" si es algo de la carta. En las elaboraciones, "rinde" es la cantidad total que sale y "rinde_medida" es "g", "ml" o "ud" (pasa kilos a gramos y litros a mililitros); pon 0 si no lo dice.\n' +
  '- "raciones": cuántas raciones salen de las cantidades escritas (1 si no lo dice). "pvp": precio de venta en carta con IVA, 0 si no aparece. "grupo": la carta o familia si aparece (por ejemplo Pizzas, Postres).\n' +
  '- "elaboracion": los pasos de preparación si están escritos, cada paso en una línea; si no, vacío.\n' +
  '- "ingredientes": uno por línea de ingrediente. "cantidad" es la cantidad neta para todas las raciones y "medida" solo puede ser "g", "ml" o "ud": pasa los kilos a gramos y los litros a mililitros.\n' +
  '- "merma": el porcentaje de merma si aparece, 0 si no. "precio": el precio de compra si aparece, 0 si no: por kilo si la medida es "g", por litro si es "ml" y por unidad si es "ud". No pongas el coste de la línea. Si el ingrediente viene en unidades con peso o volumen escrito (por ejemplo «2 bandejas de 125 g»), pasa la cantidad a gramos o mililitros. "proveedor": el proveedor de ese ingrediente si aparece; si no, vacío.\n' +
  IA_FORMATOS +
  '- Si un ingrediente o un plato es claramente el mismo que uno de las listas de la casa, escribe su nombre EXACTAMENTE como está en la lista. Si no está, escribe el nombre limpio con mayúscula inicial.\n' +
  '- No inventes nada: si una cantidad no se lee con seguridad, pon 0.\n';
/* Nombres que ya existen en la app, para que la lectura use los mismos */
function eiListas() {
  const corta = (l) => l.join(' | ').slice(0, 9000);
  return (
    (S.productos.length ? '\nPRODUCTOS DE LA CASA: ' + corta(ordenados(S.productos).map((p) => p.nombre)) : '') +
    (S.platos.length ? '\nPLATOS Y ELABORACIONES DE LA CASA: ' + corta(ordenados(S.platos).map((p) => p.nombre)) : '') +
    '\n'
  );
}
const eiPlato = (nombre) => {
  const n = norm(nombre);
  return n ? S.platos.find((p) => norm(p.nombre) === n) || null : null;
};
const eiEnlace = (nombre, salvo) => prodPorNombre(nombre) || basePorNombre(nombre, salvo);
const eiUnidad = (m) => (m === 'ml' ? 'l' : m === 'ud' ? 'ud' : 'kg');
/* El producto que se va a crear en Precios para ese ingrediente, si lo hay */
const eiCrea = (nombre) => {
  const n = norm(nombre);
  return (escImp.prods || []).find((q) => q.ok && !q.prodId && norm(q.nombre) === n) || null;
};
/* Una elaboración que viene en esta misma importación y se va a crear */
const eiDelLote = (nombre) => {
  const n = norm(nombre);
  return escImp.platos.find((y) => y.ok && y.elab && !y.platoId && norm(y.nombre) === n) || null;
};
/* Lo que rinde una elaboración: lo leído o, si no viene, la suma de sus ingredientes */
function eiRinde(x) {
  if (x.rinde > 0) return { n: x.rinde, ub: x.ub, est: false };
  const g = x.ings.reduce((t, i) => t + (i.medida === 'ud' ? 0 : i.cantidad), 0);
  return g > 0 ? { n: r3(g / 1000), ub: 'kg', est: true } : { n: 1, ub: 'kg', est: true };
}
const eiSueltos = (x) => x.ings.filter((i) => !eiEnlace(i.nombre, x.platoId) && !eiCrea(i.nombre) && !eiDelLote(i.nombre)).length;
/* De los ingredientes con precio salen los productos nuevos y los cambios de precio */
function eiProductos() {
  const vistos = {},
    out = [];
  escImp.platos.forEach((x) =>
    x.ings.forEach((i) => {
      const k = norm(i.nombre);
      if (!k || !(i.precio > 0) || vistos[k] || basePorNombre(i.nombre) || eiDelLote(i.nombre)) return;
      vistos[k] = 1;
      const p = prodPorNombre(i.nombre),
        unidad = eiUnidad(i.medida);
      if (p && (p.unidad !== unidad || Math.abs(p.precio - i.precio) < 0.005)) return;
      /* Los nuevos van marcados; los cambios de precio no, porque un escandallo puede traer precios viejos */
      out.push({ nombre: p ? p.nombre : i.nombre, proveedor: p ? p.proveedor : i.proveedor, precio: i.precio, unidad, prodId: p ? p.id : '', ok: !p });
    }),
  );
  return out;
}
async function importarEscandallos() {
  if (!sAPI) {
    toast('La lectura de documentos necesita la IA activada.');
    return;
  }
  const fs = await pedirArchivo('image/*,.pdf,.xlsx,.xls,.ods,.csv,.tsv,.txt', true);
  if (!fs.length) return;
  escImp = { estado: 'leyendo', paso: 'Abriendo ' + (fs.length === 1 ? fs[0].name : fs.length + ' archivos') + '…', platos: [], avisos: [] };
  pintar();
  const trabajos = [];
  for (let n = 0; n < fs.length; n++) {
    const f = fs[n];
    try {
      const d = await leerDocumento(f);
      d.textos.forEach((t) => trocear(t, 7000).forEach((c) => trabajos.push({ texto: c })));
      /* Cada foto se lee por separado: lo normal es un escandallo por foto */
      d.imagenes.forEach((i) => trabajos.push({ imagenes: [i] }));
      if (!d.textos.length && !d.imagenes.length) escImp.avisos.push('«' + f.name + '» está vacío.');
    } catch (e) {
      escImp.avisos.push((e && e.message) || 'No se pudo abrir «' + f.name + '».');
    }
  }
  if (!escImp) return;
  if (!trabajos.length) {
    escImp = { estado: 'error', msg: escImp.avisos.join(' ') || 'No encontré nada que leer en esos archivos.' };
    pintar();
    return;
  }
  const listas = eiListas(),
    porNombre = {};
  let seguidos = 0;
  for (let k = 0; k < trabajos.length; k++) {
    if (!escImp) return; // cancelado
    escImp.paso = 'Leyendo escandallos: parte ' + (k + 1) + ' de ' + trabajos.length + '…';
    if (pant === 'carta') vEscImp();
    const t = trabajos[k];
    try {
      const r = await sAPI.json(EI_PROMPT + listas + (t.texto ? '\nDOCUMENTO (las columnas van separadas por ;):\n' + t.texto : '\nLee la foto adjunta.'), {
        images: t.imagenes || [],
        cache: false,
      });
      if (!escImp) return;
      ((r && Array.isArray(r.platos) && r.platos) || []).forEach((p) => {
        const nombre = String((p && p.nombre) || '').trim().slice(0, 120);
        if (!nombre) return;
        const ings = (Array.isArray(p.ingredientes) ? p.ingredientes : [])
          .map((i) => ({
            nombre: String((i && i.nombre) || '').trim().slice(0, 120),
            cantidad: Math.max(0, Math.round((Number(i && i.cantidad) || 0) * 1000) / 1000),
            medida: /^ml$/i.test(String(i && i.medida)) ? 'ml' : /^(ud|uds|unidad|unidades)$/i.test(String(i && i.medida)) ? 'ud' : 'g',
            merma: Math.min(95, Math.max(0, Number(i && i.merma) || 0)),
            precio: Math.max(0, Math.round((Number(i && i.precio) || 0) * 1000) / 1000),
            proveedor: String((i && i.proveedor) || '').trim().slice(0, 80),
          }))
          .filter((i) => i.nombre);
        if (!ings.length) return;
        const ya = porNombre[norm(nombre)];
        if (ya) {
          /* El mismo escandallo repartido en dos partes: se juntan los ingredientes */
          ings.forEach((i) => {
            if (!ya.ings.some((j) => norm(j.nombre) === norm(i.nombre))) ya.ings.push(i);
          });
          ya.elaboracion = ya.elaboracion || String(p.elaboracion || '').trim().slice(0, 4000);
          return;
        }
        const ex = eiPlato(nombre),
          rm = /^ml$/i.test(String(p.rinde_medida)) ? 'ml' : /^(ud|uds|unidad|unidades)$/i.test(String(p.rinde_medida)) ? 'ud' : 'g',
          x = {
            elab: ex ? !!ex.base : enElab() || /^elab/i.test(String(p.tipo || '')),
            rinde: Number(p.rinde) > 0 ? r3(rm === 'ud' ? Number(p.rinde) : Number(p.rinde) / 1000) : 0,
            ub: eiUnidad(rm),
            nombre,
            raciones: Number(p.raciones) > 0 ? Number(p.raciones) : 0,
            pvp: Number(p.pvp) > 0 ? Math.round(Number(p.pvp) * 100) / 100 : 0,
            grupo: String(p.grupo || '').trim().slice(0, 60),
            elaboracion: String(p.elaboracion || '').trim().slice(0, 4000),
            ings,
            platoId: ex ? ex.id : '',
            ok: true,
          };
        porNombre[norm(nombre)] = x;
        escImp.platos.push(x);
      });
    } catch (e) {
      if (e && (e.code === 'rate_limited' || e.code === 'session_expired')) {
        escImp.avisos.push(errIA(e));
        break;
      }
      /* Si la IA falla dos veces seguidas no tiene sentido seguir: se enseña el motivo real */
      escImp.fallo = errIA(e);
      if (++seguidos >= 2) break;
      escImp.avisos.push('Una parte no se pudo leer (' + (k + 1) + ' de ' + trabajos.length + ').');
      continue;
    }
    seguidos = 0;
  }
  if (!escImp) return;
  if (!escImp.platos.length) {
    escImp = { estado: 'error', msg: escImp.fallo || escImp.avisos.join(' ') || 'No encontré escandallos con ingredientes en esos archivos.' };
    pintar();
    return;
  }
  escImp.prods = eiProductos();
  escImp.estado = 'revisar';
  pintar();
}
const eiCant = (i) => fNum(i.cantidad, 2) + ' ' + i.medida;
function eiFila(x, k) {
  const ex = x.platoId ? plato(x.platoId) : null,
    sueltos = eiSueltos(x),
    rd = eiRinde(x);
  return (
    '<div class="ei" data-k="' + k + '"><input type="checkbox" data-ei="ok" aria-label="Aplicar ' + esc(x.nombre) + '"' + (x.ok ? ' checked' : '') + '>' +
    '<div class="ei-n"><input type="text" data-ei="nombre" aria-label="Nombre del plato" value="' + esc(x.nombre) + '"><small>' +
    x.ings.length + (x.ings.length === 1 ? ' ingrediente' : ' ingredientes') +
    (x.elab ? ' · rinde ' + fNum(rd.n, 2) + ' ' + UDI[rd.ub] + (rd.est ? ' (estimado: revísalo en la ficha)' : '') : (x.raciones ? ' · ' + fNum(x.raciones, 2) + (x.raciones === 1 ? ' ración' : ' raciones') : '') + (x.pvp ? ' · carta ' + fEur.format(x.pvp) : '')) +
    (x.elaboracion ? ' · con pasos' : '') + '</small>' +
    (ex ? '' : '<select data-ei="tipo" aria-label="Qué es"><option value="plato"' + (x.elab ? '' : ' selected') + '>Plato de la carta</option><option value="elab"' + (x.elab ? ' selected' : '') + '>Elaboración de la casa</option></select>') + '</div>' +
    '<div class="ei-e">' + (ex ? '<span class="pill crit">Sustituye la ficha</span><small>cambia los ' + ex.ingredientes.length + ' ingredientes de ahora</small>' : '<span class="pill ok">Nuevo</span>') +
    (sueltos ? '<small>' + sueltos + (sueltos === 1 ? ' ingrediente' : ' ingredientes') + ' sin enlazar con Precios</small>' : '') + '</div>' +
    '<details class="ei-d"><summary>Ver ingredientes</summary><ul>' +
    x.ings.map((i) => '<li><span>' + esc(eiCant(i)) + (i.merma ? ' · merma ' + fNum(i.merma) + ' %' : '') + '</span><b>' + esc(i.nombre) + '</b>' + (eiEnlace(i.nombre, x.platoId) ? '' : eiDelLote(i.nombre) ? '<em class="ok">elaboración de esta importación</em>' : eiCrea(i.nombre) ? '<em class="ok">se crea en Precios</em>' : '<em>sin enlazar' + (i.precio ? ' · ' + fEur.format(i.precio) : '') + '</em>') + '</li>').join('') +
    '</ul></details></div>'
  );
}
function vEscImp() {
  const t = escImp;
  if (t.estado === 'leyendo') {
    $('vista').innerHTML =
      '<section class="card estado"><strong>Leyendo los escandallos</strong><span>' + esc(t.paso) + '</span>' +
      (t.platos.length ? '<span>' + t.platos.length + (t.platos.length === 1 ? ' escandallo encontrado' : ' escandallos encontrados') + ' hasta ahora</span>' : '') +
      '<button class="btn" type="button" data-act="ei-cancelar">Cancelar</button></section>';
    return;
  }
  if (t.estado === 'error') {
    $('vista').innerHTML =
      '<section class="card estado"><strong>No se pudieron leer los escandallos</strong><span>' + esc(t.msg) + '</span><div class="acciones" style="justify-content:center"><button class="btn primary" type="button" data-act="ei-importar">Probar con otros archivos</button><button class="btn" type="button" data-act="ei-cancelar">Volver</button></div></section>';
    return;
  }
  const marcados = t.platos.filter((x) => x.ok).length,
    sust = t.platos.filter((x) => x.platoId).length;
  $('vista').innerHTML =
    '<div class="bar"><span class="hint grow"><b>' + t.platos.length + (t.platos.length === 1 ? ' escandallo leído.' : ' escandallos leídos.') + '</b> ' +
    (sust ? sust + (sust === 1 ? ' ya existe y se sustituiría. ' : ' ya existen y se sustituirían. ') : '') + 'Revisa y aplica. Nada cambia hasta que pulses Aplicar.</span>' +
    '<button class="btn" type="button" data-act="ei-cancelar">Descartar</button><button class="btn primary" type="button" data-act="ei-aplicar"' + (marcados ? '' : ' disabled') + '>Aplicar ' + marcados + '</button></div>' +
    (t.avisos.length ? '<p class="aviso">' + esc(t.avisos.join(' ')) + ' Revisa que no falte nada.</p>' : '') +
    '<section class="card"><p class="hint">Los ingredientes «sin enlazar» no coinciden con ningún producto de Precios ni traen precio: se guardan solo con el nombre, y puedes enlazarlos después desde la ficha.</p><div class="ei-lista">' +
    t.platos.map(eiFila).join('') + '</div></section>' +
    (t.prods.length
      ? '<section class="card"><h3 class="ei-h">Productos y precios</h3><p class="hint">Salen de los ingredientes que traen precio. Los marcados se guardan en Precios con su proveedor y quedan enlazados a la ficha. Los cambios de precio vienen sin marcar: marca solo los que estén al día.</p><div class="ei-lista">' +
        t.prods.map(eiProdFila).join('') + '</div></section>'
      : '');
}
function eiProdFila(q, k) {
  const p = q.prodId ? prod(q.prodId) : null,
    dif = p && p.precio > 0 ? ((q.precio - p.precio) / p.precio) * 100 : 0;
  return (
    '<div class="tf" data-q="' + k + '"><input type="checkbox" data-ep="ok" aria-label="Guardar ' + esc(q.nombre) + '"' + (q.ok ? ' checked' : '') + '>' +
    '<div class="tf-n"><b>' + esc(q.nombre) + '</b><input type="text" data-ep="proveedor" list="dl-proveedores" aria-label="Proveedor" placeholder="Proveedor" value="' + esc(q.proveedor) + '"' + (p ? ' disabled' : '') + '></div>' +
    '<div class="tf-p"><input class="num" type="text" inputmode="decimal" data-ep="precio" aria-label="Precio" value="' + show(q.precio) + '"><span class="ei-u">' + UDP[q.unidad] + '</span></div>' +
    '<div class="tf-e">' + (p ? '<span class="pill ' + (dif > 0 ? 'crit' : 'ok') + '">' + (dif > 0 ? '+' : '') + fNum(dif) + ' %</span><small>ahora ' + fEur.format(p.precio) + '</small>' : '<span class="pill ok">Nuevo</span>') + '</div></div>'
  );
}
/* Convierte un ingrediente leído en uno de la ficha, enlazado si el nombre coincide */
function eiIngrediente(i, salvo) {
  const pr = prodPorNombre(i.nombre),
    bs = pr ? null : basePorNombre(i.nombre, salvo),
    base = { cantidad: i.cantidad, merma: i.merma };
  if (pr) return Object.assign(base, { nombre: pr.nombre, productoId: pr.id, baseId: '', precio: pr.precio, unidad: pr.unidad });
  if (bs) return Object.assign(base, { nombre: bs.nombre, productoId: '', baseId: bs.id, precio: r3(costeUd(bs)), unidad: bs.unidadBase });
  return Object.assign(base, { nombre: i.nombre, productoId: '', baseId: '', precio: i.precio, unidad: eiUnidad(i.medida) });
}
function aplicarEscandallos() {
  /* Las elaboraciones van primero para que los platos del mismo lote ya las encuentren */
  const sel = escImp.platos.filter((x) => x.ok && x.nombre.trim() && x.ings.length).sort((a, z) => z.elab - a.elab),
    tocados = [];
  if (!sel.length) return;
  let nuevos = 0,
    cambiados = 0,
    prodNuevos = 0,
    precios = 0;
  /* Primero los productos, para que los ingredientes de las fichas ya los encuentren */
  const ahora = new Date().toISOString();
  escImp.prods
    .filter((q) => q.ok && q.precio > 0)
    .forEach((q) => {
      let p = q.prodId ? prod(q.prodId) : prodPorNombre(q.nombre);
      if (p) {
        if (Math.abs(p.precio - q.precio) < 0.005) return;
        if (p.precio > 0) {
          p.historial.push({ f: p.actualizado || '', p: p.precio });
          if (p.historial.length > 12) p.historial = p.historial.slice(-12);
          p.anterior = p.precio;
        }
        p.precio = q.precio;
        p.actualizado = ahora;
        precios++;
      } else {
        p = nProd({ id: nuevoId('productos'), nombre: q.nombre, proveedor: q.proveedor.trim(), precio: q.precio, unidad: q.unidad, actualizado: ahora });
        S.productos.push(p);
        prodNuevos++;
      }
      sucio();
      guardar('productos', p, true);
    });
  sel.forEach((x) => {
    let p = x.platoId ? plato(x.platoId) : null;
    if (p) {
      p.ingredientes = x.ings.map((i) => eiIngrediente(i, p.id));
      if (p.base) {
        if (x.rinde > 0) {
          p.raciones = x.rinde;
          p.unidadBase = x.ub;
        }
      } else {
        if (x.raciones > 0) p.raciones = x.raciones;
        if (x.pvp > 0) p.pvp = x.pvp;
      }
      if (x.elaboracion) p.elaboracion = x.elaboracion;
      cambiados++;
    } else {
      const rd = eiRinde(x);
      p = x.elab
        ? nPlato({ id: nuevoId('platos'), nombre: x.nombre.trim(), base: true, raciones: rd.n, unidadBase: rd.ub, elaboracion: x.elaboracion, ingredientes: [] })
        : nPlato({ id: nuevoId('platos'), nombre: x.nombre.trim(), raciones: x.raciones || 1, pvp: x.pvp, grupo: x.grupo, elaboracion: x.elaboracion, ingredientes: [] });
      p.ingredientes = x.ings.map((i) => eiIngrediente(i, p.id));
      S.platos.push(p);
      nuevos++;
    }
    sucio();
    tocados.push([p, x]);
  });
  /* Con todo creado, se repasan los enlaces (una elaboración puede usar otra del mismo lote) y se guarda */
  tocados.forEach(([p, x]) => {
    p.ingredientes = x.ings.map((i) => eiIngrediente(i, p.id));
    guardar('platos', p, true);
  });
  escImp = null;
  pintar();
  toast('Escandallos aplicados: ' + nuevos + (nuevos === 1 ? ' nuevo' : ' nuevos') + ' y ' + cambiados + (cambiados === 1 ? ' actualizado' : ' actualizados') +
      (prodNuevos || precios ? '. En Precios: ' + prodNuevos + (prodNuevos === 1 ? ' producto nuevo' : ' productos nuevos') + ' y ' + precios + (precios === 1 ? ' precio cambiado' : ' precios cambiados') : '') + '.');
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'ei-importar') importarEscandallos();
  else if (a === 'ei-cancelar') {
    escImp = null;
    pintar();
  } else if (a === 'ei-aplicar' && escImp && escImp.estado === 'revisar') aplicarEscandallos();
});
V.addEventListener('change', (e) => {
  const t = e.target,
    f = t.closest('.ei'),
    fq = t.closest('.tf[data-q]');
  if (fq && escImp && t.dataset.ep) {
    const q = escImp.prods[Number(fq.dataset.q)];
    if (!q) return;
    if (t.dataset.ep === 'ok') q.ok = t.checked;
    else if (t.dataset.ep === 'precio') q.precio = Math.round(parse(t.value) * 1000) / 1000;
    else if (t.dataset.ep === 'proveedor') q.proveedor = t.value.trim();
    vEscImp();
    return;
  }
  if (!f || !escImp || !t.dataset.ei) return;
  const x = escImp.platos[Number(f.dataset.k)];
  if (!x) return;
  if (t.dataset.ei === 'ok') x.ok = t.checked;
  else if (t.dataset.ei === 'nombre') {
    x.nombre = t.value.trim();
    const ex = eiPlato(x.nombre);
    x.platoId = ex ? ex.id : '';
    if (ex) x.elab = !!ex.base;
  } else if (t.dataset.ei === 'tipo') x.elab = t.value === 'elab';
  if (t.dataset.ei !== 'ok') escImp.prods = eiProductos();
  vEscImp();
});
