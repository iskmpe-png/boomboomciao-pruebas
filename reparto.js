/* ---- Reparto automático de la limpieza ----
   Se sube el horario de la semana de cocina o de barra (foto, PDF o Excel). La IA lee quién trabaja
   de mañana (AM), de tarde (PM), todo el día o libra, y la app reparte la limpieza:
   - una persona por la mañana y otra por la tarde cada día, entre quienes trabajan ese turno;
   - equitativo: nadie repite hasta que todos hayan limpiado una vez;
   - si alguien tiene que repetir, le toca a quien menos ha repetido las últimas semanas;
   - sin dos limpiezas el mismo día y, si se puede, tampoco en días seguidos ni en el mismo hueco que la semana pasada. */
const DIA_NUM = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0 };
const TURNO_TXT = { am: 'AM', pm: 'PM', completo: 'Todo', libre: 'Libre' };
const HORARIO_PROMPT =
  'Es el horario semanal del personal de un restaurante (cocina o barra). Devuelve SOLO JSON:\n' +
  '{"semana_desde":"AAAA-MM-DD" o null,"personas":[{"nombre":"nombre tal como aparece","dias":{"lunes":"am","martes":"pm","miercoles":"completo","jueves":"libre","viernes":"am","sabado":"pm","domingo":"libre"},"horas":{"lunes":"10:00-16:00"}}],"limpieza":null}\n' +
  'Para cada día usa exactamente uno de estos valores:\n' +
  '- "am": trabaja solo de mañana o mediodía (sale antes de las 18:00 aprox.).\n' +
  '- "pm": trabaja solo de tarde o noche (entra a partir de las 15:00 aprox.).\n' +
  '- "completo": trabaja mañana y noche (turno partido o jornada entera).\n' +
  '- "libre": no trabaja (L, libre, descanso, vacaciones, celda vacía).\n' +
  'Incluye a todas las personas del horario. "horas" es opcional: copia las horas de cada día si aparecen.\n' +
  'Si el documento NO es un horario de personal sino un cuadro de limpieza ya hecho (columnas DÍA, AM y PM con nombres), deja "personas":[] y devuelve "limpieza":{"lunes":{"am":"nombre","pm":"nombre"},"martes":{...},...}.\n';
