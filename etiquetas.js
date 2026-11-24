/* ---- Etiquetas de producción (51 × 26 mm, impresora térmica en blanco y negro) ----
   Se sacan de cualquier plato o elaboración de la carta, o de una etiqueta guardada aquí mismo
   (para lo que aún no está en la app). Todo se puede retocar antes de imprimir.
   Imprimir: desde el móvil (AirPrint en iPhone, Brother Print Service en Android) o directo con
   un toque a través del «puente de impresión» del restaurante. */
const masDias = (f, d) => {
  const x = new Date(f + 'T12:00:00');
  x.setDate(x.getDate() + d);
  return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
};
const fCorta = (s) => {
  const d = new Date(s + 'T12:00:00');
  return isNaN(d) ? '' : pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
};
const fEt = (s) => {
  const d = new Date(s + 'T12:00:00');
  return isNaN(d) ? '' : pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2);
};
const CONSERVA = ['Refrigerado 0-4 °C', 'Congelado -18 °C', 'Descongelado 0-4 °C', 'Abierto 0-4 °C', 'Ambiente fresco y seco'];
const ET_W = 51,
  ET_H = 26; // milímetros del rollo
/* ---- Formatos: qué datos lleva la etiqueta y lo grande que sale el nombre ----
   Hay tres de serie y cada restaurante puede crear los suyos (se guardan en «etiquetas» con tipo 'formato'). */
const TODOS_CAMPOS = { elab: true, cad: true, alg: true, cons: true, nota: true, lote: true, resp: true };
const FMT_BASE = [
  { id: 'std', nombre: 'Etiqueta', campos: TODOS_CAMPOS, tit: 'l', centro: false, base: true },
  { id: 'nombre', nombre: 'Nombre', campos: {}, tit: 'xl', centro: true, base: true },
  { id: 'nomcad', nombre: 'Nombre y caducidad', campos: { cad: true }, tit: 'xl', centro: true, base: true },
  { id: 'compacta', nombre: 'Compacta', campos: TODOS_CAMPOS, tit: 'm', centro: false, base: true },
];
const CAMPO_TXT = { elab: 'Elaborado', cad: 'Caducidad', alg: 'Alérgenos', cons: 'Conservación', nota: 'Nota', lote: 'Lote', resp: 'Responsable' };
const TIT_TXT = { m: 'Normal', l: 'Grande', xl: 'Enorme' };
const formatosEt = () => FMT_BASE.concat(ordenados(S.etiquetas.filter((e) => e.tipo === 'formato')).map((e) => Object.assign({}, e, { id: 'e:' + e.id, doc: e })));
const fmtDe = (id) => formatosEt().find((f) => f.id === id) || FMT_BASE[0];
const fmtActual = () => fmtDe(et.fmt || mem('bbc.etFmt') || 'std');
/* Lo que se ve en la vista previa: el borrador del editor si está abierto */
const fmtVista = () => et.edFmt || fmtActual();

/* ---- Tamaño del nombre: el más grande que quepa (lo usan la vista previa, el PDF y la impresión) ---- */
let ctxEt = null;
const medidor = () => ctxEt || (ctxEt = document.createElement('canvas').getContext('2d'));
const MM = 0.3528; // 1 punto tipográfico en mm
function partir(g, t, w) {
  const out = [];
  let ln = '';
  String(t)
    .split(/\s+/)
    .filter(Boolean)
    .forEach((x) => {
      /* Una palabra que no cabe sola se corta por letras */
      while (g.measureText(x).width > w && x.length > 1) {
        let k = x.length - 1;
        while (k > 1 && g.measureText((ln ? ln + ' ' : '') + x.slice(0, k)).width > w) k--;
        if (ln && g.measureText(ln + ' ' + x.slice(0, k)).width > w) {
          out.push(ln);
          ln = '';
          continue;
        }
        out.push((ln ? ln + ' ' : '') + x.slice(0, k));
        ln = '';
        x = x.slice(k);
      }
      const p = ln ? ln + ' ' + x : x;
      if (g.measureText(p).width > w && ln) {
        out.push(ln);
        ln = x;
      } else ln = p;
    });
  if (ln) out.push(ln);
  return out;
}
function tituloEt(n, f, altoMm) {
  const g = medidor(),
    anchoPt = (ET_W - 3.2) / MM,
    tope = { m: 11, l: 15, xl: 60 }[f.tit] || 15,
    maxL = f.tit === 'xl' ? 3 : 2,
    palabras = String(n).split(/\s+/).filter(Boolean);
  for (let pt = tope; pt >= 7; pt -= pt > 20 ? 2 : 0.5) {
    g.font = '800 ' + pt + 'px Arial,Helvetica,sans-serif';
    /* Mejor más pequeña que cortar una palabra por la mitad */
    if (pt > 9 && palabras.some((x) => g.measureText(x).width > anchoPt)) continue;
    const l = partir(g, n, anchoPt);
    if (l.length <= maxL && l.length * pt * 1.08 * MM <= altoMm) return { pt: pt, lineas: l };
  }
  g.font = '800 7px Arial,Helvetica,sans-serif';
  const l = partir(g, n, anchoPt);
  if (l.length > maxL) {
    l.length = maxL;
    l[maxL - 1] = l[maxL - 1].replace(/\s*\S{0,3}$/, '') + '…';
  }
  return { pt: 7, lineas: l };
}
/* Qué bloques van debajo del nombre y cuánto alto ocupan (mm) */
function piezasEt(d, f) {
  const c = f.campos || {},
    alg = d.alg.length ? 'ALÉRGENOS: ' + algTxt(d.alg).toUpperCase() : 'SIN ALÉRGENOS',
    izq = [c.cons ? d.conserva : '', c.nota ? d.nota : ''].filter(Boolean).join(' · '),
    der = [c.lote ? d.lote : '', c.resp && d.resp ? d.resp.toUpperCase().slice(0, 14) : ''].filter(Boolean).join(' · ');
  const r = { fila: c.elab || c.cad, alg: c.alg ? alg : '', algL: 0, izq: izq, der: der, pie: !!(izq || der), alto: 0 };
  if (r.alg) {
    const g = medidor();
    g.font = '700 6.5px Arial,Helvetica,sans-serif';
    r.algL = Math.min(2, partir(g, r.alg, (ET_W - 3.2) / MM).length);
  }
  r.alto = (r.fila ? 4.9 : 0) + r.algL * 2.5 + (r.pie ? 2.9 : 0);
  return r;
}
const ALTO_LIBRE = ET_H - 1.2 - 1.0; // alto útil del rollo menos márgenes

