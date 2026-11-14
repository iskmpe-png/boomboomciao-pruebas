/* ---- Primeros pasos: poner en marcha un restaurante nuevo sin ayuda ---- */
let ppCopiando = false;
const ppOculto = () => mem('bbc.pasos.' + (rid || '')) === '1';
function ppPasos() {
  return [
    { ok: S.productos.length > 0, t: 'Carga los productos y sus precios', d: 'Sube la tarifa de tus proveedores (Excel, PDF o foto) o añádelos a mano.', h: '#precios-productos', b: 'Ir a Precios' },
    { ok: S.platos.some((p) => !p.base), t: 'Crea las fichas de tus platos', d: 'Cada plato con sus ingredientes y cantidades: la app calcula el coste y el food cost.', h: '#carta-platos', b: 'Ir a Carta' },
    { ok: S.proveedores.some((p) => p.whatsapp || p.email), t: 'Guarda el contacto de los proveedores', d: 'Con su WhatsApp o correo, los pedidos se envían en un toque.', h: '#almacen-proveedores', b: 'Ir a Proveedores' },
    { ok: S.productos.some((p) => p.minimo > 0), t: 'Pon el stock mínimo de lo importante', d: 'Así la app te avisa de lo que hay que pedir.', h: '#precios-productos', b: 'Ir a Precios' },
    { ok: S.manual.length > 0, t: 'Escribe el manual de la casa', d: 'Lo que el equipo debe saber cuando no estás. El asistente responde con ello.', h: '#inicio-manual', b: 'Ir al Manual' },
  ].concat(sb ? [{ ok: miembros.length > 1, t: 'Da acceso a tu equipo', d: 'Cada persona crea su cuenta y tú le das su rol desde Menú › Usuarios.', h: '', b: '' }] : []);
}
function ppHTML() {
  const pasos = ppPasos(),
    hechos = pasos.filter((p) => p.ok).length,
    otros = sb ? gestion().filter((m) => m.id !== rid) : [],
    vacio0 = !S.productos.length && !S.platos.length;
  return (
    '<section class="card pp"><div class="acciones" style="justify-content:space-between"><h2>Primeros pasos</h2><span class="pill">' + hechos + ' de ' + pasos.length + '</span></div>' +
    (vacio0 && otros.length
      ? '<form id="form-pp" class="pp-copia" novalidate data-libre><p><b>¿Es un local del mismo grupo?</b> Copia los datos de otro restaurante y ahórrate cargarlo todo de nuevo.</p>' +
        '<div class="field"><label for="pp-origen">Copiar de</label><select id="pp-origen">' + otros.map((m) => '<option value="' + esc(m.id) + '">' + esc(m.nombre) + '</option>').join('') + '</select></div>' +
        '<label class="check"><input type="checkbox" id="pp-prod" checked> Productos, precios y proveedores</label>' +
        '<label class="check"><input type="checkbox" id="pp-fichas" checked> Fichas de platos y elaboraciones</label>' +
        '<label class="check"><input type="checkbox" id="pp-manual"> Manual de la casa</label>' +
        '<button class="btn primary" type="submit" data-act="pp-copiar"' + (ppCopiando ? ' disabled' : '') + '>' + (ppCopiando ? 'Copiando…' : 'Copiar a este restaurante') + '</button></form>'
      : '') +
    '<ol class="pp-lista">' +
    pasos.map((p) => '<li class="' + (p.ok ? 'hecho' : '') + '"><span class="pp-m" aria-hidden="true">' + (p.ok ? '✓' : '') + '</span><span class="pp-t"><b>' + p.t + '</b><small>' + p.d + '</small></span>' + (!p.ok && p.h ? '<a class="btn small" href="' + p.h + '">' + p.b + '</a>' : '') + '</li>').join('') +
    '</ol>' + (vacio0 ? '' : '<button class="link" type="button" data-act="pp-ocultar">No mostrar más</button>') + '</section>'
  );
}
/* Se muestra a quien gestiona el restaurante mientras queden pasos y no lo haya ocultado */
const ppVisible = () => puede(2) && !ppOculto() && listo() && ppPasos().some((p) => !p.ok);
async function ppCopiar() {
  const origen = $('pp-origen').value,
    cols = [];
  if ($('pp-prod').checked || $('pp-fichas').checked) cols.push('productos', 'proveedores'); // las fichas necesitan sus productos
  if ($('pp-fichas').checked) cols.push('platos');
  if ($('pp-manual').checked) cols.push('manual');
  if (!cols.length) {
    toast('Marca qué quieres copiar.');
    return;
  }
  ppCopiando = true;
  pintar();
  try {
    const filas = [];
    let ini = 0;
    for (;;) {
      const q = await sb.from('docs').select('col,id,data').eq('restaurante_id', origen).eq('borrado', false).in('col', cols).order('col').order('id').range(ini, ini + 999);
      if (q.error) throw q.error;
      (q.data || []).forEach((x) => filas.push([x.col, x.id, x.data || {}]));
      if (!q.data || q.data.length < 1000) break;
      ini += 1000;
    }
    if (!filas.length) throw new Error('Ese restaurante no tiene datos que copiar.');
    await db.lote(filas);
    toast('Copiados ' + filas.length + ' registros.');
  } catch (e) {
    toast(errTxt(e));
  }
  ppCopiando = false;
  pintar();
}
V.addEventListener('submit', (e) => {
  if (e.target.id !== 'form-pp') return;
  e.preventDefault();
  if (!ppCopiando) ppCopiar();
});
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="pp-ocultar"]');
  if (!b) return;
  mem('bbc.pasos.' + (rid || ''), '1');
  pintar();
});
