/* ---- Turnos y avisos ----
   Cuadro semanal de cada área (cocina y barra), con el formato de la casa: para cada día, quién
   limpia por la mañana (AM) y por la tarde (PM). A la hora indicada, el servidor manda un aviso
   al móvil de esa persona. Una semana sin cuadro propio repite el de la última semana guardada.
   Solo el encargado de esa área lo cambia; el resto del equipo lo ve. */
const fISO = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
function lunesDe(f) {
  const d = new Date(f + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return fISO(d);
}
let tuSem = lunesDe(hoy()),
  tuArea = '';
/* El cuadro de cocina se guarda con el lunes como id (2026-11-16) y el de barra con «barra-» delante */
const idSem = (lun, a) => (a === 'barra' ? 'barra-' + lun : lun);
const fechaSem = (t) => String(t.id).replace(/^barra-/, '');
const areaTu = () => tuArea || (miArea() !== 'todas' ? miArea() : area === 'barra' ? 'barra' : 'cocina');
const semanas = (a) => {
  a = a || areaTu();
  const re = a === 'barra' ? /^barra-\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/;
  return S.turnos.filter((t) => re.test(t.id)).sort((x, z) => fechaSem(z).localeCompare(fechaSem(x)));
};
/* El cuadro que vale para una semana: el suyo o, si no tiene, el de la última anterior */
function semanaDe(lun, a) {
  a = a || areaTu();
  const l = semanas(a),
    propia = l.find((t) => t.id === idSem(lun, a));
  return propia ? { doc: propia, propia: true } : { doc: l.find((t) => fechaSem(t) < lun) || null, propia: false };
}
/* Para editar una semana que repite otra, primero se copia */
function semanaEditable(lun, a) {
  a = a || areaTu();
  const s = semanaDe(lun, a);
  if (s.propia) return s.doc;
  const d = nTurno({ id: idSem(lun, a), filas: s.doc ? JSON.parse(JSON.stringify(s.doc.filas)) : [] });
  S.turnos.push(d);
  return d;
}
/* Las filas de hoy de las dos áreas (para «Hoy te toca» y APPCC) */
const filasHoy = () => ['cocina', 'barra'].reduce((l, a) => l.concat((semanaDe(lunesDe(hoy()), a).doc || { filas: [] }).filas), []);
const idFila = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
/* ---- Quién es quién: lo escrito en el horario contra los nombres del equipo ---- */
const nrmP = (s) => norm(String(s || '').replace(/\(.*?\)/g, ' '));
const partesP = (t) => String(t || '').split(/[,/+&]|\sy\s/i).map(nrmP).filter(Boolean);
function quienEs(parte) {
  let m = miembros.filter((x) => nrmP(x.nombre) === parte);
  if (!m.length) m = miembros.filter((x) => nrmP(x.nombre).startsWith(parte + ' ') || nrmP(x.nombre).split(' ')[0] === parte);
  return m;
}
const soyYo = (txt) => !!miId && partesP(txt).some((p) => { const m = quienEs(p); return m.length === 1 && m[0].user_id === miId; });
/* «Recibirán aviso…» de una tarea */
function destinosHTML(f) {
  const nombres = {};
  ['am', 'pm'].forEach((fr) =>
    Object.keys(f[fr]).forEach((d) =>
      String(f[fr][d])
        .replace(/\(.*?\)/g, ' ')
        .split(/[,/+&]|\sy\s/i)
        .forEach((t) => {
          const p = nrmP(t);
          if (p && !nombres[p]) nombres[p] = t.trim();
        }),
    ),
  );
  const ks = Object.keys(nombres);
  if (!ks.length) return '<span class="hint">Escribe quién hace cada turno. Si el nombre coincide con su usuario de la app, le llegará el aviso.</span>';
  if (!f.horaAm && !f.horaPm) return '<span class="hint">Pon una hora de aviso para que el móvil les recuerde la tarea.</span>';
  return ks
    .sort()
    .map((p) => {
      const m = quienEs(p),
        n = esc(m.length === 1 ? m[0].nombre : nombres[p]);
      if (!enNube()) return '<span class="pill">' + n + '</span>';
      if (m.length > 1) return '<span class="pill warn" title="Hay varias personas con ese nombre: escribe también el apellido">' + n + ' · ¿cuál?</span>';
      if (!m.length) return '<span class="pill" title="No tiene usuario en la app: no recibe avisos">' + n + ' · sin usuario</span>';
      return pushIds.has(m[0].user_id) ? '<span class="pill ok" title="Recibe los avisos en el móvil">' + n + ' ✓</span>' : '<span class="pill warn" title="Tiene usuario pero no ha activado los avisos en su móvil">' + n + ' · sin activar</span>';
    })
    .join(' ');
}
function pintaDestinos() {
  const s = semanaDe(tuSem);
  if (!s.doc) return;
  s.doc.filas.forEach((f) => {
    const el = q($('vista'), '[data-fila="' + f.id + '"] .destinos');
    if (el) el.innerHTML = destinosHTML(f);
  });
}
const fRango = (lun) => {
  const a = new Date(lun + 'T12:00:00'),
    b = new Date(masDias(lun, 6) + 'T12:00:00'),
    o = { day: 'numeric', month: 'short' };
  return a.toLocaleDateString('es-ES', o) + ' – ' + b.toLocaleDateString('es-ES', o) + ' ' + b.getFullYear();
};
/* Lo que me toca hoy */
function hoyMeTocaHTML() {
  const d = String(new Date().getDay()),
    mio = [];
  filasHoy().forEach((f) =>
      ['am', 'pm'].forEach((fr) => {
        if (f[fr][d] && soyYo(f[fr][d])) mio.push('<li><b>' + esc(f.tarea || 'Tarea') + '</b> · ' + (fr === 'am' ? 'mañana' : 'tarde') + (f.nota ? ' · ' + esc(f.nota) : '') + '</li>');
      }),
  );
  if (!mio.length) return '';
  return '<section class="card tu-hoy"><h3>Hoy te toca</h3><ul>' + mio.join('') + '</ul></section>';
}
function filaHTML(f, k, lun) {
  const hoyD = lun === lunesDe(hoy()) ? new Date().getDay() : -1;
  return (
    '<section class="card turno" data-fila="' + esc(f.id) + '">' +
    '<div class="hoja-l"><div class="hoja-t"><input id="tu-t' + k + '" type="text" data-tf="tarea" aria-label="Nombre de la tarea" value="' + esc(f.tarea) + '" placeholder="LIMPIEZA CÁMARAS Y BODEGA"><span>Boom Boom Ciao · ' + (areaTu() === 'barra' ? 'Barra' : 'Cocina') + ' · Semana del ' + esc(fRango(lun)) + '</span></div>' +
    '<table class="tu-tabla"><thead><tr><th>DÍA</th><th>AM</th><th>PM</th></tr></thead><tbody>' +
    ORDEN_SEMANA.map(
      (d) =>
        '<tr' + (d === hoyD ? ' class="hoy"' : '') + '><th scope="row">' + DIAS_LARGOS[d].charAt(0).toUpperCase() + DIAS_LARGOS[d].slice(1) + '<small>' + new Date(masDias(lun, (d + 6) % 7) + 'T12:00:00').getDate() + '</small></th>' +
        ['am', 'pm']
          .map((fr) => '<td><input type="text" list="dl-equipo" autocomplete="off" aria-label="' + DIAS_LARGOS[d] + ' ' + (fr === 'am' ? 'mañana' : 'tarde') + '" data-td="' + fr + '" data-d="' + d + '" value="' + esc(f[fr][d] || '') + '"></td>')
          .join('') +
        '</tr>',
    ).join('') +
    '</tbody></table></div>' +
    '<div class="acciones tu-exp"><button class="btn small" type="button" data-act="tu-xlsx" data-f="' + esc(f.id) + '">Descargar Excel</button><button class="btn small" type="button" data-act="tu-png" data-f="' + esc(f.id) + '">Imagen para WhatsApp</button>' +
    (puedeArea(areaTu()) ? '<button class="btn small primary" type="button" data-act="tu-repartir">Subir horario y repartir</button><button class="link" type="button" data-act="tu-borrar" style="color:var(--crit)">Quitar tarea</button>' : '') +
    '</div>' +
    '<details class="tu-mas"><summary>Avisos y ajustes</summary><div class="tu-cab">' +
    '<div class="field corto"><label for="tu-ha' + k + '">Aviso AM a las</label><input id="tu-ha' + k + '" type="time" data-tf="horaAm" value="' + esc(f.horaAm) + '"></div>' +
    '<div class="field corto"><label for="tu-hp' + k + '">Aviso PM a las</label><input id="tu-hp' + k + '" type="time" data-tf="horaPm" value="' + esc(f.horaPm) + '"></div>' +
    '<div class="field grow"><label for="tu-n' + k + '">Nota para el aviso</label><input id="tu-n' + k + '" type="text" data-tf="nota" value="' + esc(f.nota) + '" placeholder="Sube las fotos en APPCC › Limpieza"></div>' +
    '<div class="field grow"><label for="tu-x' + k + '">No limpian (al repartir)</label><input id="tu-x' + k + '" type="text" data-tf="excluir" value="' + esc(f.excluir || '') + '" placeholder="Moha, …"></div></div></details>' +
    '<p class="destinos">' + destinosHTML(f) + '</p></section>'
  );
}
/* Avisos personalizados: un texto que llega a su hora los días marcados */
function avisosPHTML() {
  const l = S.ajustes.avisos,
    para = (a) => (a.para === 'encargados' ? 'Encargados' : a.para === 'personas' ? a.personas || 'nadie' : 'Todo el equipo');
  return (
    '<section class="card"><h3>Avisos personalizados</h3><p class="hint">Recordatorios que llegan al móvil a su hora, por ejemplo «Revisar temperaturas de las cámaras» cada día a las 12:00.</p>' +
    (l.length
      ? '<div class="rows">' +
        l
          .map(
            (a) =>
              '<div class="row" data-av="' + esc(a.id) + '"><span class="n"><b>' + esc(a.titulo || a.texto) + '</b><span>' + esc((a.titulo ? a.texto + ' · ' : '') + ORDEN_SEMANA.filter((d) => a.dias.indexOf(d) >= 0).map((d) => DIAS_CORTOS[d]).join(' ') + ' · ' + a.hora + ' · ' + para(a)) + '</span></span>' +
              '<span class="d"><label class="check"><input type="checkbox" data-avon' + (a.activo ? ' checked' : '') + '> Activo</label><button class="icon" type="button" data-act="av-borrar" aria-label="Eliminar aviso" style="width:34px;height:34px">×</button></span></div>',
          )
          .join('') +
        '</div>'
      : '') +
    '<form id="form-avisop" class="editor m6" novalidate style="margin-top:10px">' +
    '<div class="field"><label for="avp-tit">Título</label><input id="avp-tit" type="text" maxlength="60" placeholder="Temperaturas"></div>' +
    '<div class="field wide"><label for="avp-txt">Mensaje *</label><input id="avp-txt" type="text" maxlength="200" placeholder="Apunta las temperaturas de las cámaras en APPCC"></div>' +
    '<div class="field corto"><label for="avp-h">Hora</label><input id="avp-h" type="time" value="12:00"></div>' +
    '<div class="field wide"><span class="lbl">Días</span><div class="dias">' +
    ORDEN_SEMANA.map((d) => '<label class="dia"><input type="checkbox" data-avd="' + d + '" checked><span>' + DIAS_CORTOS[d] + '</span></label>').join('') +
    '</div></div>' +
    '<div class="field"><label for="avp-para">Para</label><select id="avp-para"><option value="todos">Todo el equipo</option><option value="encargados">Encargados</option><option value="personas">Algunas personas</option></select></div>' +
    '<div class="field" id="avp-per-c" hidden><label for="avp-per">Quiénes</label><input id="avp-per" type="text" list="dl-equipo" placeholder="Marco, Laura"></div>' +
    '<button class="btn primary" type="submit">Añadir aviso</button><span class="hint full" id="avp-msg" aria-live="polite"></span></form></section>'
  );
}
function vTurnos() {
  $('dl-equipo').innerHTML = nombresEquipo().map((n) => '<option value="' + esc(n) + '"></option>').join('');
  const a = areaTu(),
    s = semanaDe(tuSem, a),
    actual = tuSem === lunesDe(hoy()),
    hay = semanas(a).length,
    edita = puedeArea(a);
  $('vista').dataset.area = a;
  $('vista').innerHTML =
    '<div class="bar tu-bar" data-libre><div class="seg" role="group" aria-label="Área">' +
    ['cocina', 'barra'].map((x) => '<button type="button" class="seg-b' + (x === a ? ' on' : '') + '" data-act="tu-area" data-a="' + x + '" aria-pressed="' + (x === a) + '">' + (x === 'barra' ? 'Barra' : 'Cocina') + '</button>').join('') +
    '</div><button class="btn small" type="button" data-act="tu-sem" data-n="-7" aria-label="Semana anterior">‹</button><b class="grow tu-rango">Semana del ' + esc(fRango(tuSem)) + (actual ? ' <span class="pill ok">Esta semana</span>' : '') + '</b>' +
    (actual ? '' : '<button class="btn small" type="button" data-act="tu-sem" data-n="0">Hoy</button>') +
    '<button class="btn small" type="button" data-act="tu-sem" data-n="7" aria-label="Semana siguiente">›</button></div>' +
    hoyMeTocaHTML() +
    pushHTML() +
    (!edita && hay ? '<p class="hint">Puedes ver el cuadro de ' + (a === 'barra' ? 'barra' : 'cocina') + '; solo su encargado lo cambia.</p>' : '') +
    (!hay
      ? vacio(
          'Todavía no hay cuadro de ' + (a === 'barra' ? 'barra' : 'cocina'),
          'Crea el cuadro semanal de limpieza o súbelo con el horario de la semana: la app reparte AM y PM según quién trabaja. A cada persona le llegará un aviso al móvil el día que le toque.',
          edita ? '<div class="acciones" style="justify-content:center"><button class="btn primary" type="button" data-act="tu-crear">Crear el cuadro</button><button class="btn" type="button" data-act="tu-repartir">Subir el horario y repartir</button></div>' : '',
        )
      : (!s.propia && s.doc ? '<p class="hint tu-aviso">Esta semana repite el cuadro de la semana del ' + esc(fRango(fechaSem(s.doc))) + '. Si cambias algo o subes el horario nuevo, se guarda como cuadro propio de esta semana.</p>' : '') +
        '<form id="form-turnos" class="col" novalidate>' + (s.doc ? s.doc.filas.map((f, k) => filaHTML(f, k, tuSem)).join('') : '') + '</form>' +
        horarioHTML(s.propia ? s.doc : null) +
        (edita
          ? '<div class="acciones"><button class="btn" type="button" data-act="tu-add">Añadir otra tarea</button>' + (s.propia && semanas(a).some((t) => fechaSem(t) < tuSem) ? '<button class="btn" type="button" data-act="tu-copiar">Copiar la semana anterior</button>' : '') + '</div>'
          : '')) +
    (puede(2) ? avisosPHTML() : '');
  pintaPush();
  cargarPushIds();
}
/* Plantilla inicial: el cuadro de limpieza de la casa (cocina: cámaras y bodega) */
function plantillaTurnos(a) {
  if (a === 'barra') return [{ id: idFila(), tarea: 'LIMPIEZA DE BARRA', horaAm: '10:00', horaPm: '17:00', nota: 'Sube las fotos en APPCC › Limpieza.', excluir: '', am: {}, pm: {} }];
  return [
    {
      id: idFila(),
      tarea: 'LIMPIEZA CÁMARAS Y BODEGA',
      horaAm: '10:00',
      horaPm: '17:00',
      nota: 'Sube las fotos en APPCC › Limpieza.',
      excluir: '',
      am: { 1: 'Dahianna', 2: 'Genoveba', 3: 'Junior', 4: 'Laura', 5: 'Gilbert', 6: 'James', 0: 'Kevin (16h)' },
      pm: { 1: 'Marco', 2: 'Gilbert', 3: 'Kevin Molina', 4: 'Sandra', 5: 'Fouad', 6: 'Joel', 0: 'Kevin Molina' },
    },
  ];
}
let tuT = null;
function guardaTurno(d) {
  clearTimeout(tuT);
  tuT = setTimeout(() => guardar('turnos', d, true), 400);
}
V.addEventListener('change', (e) => {
  const t = e.target;
  if (pant !== 'turnos' || !puedeArea(areaTu())) return;
  const fe = t.closest('[data-fila]');
  if (fe && (t.dataset.tf || t.dataset.td)) {
    const eraPropia = semanaDe(tuSem).propia,
      d = semanaEditable(tuSem),
      f = d.filas.find((x) => x.id === fe.dataset.fila);
    if (!f) return;
    if (t.dataset.tf) f[t.dataset.tf] = t.value.trim();
    else {
      const v = t.value.trim();
      if (v) f[t.dataset.td][t.dataset.d] = v;
      else delete f[t.dataset.td][t.dataset.d];
    }
    guardaTurno(d);
    const el = q(fe, '.destinos');
    if (el) el.innerHTML = destinosHTML(f);
    if (!eraPropia) {
      const av = q($('vista'), '.tu-aviso');
      if (av) av.remove();
      toast('Guardado como horario propio de esta semana.');
    }
    return;
  }
  const r = t.closest('[data-av]');
  if (r && t.hasAttribute('data-avon')) {
    const a = S.ajustes.avisos.find((x) => x.id === r.dataset.av);
    if (a) {
      a.activo = t.checked;
      guardar('ajustes', S.ajustes, true);
    }
  }
  if (t.id === 'avp-para') $('avp-per-c').hidden = t.value !== 'personas';
});
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act^="tu-"],[data-act="av-borrar"]');
  if (!b || pant !== 'turnos') return;
  const a = b.dataset.act;
  if (a === 'tu-sem') {
    const n = +b.dataset.n;
    tuSem = n ? masDias(tuSem, n) : lunesDe(hoy());
    vTurnos();
    return;
  }
  if (a === 'tu-area') {
    tuArea = b.dataset.a;
    vTurnos();
    return;
  }
  if (a === 'tu-xlsx' || a === 'tu-png') {
    const s = semanaDe(tuSem),
      f = s.doc && s.doc.filas.find((x) => x.id === b.dataset.f);
    if (f) (a === 'tu-xlsx' ? excelLimpieza : imagenLimpieza)(f, tuSem);
    return;
  }
  if (!puedeArea(areaTu())) return toast('Solo el encargado de ' + (areaTu() === 'barra' ? 'barra' : 'cocina') + ' puede cambiar este cuadro.');
  if (a === 'tu-repartir') {
    abrirRepartir();
    return;
  }
  if (a === 'tu-crear') {
    const d = nTurno({ id: idSem(tuSem, areaTu()), filas: plantillaTurnos(areaTu()) });
    S.turnos.push(d);
    guardar('turnos', d, true);
    vTurnos();
    toast('Horario creado. Revisa los nombres y las horas de aviso.');
  } else if (a === 'tu-add') {
    const d = semanaEditable(tuSem);
    d.filas.push({ id: idFila(), tarea: '', nota: '', horaAm: '10:00', horaPm: '17:00', excluir: '', am: {}, pm: {} });
    guardar('turnos', d, true);
    vTurnos();
    const l = $('vista').querySelectorAll('[data-tf="tarea"]');
    if (l.length) l[l.length - 1].focus();
  } else if (a === 'tu-borrar') {
    const id = b.closest('[data-fila]').dataset.fila;
    if (!confirmar(b, '¿Quitar esta tarea?')) return;
    const d = semanaEditable(tuSem);
    d.filas = d.filas.filter((x) => x.id !== id);
    guardar('turnos', d, true);
    vTurnos();
  } else if (a === 'tu-copiar') {
    const prev = semanas().find((t) => fechaSem(t) < tuSem),
      d = semanaEditable(tuSem);
    if (!prev || !confirmar(b, '¿Sustituir esta semana por la del ' + fRango(fechaSem(prev)) + '?')) return;
    d.filas = JSON.parse(JSON.stringify(prev.filas));
    guardar('turnos', d, true);
    vTurnos();
    toast('Copiado el horario de la semana anterior.');
  } else if (a === 'av-borrar') {
    const id = b.closest('[data-av]').dataset.av;
    if (!confirmar(b, '¿Eliminar este aviso?')) return;
    S.ajustes.avisos = S.ajustes.avisos.filter((x) => x.id !== id);
    guardar('ajustes', S.ajustes, true);
    vTurnos();
  }
});
V.addEventListener('submit', (e) => {
  if (e.target.id !== 'form-avisop') return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (!puede(2)) return;
  const txt = $('avp-txt').value.trim(),
    dias = Array.from($('vista').querySelectorAll('[data-avd]:checked')).map((x) => +x.dataset.avd),
    para = $('avp-para').value;
  if (!txt) {
    $('avp-msg').textContent = 'Escribe el mensaje del aviso.';
    $('avp-txt').focus();
    return;
  }
  if (!dias.length) {
    $('avp-msg').textContent = 'Marca al menos un día.';
    return;
  }
  if (para === 'personas' && !$('avp-per').value.trim()) {
    $('avp-msg').textContent = 'Escribe a quién va dirigido.';
    $('avp-per').focus();
    return;
  }
  S.ajustes.avisos.push(nAvisoP({ id: idFila(), titulo: $('avp-tit').value.trim(), texto: txt, hora: $('avp-h').value, dias: dias, para: para, personas: $('avp-per').value.trim() }));
  guardar('ajustes', S.ajustes, true);
  vTurnos();
  toast('Aviso añadido.');
});