/* ---- De dónde sale cada etiqueta: un plato/elaboración de la carta o una etiqueta guardada ---- */
function origenDe(ref) {
  if (!ref || ref === 'nueva') return null;
  if (ref.indexOf('e:') === 0) {
    const x = S.etiquetas.find((e) => e.id === ref.slice(2) && !e.tipo);
    return x ? { tipo: 'e', x: x } : null;
  }
  if (ref.indexOf('pr:') === 0) {
    const x = prod(ref.slice(3));
    return x ? { tipo: 'r', x: x } : null;
  }
  const p = plato(ref);
  return p ? { tipo: 'p', x: p } : null;
}
const origenEt = () => origenDe(et.id);
function datosDe(ref, ed, copias) {
  const o = origenDe(ref);
  if (!o && ref !== 'nueva') return null;
  ed = ed || {};
  const b = !o
    ? { nombre: '', dias: 3, alg: [], conserva: CONSERVA[0], nota: '' }
    : o.tipo === 'e'
      ? { nombre: o.x.nombre, dias: o.x.dias, alg: o.x.alergenos.slice(), conserva: o.x.conserva || CONSERVA[0], nota: o.x.nota }
      : o.tipo === 'r'
        ? { nombre: o.x.nombre, dias: 3, alg: (o.x.alergenos || []).slice(), conserva: CONSERVA[0], nota: '' }
        : { nombre: o.x.nombre, dias: o.x.caducidad > 0 ? o.x.caducidad : 3, alg: algDe(o.x), conserva: CONSERVA[0], nota: '' };
  const d = Object.assign(b, ed),
    dias = Math.max(0, Math.round(Number(d.dias) || 0));
  return {
    p: o && o.tipo === 'p' ? o.x : null,
    e: o && o.tipo === 'e' ? o.x : null,
    nombre: String(d.nombre || ''),
    elab: et.fecha,
    dias: dias,
    cad: masDias(et.fecha, dias),
    alg: d.alg,
    conserva: d.conserva,
    nota: d.nota,
    resp: et.resp,
    lote: 'L' + et.fecha.slice(2).replace(/-/g, ''),
    copias: Math.min(50, Math.max(1, Math.round(copias || 1))),
  };
}
function datosEt() {
  if (!et.id || (et.id !== 'nueva' && !origenEt())) return null;
  et.ed = et.ed || {};
  const d = datosDe(et.id, et.ed, et.copias);
  d.f = fmtVista();
  return d;
}
/* La etiqueta en HTML, al tamaño exacto del rollo: solo negro sobre blanco */
function etiquetaHTML(d, f) {
  f = f || d.f || fmtActual();
  const n = d.nombre || 'Sin nombre',
    pz = piezasEt(d, f),
    soloNombre = !pz.alto,
    t = tituloEt(n, f, ALTO_LIBRE - pz.alto - (pz.alto ? 0.6 : 0)),
    c = f.campos || {};
  return (
    '<div class="et51' + (soloNombre ? ' solo' : '') + (f.centro ? ' centro' : '') + '">' +
    '<div class="e-n" style="font-size:' + t.pt + 'pt">' + t.lineas.map((l) => '<span>' + esc(l) + '</span>').join('') + '</div>' +
    (pz.fila
      ? '<div class="e-f' + (c.elab ? '' : ' sin-elab') + '">' + (c.elab ? '<span>ELAB <b>' + fEt(d.elab) + '</b></span>' : '') + (c.cad ? '<span class="e-cad">CAD ' + fEt(d.cad) + '</span>' : '') + '</div>'
      : '') +
    (pz.alg ? '<div class="e-a">' + esc(pz.alg) + '</div>' : '') +
    (pz.pie ? '<div class="e-p"><span>' + esc(pz.izq) + '</span><span>' + esc(pz.der) + '</span></div>' : '') +
    '</div>'
  );
}
function pintarEt() {
  const d = datosEt(),
    o = $('et-prev');
  if (!o) return;
  o.innerHTML = d
    ? '<div class="et-zoom">' + etiquetaHTML(d) + '</div><p class="hint">Tamaño real: ' + ET_W + ' × ' + ET_H + ' mm (aquí al doble) · formato «' + esc(d.f.nombre || 'Sin nombre') + '». Caduca el ' + esc(fCorta(d.cad)) + ' (' + d.dias + (d.dias === 1 ? ' día' : ' días') + ').</p>'
    : '';
  document.querySelectorAll('[data-act="et-imp"]').forEach((b) => {
    b.textContent = d && d.copias > 1 ? 'Imprimir ' + d.copias + ' etiquetas' : 'Imprimir';
  });
}
const modoImp = () => (mem('bbc.impMod') === 'directo' ? 'directo' : 'movil');
function opcionesEt(sel) {
  const guard = ordenados(S.etiquetas.filter((e) => !e.tipo && enArea(e)));
  return (
    '<option value="nueva"' + (sel === 'nueva' ? ' selected' : '') + '>＋ Etiqueta nueva</option>' +
    (sel && sel.indexOf('pr:') === 0 && prod(sel.slice(3)) ? '<optgroup label="Producto"><option value="' + esc(sel) + '" selected>' + esc(prod(sel.slice(3)).nombre) + '</option></optgroup>' : '') +
    (guard.length
      ? '<optgroup label="Etiquetas guardadas">' + guard.map((e) => '<option value="e:' + esc(e.id) + '"' + ('e:' + e.id === sel ? ' selected' : '') + '>' + esc(e.nombre) + '</option>').join('') + '</optgroup>'
      : '') +
    opcionesPlatos(sel)
  );
}

