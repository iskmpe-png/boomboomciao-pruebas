/* ---- Horario semanal del equipo (Turnos) ----
   Foto o PDF de la hoja de horarios de la semana. Se guarda en el almacén «albaranes» (carpeta
   <restaurante>/horarios/<área>/<lunes>-…) y su ficha va en el cuadro de la semana (campo «hoja»).
   Sin conexión se queda en el dispositivo y se sube después. Una semana sin hoja propia enseña la
   última anterior. Lo sube quien edita el área; todo el equipo lo ve. */
const HE_MAX = 12 * 1024 * 1024;
const heUrls = new Map();
function hojaDe(lun, a) {
  const l = semanas(a).filter((t) => t.hoja && fechaSem(t) <= lun);
  const d = l[0];
  return d ? { doc: d, propia: fechaSem(d) === lun } : null;
}
function horarioEquipoHTML() {
  const a = areaTu(),
    h = hojaDe(tuSem, a),
    edita = puedeArea(a),
    nom = AREA_TU[a].toLowerCase();
  let cuerpo;
  if (!h) cuerpo = '<p class="hint">Todavía no hay horario semanal de ' + nom + '.' + (edita ? ' Sube la hoja en foto (JPG, PNG) o PDF para que todo el equipo la vea.' : '') + '</p>';
  else {
    const f = h.doc.hoja;
    cuerpo =
      (h.propia ? '' : '<p class="hint tu-aviso">Esta semana repite el horario de la semana del ' + esc(fRango(fechaSem(h.doc))) + '.</p>') +
      (f.tipo === 'pdf'
        ? '<button type="button" class="btn" data-act="he-ver" data-ruta="' + esc(f.ruta) + '">Ver horario (PDF)</button>'
        : '<button type="button" class="he-img" data-act="he-ver" data-ruta="' + esc(f.ruta) + '" aria-label="Ampliar el horario semanal"><img alt="Horario semanal del equipo" data-ruta="' + esc(f.ruta) + '"></button>') +
      '<p class="hint">' + esc(f.nombre || 'Horario') + (f.pendiente ? ' · sin subir (se subirá al volver la conexión)' : '') + '</p>';
  }
  return (
    '<section class="card" id="he-card"><h3>Horario semanal del equipo</h3>' + cuerpo +
    (edita
      ? '<div class="acciones"><button class="btn small primary" type="button" data-act="he-subir">' + (h && h.propia ? 'Reemplazar horario' : 'Subir horario de esta semana') + '</button>' +
        (h && h.propia ? '<button class="link" type="button" data-act="he-quitar" style="color:var(--crit)">Quitar horario</button>' : '') + '</div>'
      : '') +
    '<span class="hint" id="he-msg" aria-live="polite"></span></section>'
  );
}
async function blobHorario(ruta) {
  const l = (await idb.get('archpend:' + ruta)) || (await idb.get('arch:' + ruta));
  if (l) return l;
  if (!enNube()) return null;
  const r = await sb.storage.from(ARCH).download(ruta);
  if (r.error) throw r.error;
  return r.data;
}
async function urlHorario(ruta) {
  let u = heUrls.get(ruta);
  if (!u) {
    const b = await blobHorario(ruta);
    if (!b) return '';
    u = URL.createObjectURL(b);
    heUrls.set(ruta, u);
  }
  return u;
}
function pintaHorarioEquipo() {
  const c = $('he-card');
  if (!c) return;
  c.querySelectorAll('img[data-ruta]').forEach(async (im) => {
    try {
      const u = await urlHorario(im.dataset.ruta);
      if (u) im.src = u;
    } catch (e) {
      im.closest('.he-img').classList.add('rota');
    }
  });
}
async function subirHorarioEquipo(file) {
  const msg = $('he-msg'),
    ext = (String(file.name).split('.').pop() || '').toLowerCase(),
    esPdf = ext === 'pdf' || file.type === 'application/pdf';
  const di = (t) => {
    if (msg) msg.textContent = t;
    toast(t);
  };
  if (!esPdf && !/^image\//.test(file.type) && !/^(jpe?g|png|webp)$/.test(ext)) return di('Solo se admiten fotos (JPG, PNG) o PDF.');
  if (esPdf && file.size > HE_MAX) return di('El PDF pesa más de 12 MB.');
  let blob = file;
  if (!esPdf)
    try {
      blob = await reducir(file, 2200);
    } catch (e) {
      return di('No se pudo abrir la imagen (en iPhone: Ajustes › Cámara › Formatos › «Más compatible»).');
    }
  const a = areaTu(),
    e2 = esPdf ? 'pdf' : 'jpg',
    ruta = (rid || 'local') + '/horarios/' + a + '/' + tuSem + '-' + Date.now().toString(36) + '.' + e2,
    f = { ruta: ruta, nombre: String(file.name).slice(0, 120), tipo: esPdf ? 'pdf' : 'foto', tam: blob.size, subido: new Date().toISOString(), por: miId || '' };
  if (!enNube()) await idb.set('arch:' + ruta, blob);
  else
    try {
      const r = await sb.storage.from(ARCH).upload(ruta, blob, { contentType: esPdf ? 'application/pdf' : 'image/jpeg', upsert: true });
      if (r.error) throw r.error;
    } catch (e) {
      await idb.set('archpend:' + ruta, blob);
      f.pendiente = true;
    }
  const d = semanaEditable(tuSem, a),
    vieja = d.hoja;
  d.hoja = f;
  guardar('turnos', d, true);
  if (vieja) quitarFicheroHorario(vieja);
  if (pant === 'turnos') vTurnos();
  toast('Horario semanal guardado.');
}
async function quitarFicheroHorario(f) {
  const u = heUrls.get(f.ruta);
  if (u) URL.revokeObjectURL(u);
  heUrls.delete(f.ruta);
  try {
    await Promise.all([idb.del('arch:' + f.ruta), idb.del('archpend:' + f.ruta)]);
    if (enNube() && !sinRed) await sb.storage.from(ARCH).remove([f.ruta]);
  } catch (e) {}
}
async function subirHorariosPend() {
  if (!enNube() || sinRed) return;
  for (const t of S.turnos) {
    const f = t.hoja;
    if (!f || !f.pendiente) continue;
    const b = await idb.get('archpend:' + f.ruta);
    if (b) {
      const r = await sb.storage.from(ARCH).upload(f.ruta, b, { contentType: f.tipo === 'pdf' ? 'application/pdf' : 'image/jpeg', upsert: true });
      if (r.error) continue;
      await idb.del('archpend:' + f.ruta);
    }
    delete f.pendiente;
    guardar('turnos', t, true);
  }
}
setInterval(subirHorariosPend, 60000);
window.addEventListener('online', () => setTimeout(subirHorariosPend, 3000));
V.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act^="he-"]');
  if (!b || pant !== 'turnos') return;
  const a = b.dataset.act;
  if (a === 'he-ver') {
    const h = hojaDe(tuSem, areaTu()),
      f = h && h.doc.hoja;
    if (!f) return;
    capa(capaTop('Horario semanal del equipo', 'Semana del ' + fRango(fechaSem(h.doc))) + '<div class="visor"><p class="hint">Cargando…</p></div>');
    try {
      const u = await urlHorario(f.ruta),
        v = q($('capa'), '.visor');
      if (!u) throw new Error('no');
      if (v)
        v.innerHTML =
          (f.tipo === 'pdf' ? '<iframe class="he-pdf" src="' + u + '" title="Horario semanal (PDF)"></iframe>' : '<img src="' + u + '" alt="Horario semanal del equipo">') +
          '<div class="acciones"><a class="btn primary" href="' + u + '" target="_blank" rel="noopener">Abrir</a></div>';
    } catch (er) {
      const v = q($('capa'), '.visor');
      if (v) v.innerHTML = '<p class="aviso">No se pudo abrir el horario' + (sinRed ? ': no hay conexión.' : '.') + '</p>';
    }
    return;
  }
  if (!puedeArea(areaTu())) return toast('Solo el encargado de ' + AREA_TU[areaTu()].toLowerCase() + ' puede cambiar el horario.');
  if (a === 'he-subir') {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = 'image/jpeg,image/png,application/pdf,.pdf,.jpg,.jpeg,.png';
    i.onchange = () => i.files[0] && subirHorarioEquipo(i.files[0]);
    i.click();
  } else if (a === 'he-quitar') {
    if (!confirmar(b, '¿Quitar el horario de esta semana?')) return;
    const d = semanaDe(tuSem).doc;
    if (!d || !d.hoja || fechaSem(d) !== tuSem) return;
    const f = d.hoja;
    d.hoja = null;
    guardar('turnos', d, true);
    quitarFicheroHorario(f);
    vTurnos();
  }
});
