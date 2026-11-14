/* ---- Etiquetas ---- */
const masDias = (f, d) => {
  const x = new Date(f + 'T12:00:00');
  x.setDate(x.getDate() + d);
  return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
};
const fCorta = (s) => {
  const d = new Date(s + 'T12:00:00');
  return isNaN(d) ? '' : pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
};
function datosEt() {
  const p = plato(et.id);
  if (!p) return null;
  const dias = p.caducidad > 0 ? p.caducidad : 3;
  return {
    p: p,
    nombre: p.nombre,
    elab: et.fecha,
    cad: masDias(et.fecha, dias),
    dias: dias,
    alg: algDe(p),
    resp: et.resp,
  };
}
function pintarEt() {
  const d = datosEt(),
    o = $('et-prev');
  if (!o) return;
  o.innerHTML = d
    ? '<div class="lab"><div class="lab-top">BOOM BOOM CIAO</div><div class="lab-n">' +
      esc(d.nombre) +
      '</div><div class="lab-f"><div><span class="lbl">Elaborado</span><b>' +
      fCorta(d.elab) +
      '</b></div><div><span class="lbl">Caduca</span><b>' +
      fCorta(d.cad) +
      '</b></div></div><p><span class="lbl">Alérgenos</span> ' +
      esc(d.alg.length ? algTxt(d.alg) : 'ninguno marcado') +
      '</p>' +
      (d.resp ? '<p><span class="lbl">Responsable</span> ' + esc(d.resp) + '</p>' : '') +
      '</div>'
    : '';
}
function vEtiquetas() {
  if (!plato(et.id)) {
    const b = ordenados(S.platos.filter((p) => p.base))[0] || ordenados(S.platos)[0];
    et.id = b ? b.id : null;
  }
  const d = datosEt();
  if (!d) {
    $('vista').innerHTML = vacio(
      'Aún no hay fichas',
      'Crea una elaboración en Carta y podrás sacar su etiqueta con fecha y caducidad.',
      '',
    );
    return;
  }
  $('vista').innerHTML =
    '<div class="bar"><div class="field"><label for="et-plato">Elaboración o plato</label><select id="et-plato">' +
    opcionesPlatos(et.id) +
    '</select></div>' +
    expHTML() +
    '</div>' +
    '<div class="dos"><section class="card"><div class="ficha"><div class="field"><label for="et-fecha">Elaborado el</label><input id="et-fecha" type="date" value="' +
    esc(et.fecha) +
    '"></div><div class="field"><label for="et-dias">Días de vida</label><input class="num" id="et-dias" type="text" inputmode="numeric" value="' +
    d.dias +
    '"></div>' +
    '<div class="field wide"><label for="et-resp">Responsable</label><input id="et-resp" type="text" autocomplete="off" value="' +
    esc(et.resp) +
    '"></div></div><p class="hint">Los días de vida se guardan en la ficha. Exporta la etiqueta en PNG o PDF para imprimirla.</p></section>' +
    '<section class="card" id="et-prev"></section></div>';
  pintarEt();
}
function lienzoEt(d) {
  const cv = document.createElement('canvas');
  cv.width = 1000;
  cv.height = 620;
  const g = cv.getContext('2d'),
    P = PAPEL;
  g.fillStyle = '#FFFFFF';
  g.fillRect(0, 0, 1000, 620);
  g.fillStyle = P.az;
  g.fillRect(0, 0, 1000, 96);
  g.fillStyle = P.oro;
  g.font = '44px Anton,Impact,sans-serif';
  g.fillText('BOOM BOOM CIAO', 40, 66);
  const corta = (t, w) => {
    if (g.measureText(t).width <= w) return t;
    while (t.length > 1 && g.measureText(t + '…').width > w) t = t.slice(0, -1);
    return t + '…';
  };
  g.fillStyle = P.ink;
  g.font = '84px "Instrument Serif",Georgia,serif';
  g.fillText(corta(d.nombre, 920), 40, 196);
  g.fillStyle = P.mut;
  g.font = '500 22px "DM Mono",monospace';
  g.fillText('ELABORADO', 40, 262);
  g.fillText('CADUCA', 520, 262);
  g.fillStyle = P.ink;
  g.font = '84px Anton,Impact,sans-serif';
  g.fillText(fCorta(d.elab), 40, 350);
  g.fillStyle = '#A3261E';
  g.fillText(fCorta(d.cad), 520, 350);
  g.strokeStyle = P.lin;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(40, 392);
  g.lineTo(960, 392);
  g.stroke();
  g.fillStyle = P.mut;
  g.font = '500 22px "DM Mono",monospace';
  g.fillText('ALÉRGENOS', 40, 438);
  g.fillStyle = P.ink;
  g.font = '600 30px "Hanken Grotesk",sans-serif';
  const ws = (d.alg.length ? algTxt(d.alg) : 'Ninguno marcado').split(' ');
  let ln = '',
    y = 480;
  ws.forEach((w) => {
    const t = ln ? ln + ' ' + w : w;
    if (g.measureText(t).width > 920 && ln) {
      g.fillText(ln, 40, y);
      y += 40;
      ln = w;
    } else ln = t;
  });
  g.fillText(ln, 40, y);
  if (d.resp) {
    g.fillStyle = P.mut;
    g.font = '500 22px "DM Mono",monospace';
    g.fillText(corta('RESPONSABLE: ' + d.resp.toUpperCase(), 920), 40, 590);
  }
  return cv;
}