/* ---- Al escribir el nombre: sugerencias de platos, elaboraciones, productos y etiquetas guardadas ---- */
function sugerenciasEt(q) {
  q = norm(q || '').trim();
  if (!q) return [];
  const todo = []
    .concat(S.etiquetas.filter((e) => !e.tipo && enArea(e)).map((e) => ({ ref: 'e:' + e.id, n: e.nombre, t: 'Etiqueta guardada' })))
    .concat(S.platos.filter((p) => enArea(p)).map((p) => ({ ref: p.id, n: p.nombre, t: p.base ? 'Elaboración' : 'Plato' })))
    .concat(S.productos.filter((p) => enArea(p)).map((p) => ({ ref: 'pr:' + p.id, n: p.nombre, t: 'Producto' })));
  const empieza = [],
    palabra = [],
    contiene = [];
  todo.forEach((x) => {
    const n = norm(x.n);
    if (n.indexOf(q) === 0) empieza.push(x);
    else if (n.indexOf(' ' + q) >= 0) palabra.push(x);
    else if (q.length > 2 && n.indexOf(q) > 0) contiene.push(x);
  });
  const orden = (l) => l.sort((a, z) => a.n.localeCompare(z.n, 'es'));
  return orden(empieza).concat(orden(palabra), orden(contiene)).slice(0, 8);
}
function pintarSug(q) {
  const o = $('et-sug');
  if (!o) return;
  const l = sugerenciasEt(q),
    o2 = origenEt();
  if (!l.length || (l.length === 1 && o2 && l[0].ref === et.id && norm(l[0].n) === norm(q))) {
    o.hidden = true;
    o.innerHTML = '';
    return;
  }
  o.innerHTML = l.map((x) => '<button type="button" role="option" data-act="et-sug" data-ref="' + esc(x.ref) + '"><b>' + esc(x.n) + '</b><small>' + x.t + '</small></button>').join('');
  o.hidden = false;
}

/* ---- Tanda: varias etiquetas distintas, cada una con sus copias, que salen de una vez ----
   Se guarda en este móvil (si cierras la app sigue ahí). Puede venir de una lista por estación. */
