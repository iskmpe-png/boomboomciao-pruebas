/* ---- Manual de la casa: normas y respuestas para cuando el encargado no está ---- */
let manEd = null, // id de la nota que se está editando, 'nuevo' o null
  manF = '',
  manDuda = null;
const ordenadosManual = () => S.manual.slice().sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
/* Si el asistente marca que falta una norma de la casa, se guarda la pregunta para el encargado */
function apuntarDuda(pregunta, r) {
  if (r.content.indexOf(PENDIENTE) < 0) return;
  r.content = r.content.split(PENDIENTE).join('').trim();
  if (!puede(1) || (db && !db.nube) || S.dudas.some((d) => norm(d.pregunta) === norm(pregunta))) return;
  const d = nDuda({ id: nuevoId('dudas'), pregunta: pregunta.slice(0, 400), fecha: new Date().toISOString(), por: miId || '' });
  S.dudas.push(d);
  guardar('dudas', d, true);
  r.error = 'He apuntado esta pregunta para que el encargado deje la respuesta en el Manual.';
}
function manForm(m, duda) {
  return (
    '<form id="form-man" class="card col" novalidate>' +
    (duda ? '<p class="hint">Respuesta a la pregunta del equipo: «' + esc(duda.pregunta) + '»</p>' : '') +
    '<div class="field"><label for="man-t">Título</label><input id="man-t" type="text" autocomplete="off" placeholder="Por ejemplo: Qué hacer si falta un producto del pedido" value="' + esc(m ? m.titulo : duda ? duda.pregunta : '') + '"></div>' +
    '<div class="field"><label for="man-x">Explicación</label><textarea id="man-x" rows="7" placeholder="Escríbelo como se lo explicarías a alguien nuevo, paso a paso.">' + esc(m ? m.texto : '') + '</textarea></div>' +
    '<div class="acciones"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-act="man-cancelar">Cancelar</button></div></form>'
  );
}
function vManual() {
  const f = norm(manF),
    l = ordenadosManual().filter((m) => !f || norm(m.titulo + ' ' + m.texto).indexOf(f) >= 0),
    dudas = puede(2) ? S.dudas.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1)) : [];
  $('vista').innerHTML =
    '<div class="bar"><div class="field grow"><label for="man-b">Buscar en el manual</label><input id="man-b" type="search" autocomplete="off" value="' + esc(manF) + '"></div>' +
    '<button class="btn primary" type="button" data-act="man-nuevo">Nueva nota</button></div>' +
    '<p class="hint">Aquí van las normas de la casa: procedimientos, horarios, a quién llamar, qué hacer si pasa algo. El asistente las lee y responde con ellas cuando no estás.</p>' +
    (manEd === 'nuevo' ? manForm(null, manDuda) : '') +
    (dudas.length
      ? '<section class="card"><h2>Preguntas del equipo sin respuesta</h2><div class="man-lista">' +
        dudas.map((d) => '<div class="man-d"><span><b>' + esc(d.pregunta) + '</b><small>' + esc(fFecha(d.fecha.slice(0, 10)) + (nombre(d.por) ? ' · ' + nombre(d.por) : '')) + '</small></span><span class="m-bts"><button class="btn small primary" type="button" data-act="duda-responder" data-id="' + esc(d.id) + '">Responder</button><button class="btn small" type="button" data-act="duda-borrar" data-id="' + esc(d.id) + '">Descartar</button></span></div>').join('') +
        '</div></section>'
      : '') +
    (l.length
      ? '<section class="card"><div class="man-lista">' +
        l.map((m) =>
          manEd === m.id
            ? manForm(m)
            : '<details class="man"><summary>' + esc(m.titulo || 'Sin título') + '</summary><div class="man-x">' + fmt(m.texto) + '</div>' +
              '<div class="acciones"><button class="link" type="button" data-act="man-editar" data-id="' + esc(m.id) + '">Editar</button><button class="link" type="button" data-act="man-borrar" data-id="' + esc(m.id) + '">Eliminar</button></div></details>',
        ).join('') +
        '</div></section>'
      : manEd === 'nuevo'
        ? ''
        : vacio(S.manual.length ? 'Nada coincide' : 'El manual está vacío', S.manual.length ? 'Prueba con otra palabra.' : 'Empieza por lo que más te preguntan: qué hacer al abrir y al cerrar, cómo recibir un pedido, a quién avisar si algo falla.', ''));
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'man-nuevo') {
    manEd = 'nuevo';
    manDuda = null;
    vManual();
    $('man-t').focus();
  } else if (a === 'man-cancelar') {
    manEd = manDuda = null;
    vManual();
  } else if (a === 'man-editar') {
    manEd = b.dataset.id;
    vManual();
  } else if (a === 'man-borrar') {
    if (confirmar(b, '¿Eliminar?')) {
      borrar('manual', b.dataset.id);
      vManual();
    }
  } else if (a === 'duda-responder') {
    manDuda = S.dudas.find((d) => d.id === b.dataset.id) || null;
    manEd = 'nuevo';
    vManual();
    $('man-x').focus();
  } else if (a === 'duda-borrar') {
    borrar('dudas', b.dataset.id);
    vManual();
  }
});
V.addEventListener('submit', (e) => {
  if (e.target.id !== 'form-man') return;
  e.preventDefault();
  const titulo = $('man-t').value.trim(),
    texto = $('man-x').value.trim();
  if (!titulo || !texto) {
    toast('Escribe el título y la explicación.');
    return;
  }
  let m = manEd && manEd !== 'nuevo' ? S.manual.find((x) => x.id === manEd) : null;
  if (!m) {
    m = nManual({ id: nuevoId('manual') });
    S.manual.push(m);
  }
  m.titulo = titulo;
  m.texto = texto;
  m.actualizado = new Date().toISOString();
  guardar('manual', m, true);
  if (manDuda) borrar('dudas', manDuda.id);
  manEd = manDuda = null;
  vManual();
  toast('Guardado en el manual.');
});
let tMan;
V.addEventListener('input', (e) => {
  if (e.target.id !== 'man-b') return;
  clearTimeout(tMan);
  tMan = setTimeout(() => {
    manF = e.target.value;
    vManual();
    const i = $('man-b');
    i.focus();
    i.setSelectionRange(i.value.length, i.value.length);
  }, 200);
});
