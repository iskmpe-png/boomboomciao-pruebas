/* ---- Escandallos: crear o actualizar varias fichas a la vez desde fotos, PDF o Excel ---- */
let escImp = null;
const EI_PROMPT =
  'Eres un lector de escandallos y fichas técnicas de cocina. Devuelve SOLO JSON con esta forma: ' +
  '{"platos":[{"nombre":"","raciones":1,"pvp":0,"grupo":"","elaboracion":"","ingredientes":[{"nombre":"","cantidad":0,"medida":"g","merma":0,"precio":0}]}]}.\n' +
  'Reglas:\n- Una entrada en "platos" por cada escandallo, ficha o receta que aparezca. Si no hay ninguno, devuelve la lista vacía.\n' +
  '- "raciones": cuántas raciones salen de las cantidades escritas (1 si no lo dice). "pvp": precio de venta en carta con IVA, 0 si no aparece. "grupo": la carta o familia si aparece (por ejemplo Pizzas, Postres).\n' +
  '- "elaboracion": los pasos de preparación si están escritos, cada paso en una línea; si no, vacío.\n' +
  '- "ingredientes": uno por línea de ingrediente. "cantidad" es la cantidad neta para todas las raciones y "medida" solo puede ser "g", "ml" o "ud": pasa los kilos a gramos y los litros a mililitros.\n' +
  '- "merma": el porcentaje de merma si aparece, 0 si no. "precio": el precio de compra por kilo, litro o unidad si aparece, 0 si no. No pongas el coste de la línea.\n' +
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
const eiSueltos = (x) => x.ings.filter((i) => !eiEnlace(i.nombre, x.platoId)).length;
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
          x = {
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
      escImp.avisos.push('Una parte no se pudo leer (' + (k + 1) + ' de ' + trabajos.length + ').');
    }
  }
  if (!escImp) return;
  if (!escImp.platos.length) {
    escImp = { estado: 'error', msg: escImp.avisos.join(' ') || 'No encontré escandallos con ingredientes en esos archivos.' };
    pintar();
    return;
  }
  escImp.estado = 'revisar';
  pintar();
}
const eiCant = (i) => fNum(i.cantidad, 2) + ' ' + i.medida;
function eiFila(x, k) {
  const ex = x.platoId ? plato(x.platoId) : null,
    sueltos = eiSueltos(x);
  return (
    '<div class="ei" data-k="' + k + '"><input type="checkbox" data-ei="ok" aria-label="Aplicar ' + esc(x.nombre) + '"' + (x.ok ? ' checked' : '') + '>' +
    '<div class="ei-n"><input type="text" data-ei="nombre" aria-label="Nombre del plato" value="' + esc(x.nombre) + '"><small>' +
    x.ings.length + (x.ings.length === 1 ? ' ingrediente' : ' ingredientes') + (x.raciones ? ' · ' + fNum(x.raciones, 2) + (x.raciones === 1 ? ' ración' : ' raciones') : '') +
    (x.pvp ? ' · carta ' + fEur.format(x.pvp) : '') + (x.elaboracion ? ' · con elaboración' : '') + '</small></div>' +
    '<div class="ei-e">' + (ex ? '<span class="pill crit">Sustituye la ficha</span><small>cambia los ' + ex.ingredientes.length + ' ingredientes de ahora</small>' : '<span class="pill ok">Nuevo</span>') +
    (sueltos ? '<small>' + sueltos + (sueltos === 1 ? ' ingrediente' : ' ingredientes') + ' sin enlazar con Precios</small>' : '') + '</div>' +
    '<details class="ei-d"><summary>Ver ingredientes</summary><ul>' +
    x.ings.map((i) => '<li><span>' + esc(eiCant(i)) + (i.merma ? ' · merma ' + fNum(i.merma) + ' %' : '') + '</span><b>' + esc(i.nombre) + '</b>' + (eiEnlace(i.nombre, x.platoId) ? '' : '<em>sin enlazar' + (i.precio ? ' · ' + fEur.format(i.precio) : '') + '</em>') + '</li>').join('') +
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
    '<section class="card"><p class="hint">Los ingredientes «sin enlazar» no coinciden con ningún producto de Precios: se guardan con el nombre y el precio leídos, y puedes enlazarlos después desde la ficha.</p><div class="ei-lista">' +
    t.platos.map(eiFila).join('') + '</div></section>';
}
/* Convierte un ingrediente leído en uno de la ficha, enlazado si el nombre coincide */
function eiIngrediente(i, salvo) {
  const pr = prodPorNombre(i.nombre),
    bs = pr ? null : basePorNombre(i.nombre, salvo),
    base = { cantidad: i.cantidad, merma: i.merma };
  if (pr) return Object.assign(base, { nombre: pr.nombre, productoId: pr.id, baseId: '', precio: pr.precio, unidad: pr.unidad });
  if (bs) return Object.assign(base, { nombre: bs.nombre, productoId: '', baseId: bs.id, precio: r3(costeUd(bs)), unidad: bs.unidadBase });
  return Object.assign(base, { nombre: i.nombre, productoId: '', baseId: '', precio: i.precio, unidad: i.medida === 'ml' ? 'l' : i.medida === 'ud' ? 'ud' : 'kg' });
}
function aplicarEscandallos() {
  const sel = escImp.platos.filter((x) => x.ok && x.nombre.trim() && x.ings.length);
  if (!sel.length) return;
  let nuevos = 0,
    cambiados = 0;
  sel.forEach((x) => {
    let p = x.platoId ? plato(x.platoId) : null;
    if (p) {
      p.ingredientes = x.ings.map((i) => eiIngrediente(i, p.id));
      if (x.raciones > 0) p.raciones = x.raciones;
      if (x.pvp > 0) p.pvp = x.pvp;
      if (x.elaboracion) p.elaboracion = x.elaboracion;
      cambiados++;
    } else {
      p = nPlato({ id: nuevoId('platos'), nombre: x.nombre.trim(), raciones: x.raciones || 1, pvp: x.pvp, grupo: x.grupo, elaboracion: x.elaboracion, ingredientes: [] });
      p.ingredientes = x.ings.map((i) => eiIngrediente(i, p.id));
      S.platos.push(p);
      nuevos++;
    }
    sucio();
    guardar('platos', p, true);
  });
  escImp = null;
  pintar();
  toast('Escandallos aplicados: ' + nuevos + (nuevos === 1 ? ' nuevo' : ' nuevos') + ' y ' + cambiados + (cambiados === 1 ? ' actualizado' : ' actualizados') + '.');
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
    f = t.closest('.ei');
  if (!f || !escImp || !t.dataset.ei) return;
  const x = escImp.platos[Number(f.dataset.k)];
  if (!x) return;
  if (t.dataset.ei === 'ok') x.ok = t.checked;
  else if (t.dataset.ei === 'nombre') {
    x.nombre = t.value.trim();
    const ex = eiPlato(x.nombre);
    x.platoId = ex ? ex.id : '';
  }
  vEscImp();
});