function tandaEt() {
  if (!et.tanda) {
    let t = null;
    try {
      t = JSON.parse(mem('bbc.tanda') || 'null');
    } catch (e) {}
    et.tanda = t && Array.isArray(t.items) ? t : { lista: '', items: [] };
  }
  return et.tanda;
}
const guardaTanda = () => mem('bbc.tanda', JSON.stringify(tandaEt()));
const listasEt = () => ordenados(S.etiquetas.filter((e) => e.tipo === 'lista' && enArea(e)));
const listaDe = (id) => S.etiquetas.find((e) => e.tipo === 'lista' && e.id === id);
const totalTanda = () => tandaEt().items.reduce((a, i) => a + (datosDe(i.ref, i.ed, 1) ? i.n : 0), 0);
function aTanda(ref, ed, n, f) {
  const t = tandaEt(),
    nom = (ed && ed.nombre) || '',
    i = t.items.find((x) => x.ref === ref && ((x.ed && x.ed.nombre) || '') === nom && x.f === f);
  if (i) i.n = Math.min(50, i.n + n);
  else t.items.push({ ref: ref, ed: ed || {}, n: Math.min(50, n), f: f });
  guardaTanda();
}
function cargarLista(l) {
  et.tanda = {
    lista: l.id,
    items: l.items.map((i) => ({ ref: i.ref, ed: Object.assign(i.nombre ? { nombre: i.nombre } : {}, i.ed || {}), n: i.n, f: i.f || l.formato || 'std' })),
  };
  guardaTanda();
}
/* Lo que hay que imprimir de la tanda: una entrada por etiqueta distinta, con sus copias */
function piezasTanda() {
  return tandaEt()
    .items.filter((i) => i.n > 0)
    .map((i) => {
      const d = datosDe(i.ref, i.ed, i.n);
      if (!d || !d.nombre.trim()) return null;
      d.f = fmtDe(i.f);
      return d;
    })
    .filter(Boolean);
}
function opcionesFmt(sel) {
  return formatosEt()
    .map((f) => '<option value="' + esc(f.id) + '"' + (f.id === sel ? ' selected' : '') + '>' + esc(f.nombre) + '</option>')
    .join('');
}
function tandaHTML() {
  const t = tandaEt(),
    ls = listasEt(),
    lista = t.lista ? listaDe(t.lista) : null,
    puedo = puede(1),
    total = totalTanda();
  const fila = (i, k) => {
    const d = datosDe(i.ref, i.ed, 1),
      nom = d ? d.nombre || 'Sin nombre' : (i.ed && i.ed.nombre) || 'Etiqueta borrada';
    return (
      '<li class="tn-fila' + (i.n ? '' : ' cero') + (d ? '' : ' rota') + '">' +
      '<span class="tn-nom"><b>' + esc(nom) + '</b>' + (i.n ? '' : '<small>no se imprime</small>') + (d ? '' : '<small>ya no existe</small>') + '</span>' +
      '<select class="tn-fmt" data-tn-fmt="' + k + '" aria-label="Formato de ' + esc(nom) + '">' + opcionesFmt(i.f) + '</select>' +
      '<span class="tn-cant"><button type="button" class="tn-b" data-act="et-tn-menos" data-k="' + k + '" aria-label="Una menos">−</button>' +
      '<input class="num tn-n" data-tn-n="' + k + '" type="text" inputmode="numeric" value="' + i.n + '" aria-label="Copias de ' + esc(nom) + '">' +
      '<button type="button" class="tn-b" data-act="et-tn-mas" data-k="' + k + '" aria-label="Una más">＋</button></span>' +
      '<button type="button" class="link tn-x" data-act="et-tn-quitar" data-k="' + k + '" aria-label="Quitar ' + esc(nom) + '">✕</button></li>'
    );
  };
  return (
    '<section class="card et-tanda" id="et-tanda"><div class="tn-cab"><h3>Tanda de etiquetas</h3><span class="hint">Varias etiquetas distintas de una vez, cada una con sus copias.</span></div>' +
    '<div class="tn-listas"><span class="lbl">Listas por estación</span><div class="gruposc">' +
    (ls.length
      ? ls.map((l) => '<button type="button" class="chipg" data-act="et-lista" data-id="' + esc(l.id) + '" aria-pressed="' + (t.lista === l.id) + '">' + esc(l.nombre) + '<small>' + l.items.reduce((a, i) => a + i.n, 0) + '</small></button>').join('')
      : '<span class="hint">Aún no hay listas. Llena la tanda con lo que va en una nevera o una estación y guárdala como lista.</span>') +
    '</div></div>' +
    (t.items.length
      ? (lista ? '<p class="hint tn-de">Lista «' + esc(lista.nombre) + '»: cambia las cantidades de hoy (0 = no se imprime). Si no guardas, la lista no cambia.</p>' : '') +
        '<ul class="tn-items">' + t.items.map(fila).join('') + '</ul>' +
        '<div class="acciones tn-acc"><button class="btn primary et-big" type="button" data-act="et-tn-imp"' + (total ? '' : ' disabled') + '>' + (total === 1 ? 'Imprimir 1 etiqueta' : 'Imprimir ' + total + ' etiquetas') + '</button>' +
        (puedo && lista ? '<button class="btn" type="button" data-act="et-tn-guardar">Guardar cambios en «' + esc(lista.nombre) + '»</button>' : '') +
        (puedo ? '<button class="btn" type="button" data-act="et-tn-nueva">Guardar como lista nueva</button>' : '') +
        '<button class="link" type="button" data-act="et-tn-vaciar">Vaciar la tanda</button>' +
        (puedo && lista ? '<button class="link" type="button" data-act="et-tn-borrar" style="color:var(--crit)">Borrar la lista</button>' : '') +
        '</div>' +
        (et.nuevaLista
          ? '<form id="form-lista" class="tn-nueva" novalidate><div class="field"><label for="tn-nombre">Nombre de la lista</label><input id="tn-nombre" type="text" maxlength="40" autocomplete="off" placeholder="Área de pastas, nevera pizza…"></div><button class="btn primary" type="submit">Guardar lista</button><button class="link" type="button" data-act="et-tn-cancelar">Cancelar</button></form>'
          : '')
      : '<p class="hint tn-vacia">La tanda está vacía. Elige una lista o, abajo, prepara una etiqueta y toca «＋ Añadir a la tanda».</p>') +
    '<p class="hint" id="tn-msg" aria-live="polite"></p></section>'
  );
}
function pintarTanda() {
  const o = $('et-tanda');
  if (o) o.outerHTML = tandaHTML();
}

