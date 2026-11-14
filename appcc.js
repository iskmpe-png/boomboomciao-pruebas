/* ---- APPCC ---- */
const APT = { temp: 'Temperatura', limpieza: 'Limpieza', recepcion: 'Recepción' };
const apLista = () =>
  S.appcc
    .filter((a) => (apPer === 'mes' ? a.fecha.slice(0, 7) === apDia.slice(0, 7) : a.fecha === apDia))
    .sort((a, z) => (z.fecha + z.hora).localeCompare(a.fecha + a.hora));
const apValor = (a) => (a.tipo === 'limpieza' ? '' : a.valor == null ? '' : fNum(a.valor, 1) + ' °C');
function listaAppcc() {
  const l = apLista();
  $('lista-ap').innerHTML = l.length
    ? l
        .slice(0, lim.appcc)
        .map(
          (a) =>
            '<div class="row" data-id="' +
            esc(a.id) +
            '"><div class="n"><b>' +
            esc(APT[a.tipo] + ' · ' + (a.punto || 'sin punto')) +
            '</b><span>' +
            esc(
              (apPer === 'mes' ? fFecha(a.fecha) + ' ' : '') +
                a.hora +
                (a.quien ? ' · ' + a.quien : porTxt(a.por)) +
                (a.nota ? ' · ' + a.nota : ''),
            ) +
            '</span></div>' +
            '<div class="d"><b>' +
            apValor(a) +
            '</b><span class="pill ' +
            (a.ok ? 'ok' : 'crit') +
            '">' +
            (a.ok ? 'Correcto' : 'Incidencia') +
            '</span><button class="icon" type="button" data-act="ap-borrar" aria-label="Eliminar registro" style="width:34px;height:34px">×</button></div></div>',
        )
        .join('') + masHTML('appcc', l.length)
    : '<p class="hint" style="padding:10px 0">Sin registros ' + (apPer === 'mes' ? 'este mes' : 'este día') + '.</p>';
}
function vAppcc() {
  const pts = {};
  ['Cámara 1', 'Cámara 2', 'Congelador', 'Mesa fría'].forEach((x) => {
    pts[x] = 1;
  });
  S.appcc.forEach((a) => {
    if (a.punto) pts[a.punto] = 1;
  });
  const lblP = { temp: 'Equipo', limpieza: 'Zona o equipo', recepcion: 'Proveedor' }[apTipo];
  $('vista').innerHTML =
    '<div class="bar"><div class="field corto"><label for="ap-dia">Día</label><input id="ap-dia" type="date" value="' +
    esc(apDia) +
    '"></div><div class="field corto"><label for="ap-per">Ver</label><select id="ap-per"><option value="dia"' +
    (apPer === 'dia' ? ' selected' : '') +
    '>Solo ese día</option><option value="mes"' +
    (apPer === 'mes' ? ' selected' : '') +
    '>Todo el mes</option></select></div>' +
    expHTML() +
    '</div>' +
    '<section class="card"><form id="form-appcc" class="editor m6" style="margin:0" novalidate>' +
    '<div class="field"><label for="ap-tipo">Registro</label><select id="ap-tipo">' +
    Object.keys(APT)
      .map((k) => '<option value="' + k + '"' + (k === apTipo ? ' selected' : '') + '>' + APT[k] + '</option>')
      .join('') +
    '</select></div>' +
    '<div class="field"><label for="ap-punto">' +
    lblP +
    '</label><input id="ap-punto" type="text" list="' +
    (apTipo === 'recepcion' ? 'dl-proveedores' : 'dl-puntos') +
    '" autocomplete="off"></div>' +
    (apTipo === 'limpieza'
      ? ''
      : '<div class="field"><label for="ap-valor">Temperatura °C</label><input class="num" id="ap-valor" type="text" inputmode="decimal" placeholder="' +
        (apTipo === 'temp' ? '3,5' : 'opcional') +
        '"></div>') +
    '<div class="field"><label for="ap-quien">Quién</label><input id="ap-quien" type="text" autocomplete="off" value="' +
    esc(et.resp) +
    '"></div>' +
    '<div class="field wide"><label for="ap-nota">' +
    (apTipo === 'recepcion' ? 'Producto y observaciones' : 'Observaciones') +
    '</label><input id="ap-nota" type="text" autocomplete="off"></div>' +
    (apTipo === 'temp'
      ? ''
      : '<label class="check" for="ap-ok"><input type="checkbox" id="ap-ok" checked> ' +
        (apTipo === 'limpieza' ? 'Hecho correctamente' : 'Mercancía aceptada') +
        '</label>') +
    '<button class="btn primary" type="submit">Registrar</button><span class="hint full" id="ap-msg" aria-live="polite">' +
    (apTipo === 'temp' ? 'Se marca incidencia si una cámara pasa de 5 °C o un congelador de −18 °C.' : '') +
    '</span></form>' +
    '<datalist id="dl-puntos">' +
    Object.keys(pts)
      .map((x) => '<option value="' + esc(x) + '"></option>')
      .join('') +
    '</datalist></section>' +
    '<section class="card"><div class="rows" id="lista-ap"></div></section>';
  listaAppcc();
}
