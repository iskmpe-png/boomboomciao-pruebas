/* ---- Tareas del día (tablón) ----
   Cualquiera del equipo apunta lo que hay que hacer («Salsa pecorino · 2 L»), lo marca al
   terminar con cuánto salió y quién lo hizo, y lo que no se acaba pasa al día siguiente.
   Por la noche se deja preparada la lista de mañana y al abrir todos saben qué toca. */
let tdDia = 'hoy',
  tdAbierta = '',
  tdNueva = false;
const mananaDe = (f) => {
  const d = new Date(f + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};
const horaDe = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};
const fechaTd = () => (tdDia === 'manana' ? mananaDe(hoy()) : hoy());
const tareasDe = (f) =>
  S.tareas
    .filter((t) => t.fecha === f && enArea(t))
    .sort((a, z) => (a.hecha === z.hecha ? a.orden - z.orden || a.texto.localeCompare(z.texto, 'es') : a.hecha ? 1 : -1));
/* Lo que se quedó sin hacer en días anteriores (hasta una semana): se ofrece pasarlo a hoy */
const atrasadas = () => {
  const h = hoy(),
    t0 = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  return S.tareas.filter((t) => !t.hecha && t.fecha < h && t.fecha >= t0 && enArea(t));
};
function tareaHTML(t) {
  const ab = tdAbierta === t.id,
    puedoBorrar = puede(2) || esMio(t);
  return (
    '<li class="td-t' + (t.hecha ? ' hecha' : '') + '" data-td="' + esc(t.id) + '">' +
    '<button type="button" class="td-ck" data-act="td-marcar" aria-pressed="' + t.hecha + '" aria-label="' + (t.hecha ? 'Desmarcar «' : 'Marcar como hecha «') + esc(t.texto) + '»">' + (t.hecha ? '✓' : '') + '</button>' +
    '<span class="td-tx"><b>' + esc(t.texto) + '</b>' +
    (t.cant ? '<small>Hacer: ' + esc(t.cant) + '</small>' : '') +
    (t.hecha ? '<small class="td-ok">Hecha' + (t.hechaCant ? ': ' + esc(t.hechaCant) : '') + (t.hechaPor ? ' · ' + esc(t.hechaPor) : '') + (t.hechaEn ? ' · ' + esc(horaDe(t.hechaEn)) : '') + '</small>' : '') +
    (t.desde && !t.hecha ? '<small class="td-viene">Viene del ' + esc(fCorta(t.desde)) + '</small>' : '') +
    '</span>' +
    '<span class="td-acc">' +
    (!t.hecha && t.fecha === hoy() ? '<button type="button" class="link" data-act="td-manana">A mañana</button>' : '') +
    (puedoBorrar ? '<button type="button" class="link td-x" data-act="td-borrar" aria-label="Borrar «' + esc(t.texto) + '»">✕</button>' : '') +
    '</span>' +
    (ab
      ? '<form class="td-fin" data-td-form="' + esc(t.id) + '" novalidate><div class="field"><label for="tdc-' + esc(t.id) + '">¿Cuánto salió?</label><input id="tdc-' + esc(t.id) + '" type="text" autocomplete="off" maxlength="40" placeholder="' + esc(t.cant || '2 L, 3 bandejas…') + '" value="' + esc(t.cant) + '"></div>' +
        '<div class="field"><label for="tdp-' + esc(t.id) + '">Responsable</label><input id="tdp-' + esc(t.id) + '" type="text" list="dl-equipo" autocomplete="off" maxlength="60" value="' + esc(miNombre()) + '"></div>' +
        '<button class="btn primary" type="submit">Hecha</button><button class="link" type="button" data-act="td-cancelar">Cancelar</button></form>'
      : '') +
    '</li>'
  );
}
function tareasHTML() {
  const f = fechaTd(),
    l = tareasDe(f),
    hechas = l.filter((t) => t.hecha).length,
    atr = tdDia === 'hoy' ? atrasadas() : [],
    pend = tdDia === 'hoy' ? l.filter((t) => !t.hecha).length : 0;
  return (
    '<section class="card tareas" id="tareas"><div class="td-cab"><h3>Tareas ' + (tdDia === 'hoy' ? 'de hoy' : 'de mañana') + '</h3>' +
    (l.length ? '<span class="pill' + (hechas === l.length ? ' ok' : '') + '">' + hechas + ' de ' + l.length + '</span>' : '') +
    '<div class="seg td-seg" role="radiogroup" aria-label="Qué día"><button type="button" data-act="td-dia" data-d="hoy" aria-pressed="' + (tdDia === 'hoy') + '">Hoy</button><button type="button" data-act="td-dia" data-d="manana" aria-pressed="' + (tdDia === 'manana') + '">Mañana</button></div></div>' +
    (atr.length
      ? '<div class="td-atr"><span>' + atr.length + (atr.length === 1 ? ' tarea de días anteriores sin terminar' : ' tareas de días anteriores sin terminar') + '</span><button type="button" class="btn small" data-act="td-traer">Pasarlas a hoy</button></div>'
      : '') +
    (l.length ? '<ul class="td-l">' + l.map(tareaHTML).join('') + '</ul>' : '<p class="hint">' + (tdDia === 'hoy' ? 'No hay tareas para hoy.' : 'Aún no hay tareas para mañana. Déjalas apuntadas antes de cerrar y al abrir todos sabrán qué toca.') + '</p>') +
    (puede(1)
      ? tdNueva
        ? '<form id="form-tareas" class="td-nueva" novalidate><div class="field wide"><label for="td-txt">Tareas para ' + (tdDia === 'hoy' ? 'hoy' : 'mañana') + ' (una por línea)</label><textarea id="td-txt" rows="4" maxlength="2000" placeholder="Salsa pecorino · 2 L\nMasa de pizza · 40 bolas\nLimpiar la cámara 2"></textarea><span class="hint">Si quieres poner la cantidad, sepárala con « · », « - » o « : ».</span></div>' +
          '<div class="acciones"><button class="btn primary" type="submit">Guardar tareas</button><button class="link" type="button" data-act="td-cerrar">Cancelar</button></div></form>'
        : '<div class="acciones"><button class="btn" type="button" data-act="td-nueva">＋ Añadir tareas</button>' +
          (pend ? '<button class="link" type="button" data-act="td-todas-manana">Pasar las ' + pend + ' pendientes a mañana</button>' : '') +
          '</div>'
      : '') +
    '</section>'
  );
}
function pintarTareas() {
  const o = $('tareas');
  if (o) o.outerHTML = tareasHTML();
}
/* «Salsa pecorino · 2 L» → texto y cantidad */
function partirTarea(l) {
  const m = /^(.*?)\s+(?:·|-|–|:|x)\s+(.+)$/.exec(l);
  return m && m[1].trim() ? { texto: m[1].trim(), cant: m[2].trim() } : { texto: l.trim(), cant: '' };
}
function moverTarea(t, f) {
  if (!t.desde) t.desde = t.fecha;
  t.fecha = f;
  t.orden = Date.now();
  guardar('tareas', t, true);
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act^="td-"]');
  if (!b) return;
  const a = b.dataset.act,
    li = b.closest('[data-td]'),
    t = li ? S.tareas.find((x) => x.id === li.dataset.td) : null;
  if (a === 'td-dia') {
    tdDia = b.dataset.d === 'manana' ? 'manana' : 'hoy';
    tdNueva = false;
    tdAbierta = '';
  } else if (a === 'td-nueva') {
    tdNueva = true;
    pintarTareas();
    if ($('td-txt')) $('td-txt').focus();
    return;
  } else if (a === 'td-cerrar') tdNueva = false;
  else if (a === 'td-cancelar') tdAbierta = '';
  else if (a === 'td-marcar' && t) {
    if (!puede(1)) return toast('Tu usuario no puede marcar tareas.');
    if (t.hecha) {
      t.hecha = false;
      t.hechaCant = t.hechaPor = t.hechaEn = '';
      guardar('tareas', t, true);
    } else {
      tdAbierta = tdAbierta === t.id ? '' : t.id;
      pintarTareas();
      const i = $('tdc-' + t.id);
      if (i) i.focus();
      return;
    }
  } else if (a === 'td-manana' && t) {
    moverTarea(t, mananaDe(hoy()));
    toast('«' + t.texto + '» pasa a mañana.');
  } else if (a === 'td-todas-manana') {
    const l = tareasDe(hoy()).filter((x) => !x.hecha);
    if (!confirmar(b, '¿Pasar ' + l.length + ' a mañana?')) return;
    l.forEach((x) => moverTarea(x, mananaDe(hoy())));
    toast(l.length === 1 ? '1 tarea pasa a mañana.' : l.length + ' tareas pasan a mañana.');
  } else if (a === 'td-traer') {
    const l = atrasadas();
    l.forEach((x) => moverTarea(x, hoy()));
    toast(l.length === 1 ? '1 tarea pasada a hoy.' : l.length + ' tareas pasadas a hoy.');
  } else if (a === 'td-borrar' && t) {
    if (!(puede(2) || esMio(t))) return toast('Solo quien la apuntó o el encargado pueden borrarla.');
    if (!confirmar(b, '¿Borrar?')) return;
    borrar('tareas', t.id);
  }
  pintarTareas();
});
V.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.id === 'form-tareas') {
    e.preventDefault();
    const ls = $('td-txt')
      .value.split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 40);
    if (!ls.length) {
      toast('Escribe al menos una tarea.');
      $('td-txt').focus();
      return;
    }
    const fe = fechaTd(),
      base = Date.now(),
      yo = miNombre();
    ls.forEach((l, k) => {
      const x = partirTarea(l),
        t = nTarea({ id: nuevoId('tareas'), fecha: fe, texto: x.texto, cant: x.cant, area: areaNueva(), orden: base + k, por: miId || '', porNombre: yo });
      S.tareas.push(t);
      guardar('tareas', t, true);
    });
    tdNueva = false;
    pintarTareas();
    toast(ls.length === 1 ? 'Tarea apuntada.' : ls.length + ' tareas apuntadas.');
  } else if (f.dataset.tdForm) {
    e.preventDefault();
    const t = S.tareas.find((x) => x.id === f.dataset.tdForm);
    if (!t) return;
    const quien = ($('tdp-' + t.id).value || '').trim();
    if (!quien) {
      toast('Escribe quién la hizo.');
      $('tdp-' + t.id).focus();
      return;
    }
    t.hecha = true;
    t.hechaCant = ($('tdc-' + t.id).value || '').trim();
    t.hechaPor = quien;
    t.hechaEn = new Date().toISOString();
    guardar('tareas', t, true);
    tdAbierta = '';
    pintarTareas();
    toast('✓ «' + t.texto + '» hecha.');
  }
});