/* ---- Formatos: elegir y crear ---- */
function formatoHTML() {
  const act = fmtActual(),
    ed = et.edFmt,
    puedo = puede(1);
  if (ed) {
    const c = ed.campos || {};
    return (
      '<section class="card et-fmt" id="et-fmt"><h3>' + (ed.doc ? 'Editar formato' : 'Crear nueva etiqueta') + '</h3>' +
      '<p class="hint">Elige qué sale en la etiqueta y lo grande del nombre. La vista previa cambia al momento.</p>' +
      '<div class="field"><label for="fm-nombre">Nombre del formato</label><input id="fm-nombre" type="text" maxlength="40" autocomplete="off" value="' + esc(ed.nombre) + '" placeholder="Solo nombre grande"></div>' +
      '<span class="lbl">Qué lleva además del nombre</span><div class="togs">' +
      Object.keys(CAMPO_TXT).map((k) => '<button type="button" class="tog' + (c[k] ? ' on' : '') + '" data-act="et-fm-campo" data-k="' + k + '" aria-pressed="' + !!c[k] + '">' + CAMPO_TXT[k] + '</button>').join('') +
      '</div><span class="lbl">Tamaño del nombre</span><div class="seg" role="radiogroup" aria-label="Tamaño del nombre">' +
      Object.keys(TIT_TXT).map((k) => '<button type="button" data-act="et-fm-tit" data-k="' + k + '" aria-pressed="' + (ed.tit === k) + '">' + TIT_TXT[k] + '</button>').join('') +
      '</div><label class="chk"><input type="checkbox" id="fm-centro"' + (ed.centro ? ' checked' : '') + '> Nombre centrado</label>' +
      '<div class="acciones"><button class="btn primary" type="button" data-act="et-fm-guardar">Guardar formato</button><button class="link" type="button" data-act="et-fm-cancelar">Cancelar</button>' +
      (ed.doc ? '<button class="link" type="button" data-act="et-fm-borrar" style="color:var(--crit)">Borrar formato</button>' : '') +
      '</div><p class="hint" id="fm-msg" aria-live="polite"></p></section>'
    );
  }
  return (
    '<section class="card et-fmt" id="et-fmt"><h3>Formato</h3><div class="gruposc">' +
    formatosEt().map((f) => '<button type="button" class="chipg" data-act="et-fmt" data-id="' + esc(f.id) + '" aria-pressed="' + (f.id === act.id) + '">' + esc(f.nombre) + '</button>').join('') +
    '</div>' +
    (puedo
      ? '<div class="acciones"><button class="btn" type="button" data-act="et-fm-nuevo">＋ Crear nueva etiqueta</button>' +
        '<button class="link" type="button" data-act="et-fm-editar">' + (act.base ? 'Copiar «' + esc(act.nombre) + '» y cambiarla' : 'Editar «' + esc(act.nombre) + '»') + '</button></div>'
      : '') +
    '</section>'
  );
}
function pintarFmt() {
  const o = $('et-fmt');
  if (o) o.outerHTML = formatoHTML();
  pintarEt();
}