let rep = null;
/* Historial de las últimas semanas: cuántas veces limpió cada uno, quién repitió y en qué hueco estuvo */
function historiaLimpieza(lun, tarea) {
  const h = { total: {}, repitio: {}, ultimo: {} },
    prev = semanas()
      .filter((t) => fechaSem(t) < lun)
      .slice(0, 4);
  prev.forEach((doc, i) => {
    const f = doc.filas.find((x) => norm(x.tarea) === norm(tarea)) || doc.filas.find((x) => /limpi/.test(norm(x.tarea)));
    if (!f) return;
    const n = {};
    ['am', 'pm'].forEach((fr) =>
      Object.keys(f[fr]).forEach((d) =>
        partesP(f[fr][d]).forEach((p) => {
          n[p] = (n[p] || 0) + 1;
          if (i === 0) (h.ultimo[p] || (h.ultimo[p] = [])).push(d + fr);
        }),
      ),
    );
    Object.keys(n).forEach((p) => {
      h.total[p] = (h.total[p] || 0) + n[p];
      if (n[p] >= 2) h.repitio[p] = (h.repitio[p] || 0) + 1;
    });
  });
  return h;
}
/* Pequeño desempate pseudoaleatorio (cambia con «Repartir de otra forma») */
const azar = (sem, t) => {
  let x = 2166136261 ^ sem;
  for (let i = 0; i < t.length; i++) x = Math.imul(x ^ t.charCodeAt(i), 16777619);
  return ((x >>> 0) % 1000) / 1000;
};
function repartir(personas, excluir, hist, sem) {
  const fuera = new Set(partesP(excluir)),
    gente = personas.filter((p) => !fuera.has(nrmP(p.nombre))),
    huecos = [];
  ORDEN_SEMANA.forEach((d) =>
    ['am', 'pm'].forEach((fr) => huecos.push({ d: d, fr: fr, c: gente.filter((p) => p.dias[d] === fr || p.dias[d] === 'completo') })),
  );
  huecos.sort((a, z) => a.c.length - z.c.length || ORDEN_SEMANA.indexOf(a.d) - ORDEN_SEMANA.indexOf(z.d));
  const cuenta = {},
    dias = {},
    res = { am: {}, pm: {} },
    faltan = [];
  huecos.forEach((h) => {
    let mejor = null,
      pm = Infinity;
    h.c.forEach((p) => {
      const k = nrmP(p.nombre),
        c = cuenta[k] || 0,
        ds = dias[k] || [],
        cerca = ds.some((x) => Math.abs(ORDEN_SEMANA.indexOf(x) - ORDEN_SEMANA.indexOf(h.d)) === 1);
      if (ds.indexOf(h.d) >= 0) return; // nunca dos limpiezas el mismo día
      const s =
        c * 100 +
        (c ? (hist.repitio[k] || 0) * 30 : 0) +
        (cerca ? 15 : 0) +
        ((hist.ultimo[k] || []).indexOf(h.d + h.fr) >= 0 ? 10 : 0) +
        (hist.total[k] || 0) * 2 +
        azar(sem, k + h.d + h.fr);
      if (s < pm) {
        pm = s;
        mejor = p;
      }
    });
    if (!mejor) {
      faltan.push(h);
      return;
    }
    const k = nrmP(mejor.nombre);
    res[h.fr][h.d] = bonito(mejor.nombre);
    cuenta[k] = (cuenta[k] || 0) + 1;
    (dias[k] || (dias[k] = [])).push(h.d);
  });
  return { res: res, faltan: faltan, cuenta: cuenta, gente: gente };
}
function filaLimpieza(doc) {
  return doc.filas.find((x) => /limpi/.test(norm(x.tarea))) || doc.filas[0] || null;
}
/* ---- Pasos: elegir archivo → la IA lo lee → se reparte → se revisa → se aplica ---- */
async function abrirRepartir() {
  const s = semanaDe(tuSem),
    guardado = s.propia && s.doc.horario.length ? s.doc.horario : null;
  if (guardado && rep !== 'subir') {
    prepararReparto(guardado, null, 'el horario guardado de esta semana');
    return;
  }
  if (!sAPI) return toast('La IA no está disponible aquí.');
  const fs = await pedirArchivo('image/*,.pdf,.xlsx,.xls,.csv,.ods', true);
  if (!fs.length) return;
  capa(capaTop('Repartir la limpieza', 'Leyendo el horario…') + '<div class="visor"><p class="hint">Leyendo ' + esc(fs.map((f) => f.name).join(', ')) + '. Tarda unos segundos.</p></div>');
  try {
    const textos = [],
      imgs = [];
    for (const f of fs) {
      const d = await leerDocumento(f);
      d.textos.forEach((t) => textos.push(t.slice(0, 12000)));
      d.imagenes.forEach((i) => imgs.push(i));
    }
    const r = await sAPI.json(HORARIO_PROMPT + (textos.length ? '\nHORARIO (las columnas van separadas por ;):\n' + textos.join('\n').slice(0, 14000) : '\nLee la foto adjunta.'), { images: imgs.slice(0, 4), cache: false });
    const personas = (Array.isArray(r && r.personas) ? r.personas : [])
      .map((p) => {
        const dias = {},
          horas = {};
        Object.keys((p && p.dias) || {}).forEach((k) => {
          const d = DIA_NUM[norm(k)],
            v = String(p.dias[k] || '').toLowerCase();
          if (d != null && TURNO_D.indexOf(v) >= 0) dias[d] = v;
        });
        Object.keys((p && p.horas) || {}).forEach((k) => {
          const d = DIA_NUM[norm(k)];
          if (d != null && p.horas[k]) horas[d] = String(p.horas[k]).slice(0, 40);
        });
        return { nombre: String((p && p.nombre) || '').trim().slice(0, 60), dias: dias, horas: horas };
      })
      .filter((p) => p.nombre);
    let hecho = null;
    if (!personas.length && r && r.limpieza && typeof r.limpieza === 'object') {
      hecho = { am: {}, pm: {} };
      Object.keys(r.limpieza).forEach((k) => {
        const d = DIA_NUM[norm(k)],
          v = r.limpieza[k] || {};
        if (d == null) return;
        if (v.am) hecho.am[d] = bonito(String(v.am)).slice(0, 80);
        if (v.pm) hecho.pm[d] = bonito(String(v.pm)).slice(0, 80);
      });
    }
    if (!personas.length && !hecho) throw new Error('No encontré personas ni turnos en ese archivo. Prueba con una foto más nítida o con el Excel del horario.');
    prepararReparto(personas, hecho, fs.map((f) => f.name).join(', '));
  } catch (e) {
    const v = q($('capa'), '.visor');
    if (v) v.innerHTML = '<p class="aviso">' + esc(e && e.message && !e.code ? e.message : errIA(e)) + '</p><div class="acciones"><button class="btn" type="button" data-capa="cerrar">Cerrar</button></div>';
  }
}
function prepararReparto(personas, hecho, origen) {
  const d = semanaDe(tuSem).doc,
    f = d && filaLimpieza(d),
    tarea = f ? f.tarea : areaTu() === 'barra' ? 'LIMPIEZA DE BARRA' : 'LIMPIEZA CÁMARAS Y BODEGA';
  rep = { personas: personas, hecho: hecho, origen: origen, tarea: tarea, excluir: f ? f.excluir : '', sem: 1 };
  pintaReparto();
}
function pintaReparto() {
  const r = rep,
    hist = historiaLimpieza(tuSem, r.tarea),
    x = r.hecho ? { res: r.hecho, faltan: [], cuenta: {}, gente: [] } : repartir(r.personas, r.excluir, hist, r.sem);
  r.res = x.res;
  const cuenta = {};
  ['am', 'pm'].forEach((fr) => Object.keys(x.res[fr]).forEach((d) => (cuenta[x.res[fr][d]] = (cuenta[x.res[fr][d]] || 0) + 1)));
  const sin = x.gente.filter((p) => !cuenta[bonito(p.nombre)]).map((p) => bonito(p.nombre));
  capa(
    capaTop('Repartir la limpieza', 'Semana del ' + fRango(tuSem) + ' · ' + r.origen) +
      '<div class="col rep">' +
      '<div class="hoja-l"><div class="hoja-t"><b>' + esc(r.tarea) + '</b><span>Boom Boom Ciao · ' + (areaTu() === 'barra' ? 'Barra' : 'Cocina') + ' · Semana del ' + esc(fRango(tuSem)) + '</span></div>' +
      '<table class="tu-tabla"><thead><tr><th>DÍA</th><th>AM</th><th>PM</th></tr></thead><tbody>' +
      ORDEN_SEMANA.map((d) => '<tr><th scope="row">' + DIAS_LARGOS[d].charAt(0).toUpperCase() + DIAS_LARGOS[d].slice(1) + '</th><td>' + esc(x.res.am[d] || '—') + '</td><td>' + esc(x.res.pm[d] || '—') + '</td></tr>').join('') +
      '</tbody></table></div>' +
      (x.faltan.length ? '<p class="aviso">Sin nadie disponible: ' + esc(x.faltan.map((h) => DIAS_LARGOS[h.d] + ' ' + h.fr.toUpperCase()).join(', ')) + '. Complétalo a mano en el cuadro.</p>' : '') +
      (!r.hecho
        ? '<p class="hint">' +
          esc(Object.keys(cuenta).sort((a, z) => cuenta[z] - cuenta[a] || a.localeCompare(z, 'es')).map((n) => n + (cuenta[n] > 1 ? ' ×' + cuenta[n] : '')).join(' · ')) +
          (sin.length ? '<br>Esta semana no limpian: ' + esc(sin.join(', ')) : '') +
          '</p>' +
          '<div class="field"><label for="rep-ex">No limpian</label><input id="rep-ex" type="text" value="' + esc(r.excluir) + '" placeholder="Moha, …"></div>' +
          '<details><summary>Horario leído (' + r.personas.length + ' personas)</summary>' + tablaHorario(r.personas) + '</details>'
        : '<p class="hint">Es un cuadro de limpieza ya hecho: se copia tal cual.</p>') +
      '<div class="acciones"><button class="btn primary" type="button" data-capa="rep-ok">Aplicar al cuadro</button>' +
      (!r.hecho ? '<button class="btn" type="button" data-capa="rep-otra">Repartir de otra forma</button>' : '') +
      '<button class="btn" type="button" data-capa="cerrar">Cancelar</button></div></div>',
  );
}
function tablaHorario(l) {
  return (
    '<div class="tabla"><table class="nivel hor"><thead><tr><th>Persona</th>' + ORDEN_SEMANA.map((d) => '<th>' + DIAS_CORTOS[d] + '</th>').join('') + '</tr></thead><tbody>' +
    l
      .map(
        (p) =>
          '<tr><td>' + esc(bonito(p.nombre)) + '</td>' +
          ORDEN_SEMANA.map((d) => {
            const v = p.dias[d] || 'libre';
            return '<td class="t-' + v + '" title="' + esc((p.horas && p.horas[d]) || '') + '">' + TURNO_TXT[v] + '</td>';
          }).join('') +
          '</tr>',
      )
      .join('') +
    '</tbody></table></div>'
  );
}
function horarioHTML(doc) {
  if (!doc || !doc.horario.length) return '';
  return (
    '<section class="card"><details><summary>Horario de trabajo de la semana (' + doc.horario.length + ' personas)</summary>' + tablaHorario(doc.horario) +
    (puedeArea(areaTu()) ? '<div class="acciones"><button class="btn small" type="button" data-act="tu-repartir">Repartir otra vez con este horario</button><button class="btn small" type="button" data-act="tu-subir">Subir otro horario</button></div>' : '') +
    '</details></section>'
  );
}
function aplicarReparto() {
  const r = rep,
    d = semanaEditable(tuSem);
  let f = filaLimpieza(d);
  if (!f) {
    f = { id: idFila(), tarea: r.tarea, nota: 'Sube las fotos en APPCC › Limpieza.', horaAm: '10:00', horaPm: '17:00', excluir: '', am: {}, pm: {} };
    d.filas.unshift(f);
  }
  f.am = Object.assign({}, r.res.am);
  f.pm = Object.assign({}, r.res.pm);
  if (!r.hecho) {
    f.excluir = r.excluir;
    d.horario = nTurno({ id: d.id, horario: r.personas }).horario;
  }
  guardar('turnos', d, true);
  rep = null;
  cerrarCapa();
  vTurnos();
  toast('Cuadro de limpieza actualizado. Les llegará el aviso el día que les toque.');
}
$('capa').addEventListener('click', (e) => {
  const b = e.target.closest('[data-capa^="rep-"]');
  if (!b || !rep) return;
  if (b.dataset.capa === 'rep-ok') aplicarReparto();
  else {
    rep.sem++;
    pintaReparto();
  }
});
$('capa').addEventListener('change', (e) => {
  if (e.target.id === 'rep-ex' && rep) {
    rep.excluir = e.target.value.trim();
    pintaReparto();
  }
});
V.addEventListener('click', (e) => {
  if (!e.target.closest('[data-act="tu-subir"]') || pant !== 'turnos') return;
  if (!puedeArea(areaTu())) return;
  rep = 'subir';
  abrirRepartir().finally(() => {
    if (rep === 'subir') rep = null;
  });
});

