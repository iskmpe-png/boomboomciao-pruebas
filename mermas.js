/* ---- Mermas ---- */
const valM = (m) => m.cantidad * m.precio;
const mermasMes = () =>
  S.mermas
    .filter((m) => m.fecha.slice(0, 7) === mesM)
    .sort((a, z) => z.fecha.localeCompare(a.fecha) || z.creado.localeCompare(a.creado));
function addMerma(o) {
  const m = nMerma(Object.assign({ id: nuevoId('mermas'), creado: new Date().toISOString(), por: miId || '' }, o));
  S.mermas.push(m);
  guardar('mermas', m, true);
  return m;
}
function listaMermas() {
  const l = mermasMes(),
    total = l.reduce((t, m) => t + valM(m), 0);
  $('m-total').textContent = fEur.format(total);
  $('m-n').textContent = l.length === 1 ? '1 apunte' : l.length + ' apuntes';
  $('lista-mermas').innerHTML = l.length
    ? l
        .slice(0, lim.mermas)
        .map(
          (m) =>
            '<div class="row" data-id="' +
            esc(m.id) +
            '"><div class="n"><b>' +
            esc(m.nombre) +
            '</b><span>' +
            esc(
              fFecha(m.fecha) +
                ' · ' +
                m.motivo +
                ' · ' +
                fNum(m.cantidad, 3) +
                ' ' +
                UDI[m.unidad] +
                ' a ' +
                fEur.format(m.precio) +
                porTxt(m.por),
            ) +
            '</span></div>' +
            '<div class="d"><b>' +
            fEur.format(valM(m)) +
            '</b><button class="icon" type="button" data-act="borrar-merma" aria-label="Eliminar apunte" style="width:34px;height:34px">×</button></div></div>',
        )
        .join('') + masHTML('mermas', l.length)
    : '<p class="hint" style="padding:10px 0">Sin mermas apuntadas en ' +
      esc(fMes(mesM).toLowerCase()) +
      '. Añade la primera arriba.</p>';
  const pm = {};
  l.forEach((m) => {
    pm[m.motivo] = (pm[m.motivo] || 0) + valM(m);
  });
  const ks = Object.keys(pm).sort((a, z) => pm[z] - pm[a]);
  $('m-motivos').innerHTML = ks.length
    ? ks
        .map((k) => {
          const pct = total > 0 ? (pm[k] / total) * 100 : 0;
          return (
            '<div class="fila-barra"><span>' +
            esc(k) +
            '</span><span class="v">' +
            fNum(pct, 0) +
            ' % · ' +
            fEur.format(pm[k]) +
            '</span><span class="pista"><i style="width:' +
            pct +
            '%"></i></span></div>'
          );
        })
        .join('')
    : '<p class="hint">Aquí verás en qué se va la merma del mes.</p>';
}
function vMermas() {
  const ms = {};
  ms[hoy().slice(0, 7)] = 1;
  ms[mesM] = 1;
  S.mermas.forEach((m) => {
    ms[m.fecha.slice(0, 7)] = 1;
  });
  $('vista').innerHTML =
    '<div class="bar"><div class="field corto"><label for="m-mes">Mes</label><select id="m-mes">' +
    Object.keys(ms)
      .sort()
      .reverse()
      .map((k) => '<option value="' + k + '"' + (k === mesM ? ' selected' : '') + '>' + esc(fMes(k)) + '</option>')
      .join('') +
    '</select></div>' +
    '<div class="resumen"><b class="g" id="m-total"></b><span id="m-n"></span></div>' +
    expHTML() +
    '</div>' +
    '<div class="dos"><div class="col"><section class="card"><form id="form-merma" class="editor m6" style="margin:0" novalidate>' +
    '<div class="field wide"><label for="me-nombre">Producto</label><input id="me-nombre" type="text" list="dl-solo-prod" autocomplete="off" placeholder="Escribe o elige"></div>' +
    '<div class="field"><label for="me-cant">Cantidad</label><input class="num" id="me-cant" type="text" inputmode="decimal" placeholder="0"></div>' +
    '<div class="field"><label for="me-precio">Precio</label><div class="precio"><input class="num" id="me-precio" type="text" inputmode="decimal" placeholder="0,00"><select id="me-unidad" aria-label="Unidad"><option value="kg">€/kg</option><option value="l">€/L</option><option value="ud">€/ud</option></select></div></div>' +
    '<div class="field"><label for="me-motivo">Motivo</label><select id="me-motivo">' +
    MOTIVOS.map((x) => '<option>' + x + '</option>').join('') +
    '</select></div>' +
    '<div class="field"><label for="me-fecha">Fecha</label><input id="me-fecha" type="date" value="' +
    hoy() +
    '"></div>' +
    '<button class="btn primary wide" type="submit">Añadir merma</button><span class="hint wide" id="me-msg" aria-live="polite" style="grid-column:1/-1">La cantidad va en kilos, litros o unidades, igual que el precio de compra.</span></form>' +
    dictadoHTML('me-dictado', 'sumar-merma', 'Se apuntan con la fecha y el motivo del formulario.') +
    '</section>' +
    '<section class="card"><div class="rows" id="lista-mermas"></div></section></div>' +
    '<div class="col"><section class="card"><h3>Por motivo</h3><div class="barras" id="m-motivos"></div></section></div></div>';
  listaMermas();
}
function autoMerma() {
  const p = prodPorNombre($('me-nombre').value),
    pi = $('me-precio'),
    us = $('me-unidad');
  if (p) {
    pi.value = show(p.precio);
    us.value = p.unidad;
  }
  pi.disabled = us.disabled = !!p;
}