function vEtiquetas() {
  if (!et.id || (et.id !== 'nueva' && !origenEt())) {
    const b = ordenados(S.platos.filter((p) => p.base))[0] || ordenados(S.platos)[0];
    et.id = b ? b.id : 'nueva';
    et.ed = {};
  }
  const d = datosEt(),
    o = origenEt(),
    puedo = puede(1),
    algSel = d.alg;
  $('vista').innerHTML =
    '<div class="bar et-bar"><div class="field"><label for="et-plato">Etiqueta de</label><select id="et-plato">' +
    opcionesEt(et.id) +
    '</select></div>' +
    '<button class="btn primary et-imp-top" type="button" data-act="et-imp">Imprimir</button>' +
    expHTML() +
    '</div>' +
    tandaHTML() +
    '<div class="dos et-dos"><section class="card"><form id="form-et" class="ficha" novalidate>' +
    '<div class="field wide"><label for="et-n">Nombre en la etiqueta</label><input id="et-n" data-et="nombre" type="text" maxlength="60" autocomplete="off" value="' + esc(d.nombre) + '" placeholder="Escribe: A, Abanico…" aria-autocomplete="list" aria-controls="et-sug"><div class="et-sug" id="et-sug" role="listbox" hidden></div></div>' +
    '<div class="field"><label for="et-fecha">Elaborado el</label><input id="et-fecha" type="date" value="' + esc(et.fecha) + '"></div>' +
    '<div class="field"><label for="et-dias">Días de vida</label><input class="num" id="et-dias" data-et="dias" type="text" inputmode="numeric" value="' + d.dias + '"></div>' +
    '<div class="field"><label for="et-cons">Conservación</label><input id="et-cons" data-et="conserva" type="text" list="dl-conserva" maxlength="30" value="' + esc(d.conserva) + '"></div>' +
    '<div class="field"><label for="et-resp">Responsable</label><input id="et-resp" type="text" autocomplete="off" maxlength="30" value="' + esc(et.resp) + '"></div>' +
    '<div class="field"><label for="et-nota">Nota corta</label><input id="et-nota" data-et="nota" type="text" maxlength="24" value="' + esc(d.nota) + '" placeholder="Sin sal, vegano…"></div>' +
    '<div class="field"><label for="et-cop">Copias</label><input class="num" id="et-cop" type="text" inputmode="numeric" value="' + d.copias + '"></div>' +
    '<div class="full col" style="gap:6px"><span class="lbl">Alérgenos' + (o && o.tipo === 'p' ? ' (salen de la ficha; puedes cambiarlos para esta etiqueta)' : '') + '</span><div class="togs">' +
    algBtns(algSel, 'et-alg') +
    '</div></div>' +
    '<datalist id="dl-conserva">' + CONSERVA.map((c) => '<option value="' + esc(c) + '"></option>').join('') + '</datalist>' +
    '<div class="acciones full"><button class="btn primary et-big" type="button" id="et-imp" data-act="et-imp">Imprimir</button>' +
    '<button class="btn" type="button" data-act="et-tn-add">＋ Añadir a la tanda</button>' +
    '<button class="btn" type="button" data-act="et-pdf">PDF de la etiqueta</button>' +
    (puedo ? '<button class="btn" type="button" data-act="et-guardar">' + (o && o.tipo === 'e' ? 'Guardar cambios' : 'Guardar como etiqueta') + '</button>' : '') +
    (o && o.tipo === 'e' && puedo ? '<button class="link" type="button" data-act="et-borrar" style="color:var(--crit)">Borrar</button>' : '') +
    (Object.keys(et.ed || {}).length && o ? '<button class="link" type="button" data-act="et-deshacer">Volver a los datos de la ficha</button>' : '') +
    '</div><p class="hint full" id="et-msg" aria-live="polite"></p></form></section>' +
    '<div class="col"><section class="card" id="et-prev"></section>' +
    formatoHTML() +
    impresoraHTML() +
    '</div></div>';
  pintarEt();
}
/* Cómo se imprime en este dispositivo */
function impresoraHTML() {
  const m = modoImp();
  return (
    '<details class="card et-impr"' + (mem('bbc.impVisto') ? '' : ' open') + '><summary><b>Impresora</b> <span class="hint">· ' + (m === 'directo' ? 'directo con un toque' : 'desde este móvil') + '</span></summary>' +
    '<div class="seg" role="radiogroup" aria-label="Cómo imprimir"><button type="button" data-act="et-modo" data-m="movil" aria-pressed="' + (m === 'movil') + '">Desde el móvil</button><button type="button" data-act="et-modo" data-m="directo" aria-pressed="' + (m === 'directo') + '">Directo (un toque)</button></div>' +
    (m === 'movil'
      ? (esIOS()
          ? '<ol class="et-pasos"><li>Toca <b>Imprimir</b>: se abre el menú Compartir con la etiqueta en PDF. Elige <b>Imprimir</b>.</li><li>En <b>Impresora</b>, elige la <b>TD-4455DNWB</b> (móvil e impresora en el mismo Wi-Fi). Sin impresora elegida, el iPhone solo ofrece A4.</li><li>En <b>Tamaño del papel</b>, elige el de <b>51 × 26 mm</b> y escala 100 %. El iPhone lo recuerda para la próxima vez.</li><li>Si el tamaño 51 × 26 no aparece, hay que darlo de alta en la impresora (lo explica el aviso de abajo).</li></ol>'
          : '<p class="hint"><b>Android:</b> para imprimir en cualquier impresora, Android pide un «servicio de impresión». Es cosa del sistema, no de esta app (al iPhone ya le viene puesto). <b>Para no instalar nada en ningún móvil, usa «Directo (un toque)»</b> con el puente de impresión.</p>' +
            '<ol class="et-pasos"><li>Prueba primero el servicio que ya trae el móvil: Ajustes › Conexiones › Más ajustes › Impresión (Mopria o «Servicio de impresión predeterminado»). Si ahí no aparece la Brother, instala una sola vez «Brother Print Service Plugin» de Google Play y actívalo.</li><li>Al tocar Imprimir, elige la <b>TD-4455DNWB</b>, tamaño <b>51 × 26 mm</b>, escala 100 % y sin márgenes. El móvil lo recuerda para la próxima vez.</li></ol>') +
        '<p class="hint">¿No aparece el tamaño 51 × 26 mm? Desde un PC en el mismo Wi-Fi, abre en el navegador la dirección IP de la impresora (sale en su pantalla: Menú › WLAN › Estado) y da de alta el papel de 51 × 26 mm, o hazlo con la «Printer Setting Tool» de Brother › Configuración del tamaño del papel.</p>'
      : '<p class="hint">La etiqueta se manda a la cola del restaurante y la imprime el <b>puente de impresión</b> (un ordenador pequeño, un PC o un móvil Android viejo enchufado junto a la impresora). Sale en 1-2 segundos, sin menús, desde cualquier móvil, incluso fuera del Wi-Fi.</p><p class="hint" id="et-puente">Si no sale nada, comprueba que el puente está encendido.</p>' + (puede(2) && typeof rid === 'string' && rid ? '<p class="hint">Para configurar el puente, ID del restaurante: <code>' + esc(rid) + '</code></p>' : '')) +
    '</details>'
  );
}
/* Una entrada por etiqueta distinta (con sus copias) → una hoja por copia */
const totalCopias = (ds) => ds.reduce((a, d) => a + d.copias, 0);
/* Imprime desde el móvil: una hoja por etiqueta, al tamaño del rollo */
function imprimirMovil(ds) {
  ds = Array.isArray(ds) ? ds : [ds];
  let z = $('zona-imp');
  if (!z) {
    z = document.createElement('div');
    z.id = 'zona-imp';
    document.body.appendChild(z);
  }
  z.innerHTML = ds.map((d) => { const h = etiquetaHTML(d); return Array.from({ length: d.copias }, () => h).join(''); }).join('');
  let st = $('et-page');
  if (!st) {
    st = document.createElement('style');
    st.id = 'et-page';
    document.head.appendChild(st);
  }
  st.textContent = '@page{size:' + ET_W + 'mm ' + ET_H + 'mm;margin:0}';
  document.body.classList.add('imp-et');
  /* En Android e iPhone el aviso de «impresión terminada» llega antes de que el móvil prepare
     la hoja: si se limpiaba ahí, se imprimía la app entera. Ahora la etiqueta se queda preparada
     hasta que vuelves a tocar la app. */
  const t0 = Date.now(),
    fin = (e) => {
      if (e && Date.now() - t0 < 1500) return;
      document.body.classList.remove('imp-et');
      if (st.isConnected) st.remove();
      z.innerHTML = '';
      document.removeEventListener('pointerdown', fin, true);
      document.removeEventListener('keydown', fin, true);
    };
  setTimeout(() => {
    document.addEventListener('pointerdown', fin, true);
    document.addEventListener('keydown', fin, true);
    try {
      window.print();
    } catch (e) {
      fin();
      toast('Este navegador no deja imprimir. Usa «PDF de la etiqueta».');
    }
  }, 80);
}
/* PDF del tamaño exacto del rollo (51 × 26 mm), una página por copia: para imprimir desde
   cualquier app del móvil (Compartir › Imprimir, Brother iPrint&Label…) o guardarlo */