/* ---- El cuadro en el formato de la casa: Excel e imagen para WhatsApp ---- */
const DIA_TXT = (d) => DIAS_LARGOS[d].charAt(0).toUpperCase() + DIAS_LARGOS[d].slice(1);
function excelLimpieza(f, lun) {
  const X = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]),
    H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',
    c = (ref, v, st) => '<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><t xml:space="preserve">' + X(v) + '</t></is></c>',
    filas = [
      '<row r="1" ht="36" customHeight="1">' + c('A1', String(f.tarea || 'LIMPIEZA').toUpperCase(), 1) + c('B1', '', 1) + c('C1', '', 1) + '</row>',
      '<row r="2" ht="22" customHeight="1">' + c('A2', 'Boom Boom Ciao · ' + (areaTu() === 'barra' ? 'Barra' : 'Cocina') + ' · Semana del ' + fRango(lun), 2) + c('B2', '', 2) + c('C2', '', 2) + '</row>',
      '<row r="3" ht="28" customHeight="1">' + c('A3', 'DÍA', 3) + c('B3', 'AM', 3) + c('C3', 'PM', 3) + '</row>',
    ];
  ORDEN_SEMANA.forEach((d, i) => {
    const r = i + 4,
      st = i % 2 ? 6 : 5;
    filas.push('<row r="' + r + '" ht="30" customHeight="1">' + c('A' + r, DIA_TXT(d), 4) + c('B' + r, f.am[d] || '', st) + c('C' + r, f.pm[d] || '', st) + '</row>');
  });
  const hoja =
    H +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><cols><col min="1" max="1" width="22" customWidth="1"/><col min="2" max="3" width="28" customWidth="1"/></cols><sheetData>' +
    filas.join('') +
    '</sheetData><mergeCells count="2"><mergeCell ref="A1:C1"/><mergeCell ref="A2:C2"/></mergeCells><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="portrait"/></worksheet>';
  const F = (b, sz, col) => '<font>' + (b ? '<b/>' : '') + '<sz val="' + sz + '"/><color rgb="' + col + '"/><name val="Calibri"/></font>',
    fill = (col) => '<fill><patternFill patternType="solid"><fgColor rgb="' + col + '"/><bgColor indexed="64"/></patternFill></fill>',
    xf = (fo, fi, bo) => '<xf numFmtId="0" fontId="' + fo + '" fillId="' + fi + '" borderId="' + bo + '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
    linea = '<left style="thin"><color rgb="FF969696"/></left><right style="thin"><color rgb="FF969696"/></right><top style="thin"><color rgb="FF969696"/></top><bottom style="thin"><color rgb="FF969696"/></bottom>';
  const estilos =
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5">' +
    F(0, 11, 'FF000000') + F(1, 18, 'FFFFFFFF') + F(0, 11, 'FFFFFFFF') + F(1, 13, 'FF000000') + F(0, 13, 'FF000000') +
    '</fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    fill('FF00B050') + fill('FFFFF200') + fill('FFE2EFDA') + fill('FFF5F5F5') +
    '</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>' + linea + '<diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    xf(1, 2, 0) + xf(2, 2, 0) + xf(3, 3, 1) + xf(3, 4, 1) + xf(4, 0, 1) + xf(4, 5, 1) +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  const blob = zip([
    ['[Content_Types].xml', H + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ['_rels/.rels', H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', H + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Limpieza" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', H + estilos],
    ['xl/worksheets/sheet1.xml', hoja],
  ]);
  entregar(blob, nombreCuadro(f, lun) + '.xlsx');
}
const nombreCuadro = (f, lun) => norm(f.tarea || 'limpieza').replace(/ /g, '-') + '_' + (areaTu() === 'barra' ? 'barra_' : '') + lun;
function imagenLimpieza(f, lun) {
  const W = 720,
    top = 90,
    rh = 52,
    cols = [0, 200, 460, 720],
    Hh = top + rh * 8 + 20,
    cv = document.createElement('canvas');
  cv.width = W * 2;
  cv.height = Hh * 2;
  const g = cv.getContext('2d');
  g.scale(2, 2);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, Hh);
  g.fillStyle = '#00B050';
  g.fillRect(0, 0, W, top - 10);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#fff';
  g.font = 'bold 26px Arial, sans-serif';
  g.fillText(String(f.tarea || 'LIMPIEZA').toUpperCase(), W / 2, 30, W - 30);
  g.font = '16px Arial, sans-serif';
  g.fillText('Boom Boom Ciao · ' + (areaTu() === 'barra' ? 'Barra' : 'Cocina') + ' · Semana del ' + fRango(lun), W / 2, 62, W - 30);
  const celda = (i, y, t, bg, font) => {
    g.fillStyle = bg;
    g.fillRect(cols[i], y, cols[i + 1] - cols[i], rh);
    g.strokeStyle = '#969696';
    g.strokeRect(cols[i] + 0.5, y + 0.5, cols[i + 1] - cols[i] - 1, rh - 1);
    g.fillStyle = '#000';
    g.font = font;
    g.fillText(t, (cols[i] + cols[i + 1]) / 2, y + rh / 2, cols[i + 1] - cols[i] - 12);
  };
  ['DÍA', 'AM', 'PM'].forEach((t, i) => celda(i, top, t, '#FFF200', 'bold 20px Arial, sans-serif'));
  ORDEN_SEMANA.forEach((d, r) => {
    const y = top + rh * (r + 1),
      bg = r % 2 ? '#F5F5F5' : '#FFFFFF';
    celda(0, y, DIA_TXT(d), '#E2EFDA', 'bold 20px Arial, sans-serif');
    celda(1, y, f.am[d] || '', bg, '20px Arial, sans-serif');
    celda(2, y, f.pm[d] || '', bg, '20px Arial, sans-serif');
  });
  cv.toBlob((b) => b && entregar(b, nombreCuadro(f, lun) + '.png'), 'image/png');
}