async function pdfEtiqueta(ds, titulo) {
  ds = Array.isArray(ds) ? ds : [ds];
  const cvs = [];
  ds.forEach((d) => {
    const cv = lienzoEt(d),
      j = jpgDe(cv);
    j.mm = cv.mm;
    for (let k = 0; k < d.copias; k++) cvs.push(j);
  });
  titulo = titulo || (ds.length === 1 ? ds[0].nombre : 'tanda de etiquetas');
  const blob = pdfDe(cvs),
    nombre = 'etiqueta-' + (norm(titulo).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'etiqueta') + '.pdf';
  const f = new File([blob], nombre, { type: 'application/pdf' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f], title: titulo });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const u = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = u;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}
/* Para el puente: los datos ya escritos y el formato (qué campos y lo grande del nombre) */
function datosPuente(d) {
  const f = d.f || fmtActual(),
    c = f.campos || {};
  return {
    nombre: d.nombre || 'Sin nombre',
    elab: c.elab ? fEt(d.elab) : '',
    cad: c.cad ? fEt(d.cad) : '',
    alergenos: c.alg ? (d.alg.length ? 'ALÉRGENOS: ' + algTxt(d.alg).toUpperCase() : 'SIN ALÉRGENOS') : '',
    conserva: c.cons ? d.conserva : '',
    nota: c.nota ? d.nota : '',
    lote: c.lote ? d.lote : '',
    resp: c.resp ? (d.resp || '').toUpperCase().slice(0, 14) : '',
    copias: d.copias,
    formato: { tit: f.tit, centro: !!f.centro, campos: Object.assign({}, c) },
  };
}
/* Imprime directo: deja los trabajos en la cola y el puente los manda a la impresora */
async function imprimirDirecto(ds) {
  ds = Array.isArray(ds) ? ds : [ds];
  if (!enNube()) return toast('El modo directo necesita la versión con usuarios (conectada a internet).');
  const filas = ds.map((d) => ({ restaurante_id: rid, datos: datosPuente(d), creado_por: miId })),
    total = totalCopias(ds);
  const r = await sb.from('impresiones').insert(filas);
  if (r.error) {
    toast(/relation|does not exist|schema cache/i.test(r.error.message || '') ? 'Falta ejecutar el script 8 en la base de datos.' : errTxt(r.error));
    return;
  }
  toast(total > 1 ? 'Enviadas ' + total + ' etiquetas a la impresora…' : 'Enviada a la impresora…');
  const mira = async (intento) => {
    const q = await sb.from('impresiones').select('id,estado,error').eq('creado_por', miId).order('id', { ascending: false }).limit(filas.length);
    const l = q.data || [],
      mal = l.find((x) => x.estado === 'error');
    if (mal) toast('La impresora dio un error: ' + (mal.error || 'revisa el papel y la tapa') + '.');
    else if (l.length && l.every((x) => x.estado === 'impresa')) toast('✓ ' + (total > 1 ? total + ' etiquetas impresas.' : 'Etiqueta impresa.'));
    else if (intento < 2 + Math.ceil(total / 20)) setTimeout(() => mira(intento + 1), 4000);
    else toast('Las etiquetas esperan en la cola: el puente de impresión no responde o va despacio. ¿Está encendido?');
  };
  setTimeout(() => mira(0), 2500);
}
/* Imprime una lista de etiquetas por la vía que toque en este dispositivo */
function imprimirVarias(ds, titulo) {
  if (!ds.length) return toast('No hay nada que imprimir: todas las cantidades están a 0.');
  const total = totalCopias(ds);
  if (total > 300) return toast('Son ' + total + ' etiquetas: como mucho 300 de una vez. Divide la tanda.');
  mem('bbc.impVisto', '1');
  if (modoImp() === 'directo') imprimirDirecto(ds);
  /* iPhone y iPad no respetan el tamaño de página de una web al imprimir (sacan A4 con cabecera y pie):
     ahí se imprime el PDF de 51 × 26 mm desde el menú Compartir › Imprimir, que sí sale a su tamaño */
  else if (esIOS()) pdfEtiqueta(ds, titulo);
  else imprimirMovil(ds);
}
function imprimirEt() {
  const d = datosEt();
  if (!d) return;
  if (!d.nombre.trim()) {
    toast('Escribe el nombre de la etiqueta.');
    if ($('et-n')) $('et-n').focus();
    return;
  }
  imprimirVarias([d]);
}
function imprimirTanda() {
  const t = tandaEt(),
    l = t.lista ? listaDe(t.lista) : null;
  imprimirVarias(piezasTanda(), l ? l.nombre : 'tanda de etiquetas');
}
/* Para exportar en PNG/PDF: la misma etiqueta dibujada a 16 puntos por mm (el doble de la impresora) */
function lienzoEt(d, f) {
  f = f || d.f || fmtActual();
  const K = 16,
    W = ET_W * K,
    H = ET_H * K,
    cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  cv.mm = [ET_W, ET_H];
  const g = cv.getContext('2d'),
    M = 1.6 * K,
    c = f.campos || {};
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#000';
  g.textBaseline = 'top';
  const px = (pt) => pt * MM * K,
    F = (pt, w) => (w || 700) + ' ' + px(pt) + 'px Arial,Helvetica,sans-serif';
  const pz = piezasEt(d, f),
    soloNombre = !pz.alto,
    libre = ALTO_LIBRE - pz.alto - (pz.alto ? 0.6 : 0),
    t = tituloEt(d.nombre || 'Sin nombre', f, libre);
  /* Nombre: arriba, o centrado en su hueco si el formato lo pide o si va solo */
  g.font = F(t.pt, 800);
  const lh = px(t.pt) * 1.08,
    hT = t.lineas.length * lh;
  let y = 1.2 * K + (f.centro || soloNombre ? Math.max(0, (libre * K - hT) / 2) : 0);
  t.lineas.forEach((l) => {
    const w = g.measureText(l).width;
    g.fillText(l, f.centro ? (W - w) / 2 : M, y + px(t.pt) * 0.04);
    y += lh;
  });
  /* Lo de abajo se coloca desde el pie hacia arriba */
  let yb = H - 1.0 * K - pz.alto * K;
  if (pz.fila) {
    if (c.elab) {
      g.font = F(7, 400);
      g.fillText('ELAB', M, yb + 0.9 * K);
      const xE = M + g.measureText('ELAB ').width;
      g.font = F(8.5, 700);
      g.fillText(fEt(d.elab), xE, yb + 0.6 * K);
    }
    if (c.cad) {
      const tc = 'CAD ' + fEt(d.cad);
      g.font = F(9, 800);
      const wc = g.measureText(tc).width,
        bw = wc + 2 * K,
        xc = !c.elab && f.centro ? (W - bw) / 2 : W - M - bw;
      g.lineWidth = 0.5 * K;
      g.strokeRect(xc, yb + 0.1 * K, bw, 4.4 * K);
      g.fillText(tc, xc + K, yb + 0.6 * K);
    }
    yb += 4.9 * K;
  }
  if (pz.alg) {
    g.font = F(6.5, 700);
    const l = partir(g, pz.alg, W - 2 * M);
    if (l.length > 2) {
      l.length = 2;
      l[1] = l[1].replace(/\s*\S*$/, '') + '…';
    }
    l.forEach((x) => {
      g.fillText(x, M, yb + 0.2 * K);
      yb += 2.5 * K;
    });
  }
  if (pz.pie) {
    g.font = F(6, 400);
    const wd = pz.der ? g.measureText(pz.der).width : 0;
    let iz = pz.izq;
    while (iz && g.measureText(iz).width > W - 2 * M - wd - K) iz = iz.slice(0, -2) + '…';
    if (iz) g.fillText(iz, M, yb + 0.5 * K);
    if (pz.der) g.fillText(pz.der, W - M - wd, yb + 0.5 * K);
  }
  return cv;
}
