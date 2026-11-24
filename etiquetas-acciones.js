/* ---- Etiquetas: lo que pasa al tocar y al escribir ---- */
V.addEventListener('input', (e) => {
  if (pant !== 'etiquetas') return;
  const t = e.target;
  if (t.dataset.et) {
    et.ed = et.ed || {};
    et.ed[t.dataset.et] = t.dataset.et === 'dias' ? Math.max(0, Math.round(parse(t.value))) : t.value;
    pintarEt();
    if (t.id === 'et-n') pintarSug(t.value);
  } else if (t.id === 'et-resp') {
    et.resp = t.value;
    mem('bbc.resp', et.resp);
    pintarEt();
  } else if (t.id === 'et-cop') {
    et.copias = Math.min(50, Math.max(1, Math.round(parse(t.value)) || 1));
    pintarEt();
  } else if (t.dataset.tnN !== undefined) {
    const i = tandaEt().items[+t.dataset.tnN];
    if (!i) return;
    i.n = Math.min(50, Math.max(0, Math.round(parse(t.value)) || 0));
    guardaTanda();
    t.closest('.tn-fila').classList.toggle('cero', !i.n);
    const b = document.querySelector('[data-act="et-tn-imp"]'),
      n = totalTanda();
    if (b) {
      b.textContent = n === 1 ? 'Imprimir 1 etiqueta' : 'Imprimir ' + n + ' etiquetas';
      b.disabled = !n;
    }
  } else if (t.id === 'fm-nombre' && et.edFmt) {
    et.edFmt.nombre = t.value;
    pintarEt();
  }
});
V.addEventListener('change', (e) => {
  if (pant !== 'etiquetas') return;
  const t = e.target;
  if (t.id === 'et-plato') {
    et.id = t.value;
    et.ed = t.value === 'nueva' ? { nombre: '' } : {};
    vEtiquetas();
    if (t.value === 'nueva' && $('et-n')) $('et-n').focus();
  } else if (t.id === 'et-fecha' && t.value) {
    et.fecha = t.value;
    pintarEt();
  } else if (t.dataset.tnFmt !== undefined) {
    const i = tandaEt().items[+t.dataset.tnFmt];
    if (i) {
      i.f = t.value;
      guardaTanda();
    }
  } else if (t.dataset.tnN !== undefined) {
    const i = tandaEt().items[+t.dataset.tnN];
    if (i) t.value = i.n;
  } else if (t.id === 'fm-centro' && et.edFmt) {
    et.edFmt.centro = t.checked;
    pintarEt();
  }
});
/* Tanda y formatos: estos botones no dependen de la etiqueta que se está editando */
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act^="et-tn-"],[data-act^="et-fm"],[data-act="et-lista"]');
  if (!b || pant !== 'etiquetas') return;
  const a = b.dataset.act,
    t = tandaEt(),
    msg = (x) => {
      if ($('tn-msg')) $('tn-msg').textContent = x;
    };
  if (a === 'et-tn-add') {
    const d = datosEt();
    if (!d) return;
    if (!d.nombre.trim()) {
      toast('Escribe el nombre de la etiqueta.');
      if ($('et-n')) $('et-n').focus();
      return;
    }
    const ed = Object.assign({}, et.ed || {});
    if (et.id === 'nueva') ed.nombre = d.nombre.trim();
    aTanda(et.id, ed, d.copias, fmtActual().id);
    pintarTanda();
    toast('Añadida a la tanda: ' + d.copias + ' × ' + d.nombre.trim() + '.');
  } else if (a === 'et-tn-mas' || a === 'et-tn-menos') {
    const i = t.items[+b.dataset.k];
    if (!i) return;
    i.n = Math.min(50, Math.max(0, i.n + (a === 'et-tn-mas' ? 1 : -1)));
    guardaTanda();
    pintarTanda();
  } else if (a === 'et-tn-quitar') {
    t.items.splice(+b.dataset.k, 1);
    if (!t.items.length) t.lista = '';
    guardaTanda();
    pintarTanda();
  } else if (a === 'et-tn-vaciar') {
    et.tanda = { lista: '', items: [] };
    et.nuevaLista = false;
    guardaTanda();
    pintarTanda();
  } else if (a === 'et-tn-imp') imprimirTanda();
  else if (a === 'et-lista') {
    const l = listaDe(b.dataset.id);
    if (!l) return;
    cargarLista(l);
    et.nuevaLista = false;
    pintarTanda();
  } else if (a === 'et-tn-nueva') {
    if (!puede(1)) return;
    et.nuevaLista = true;
    pintarTanda();
    if ($('tn-nombre')) $('tn-nombre').focus();
  } else if (a === 'et-tn-cancelar') {
    et.nuevaLista = false;
    pintarTanda();
  } else if (a === 'et-tn-guardar') {
    const l = t.lista ? listaDe(t.lista) : null;
    if (!l || !puede(1)) return;
    Object.assign(l, nEtiqueta(Object.assign({}, l, { items: itemsLista(t) })));
    guardar('etiquetas', l, true);
    pintarTanda();
    toast('Lista «' + l.nombre + '» guardada.');
  } else if (a === 'et-tn-borrar') {
    const l = t.lista ? listaDe(t.lista) : null;
    if (!l || !puede(1) || !confirmar(b, '¿Borrar la lista «' + l.nombre + '»?')) return;
    borrar('etiquetas', l.id);
    t.lista = '';
    guardaTanda();
    pintarTanda();
  } else if (a === 'et-fmt') {
    et.fmt = b.dataset.id;
    mem('bbc.etFmt', et.fmt);
    pintarFmt();
  } else if (a === 'et-fm-nuevo') {
    et.edFmt = { nombre: '', campos: { cad: true }, tit: 'xl', centro: true };
    pintarFmt();
    if ($('fm-nombre')) $('fm-nombre').focus();
  } else if (a === 'et-fm-editar') {
    const f = fmtActual();
    et.edFmt = { nombre: f.base ? f.nombre + ' (mía)' : f.nombre, campos: Object.assign({}, f.campos), tit: f.tit, centro: !!f.centro, doc: f.base ? null : f.doc };
    pintarFmt();
  } else if (a === 'et-fm-cancelar') {
    et.edFmt = null;
    pintarFmt();
  } else if (a === 'et-fm-campo') {
    const c = (et.edFmt.campos = Object.assign({}, et.edFmt.campos));
    c[b.dataset.k] = !c[b.dataset.k];
    b.setAttribute('aria-pressed', String(c[b.dataset.k]));
    b.classList.toggle('on', c[b.dataset.k]);
    pintarEt();
  } else if (a === 'et-fm-tit') {
    et.edFmt.tit = b.dataset.k;
    document.querySelectorAll('[data-act="et-fm-tit"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintarEt();
  } else if (a === 'et-fm-guardar') {
    if (!puede(1)) return;
    const ed = et.edFmt,
      nom = (ed.nombre || '').trim();
    if (!nom) {
      $('fm-msg').textContent = 'Ponle un nombre al formato (por ejemplo «Solo nombre»).';
      $('fm-nombre').focus();
      return;
    }
    const campos = { tipo: 'formato', nombre: nom, campos: ed.campos, tit: ed.tit, centro: ed.centro };
    let id;
    if (ed.doc) {
      Object.assign(ed.doc, nEtiqueta(Object.assign({ id: ed.doc.id, area: ed.doc.area }, campos)));
      guardar('etiquetas', ed.doc, true);
      id = ed.doc.id;
    } else {
      const n = nEtiqueta(Object.assign({ id: nuevoId('etiquetas'), area: '' }, campos));
      S.etiquetas.push(n);
      guardar('etiquetas', n, true);
      id = n.id;
    }
    et.fmt = 'e:' + id;
    mem('bbc.etFmt', et.fmt);
    et.edFmt = null;
    pintarFmt();
    pintarTanda();
    toast('Formato «' + nom + '» guardado.');
  } else if (a === 'et-fm-borrar') {
    const doc = et.edFmt && et.edFmt.doc;
    if (!doc || !confirmar(b, '¿Borrar el formato «' + doc.nombre + '»?')) return;
    borrar('etiquetas', doc.id);
    et.fmt = 'std';
    mem('bbc.etFmt', 'std');
    et.edFmt = null;
    pintarFmt();
    pintarTanda();
  }
});
/* Lo que se guarda de la tanda en una lista: qué etiqueta y cuántas copias */
const itemsLista = (t) =>
  t.items.filter((i) => datosDe(i.ref, i.ed, 1)).map((i) => {
    const o = { ref: i.ref, n: i.n, f: i.f },
      ed = edEt(i.ed);
    /* Todo lo que se cambió a mano (nombre, días, alérgenos…) se guarda en la lista */
    if (ed) o.ed = ed;
    return o;
  });
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act^="et-"]');
  if (!b || pant !== 'etiquetas' || /^et-(tn-|fm|lista$)/.test(b.dataset.act)) return;
  const a = b.dataset.act,
    d = datosEt();
  if (!d) return;
  if (a === 'et-sug') {
    /* Elegida una sugerencia: la etiqueta sale de esa ficha, producto o etiqueta guardada */
    et.id = b.dataset.ref;
    et.ed = {};
    vEtiquetas();
    if ($('et-cop')) $('et-cop').focus();
    return;
  }
  if (a === 'et-imp') imprimirEt();
  else if (a === 'et-pdf') {
    if (!d.nombre.trim()) return toast('Escribe el nombre de la etiqueta.');
    pdfEtiqueta(d);
  }
  else if (a === 'et-alg') {
    const l = d.alg.slice(),
      k = l.indexOf(b.dataset.a);
    if (k >= 0) l.splice(k, 1);
    else l.push(b.dataset.a);
    et.ed = et.ed || {};
    et.ed.alg = l;
    b.setAttribute('aria-pressed', String(k < 0));
    b.classList.toggle('on', k < 0);
    pintarEt();
  } else if (a === 'et-modo') {
    mem('bbc.impMod', b.dataset.m);
    mem('bbc.impVisto', '');
    vEtiquetas();
  } else if (a === 'et-deshacer') {
    et.ed = {};
    vEtiquetas();
  } else if (a === 'et-guardar') {
    if (!puede(1)) return;
    if (!d.nombre.trim()) {
      $('et-msg').textContent = 'Escribe el nombre de la etiqueta.';
      $('et-n').focus();
      return;
    }
    const campos = { tipo: '', nombre: d.nombre.trim(), dias: d.dias || 1, alergenos: d.alg, conserva: d.conserva, nota: d.nota };
    if (d.e) {
      Object.assign(d.e, nEtiqueta(Object.assign({ id: d.e.id, area: d.e.area }, campos)));
      guardar('etiquetas', d.e, true);
      toast('Etiqueta guardada.');
    } else {
      const n = nEtiqueta(Object.assign({ id: nuevoId('etiquetas'), area: areaNueva() }, campos));
      S.etiquetas.push(n);
      guardar('etiquetas', n, true);
      /* Si viene de una ficha y es encargado, los días de vida también se guardan en la ficha */
      if (d.p && puede(2) && et.ed && et.ed.dias > 0 && et.ed.dias !== d.p.caducidad && puedeArea(d.p)) {
        d.p.caducidad = et.ed.dias;
        guardar('platos', d.p);
      }
      et.id = 'e:' + n.id;
      toast('Guardada en «Etiquetas guardadas».');
    }
    et.ed = {};
    vEtiquetas();
  } else if (a === 'et-borrar') {
    if (!d.e || !confirmar(b, '¿Borrar la etiqueta?')) return;
    borrar('etiquetas', d.e.id);
    et.id = null;
    et.ed = {};
    vEtiquetas();
  }
});
V.addEventListener('submit', (e) => {
  if (e.target.id === 'form-lista') {
    e.preventDefault();
    const nom = ($('tn-nombre').value || '').trim(),
      t = tandaEt();
    if (!nom) {
      $('tn-msg').textContent = 'Ponle nombre a la lista (por ejemplo «Área de pastas»).';
      $('tn-nombre').focus();
      return;
    }
    if (!puede(1)) return;
    const f = t.items.length && t.items.every((i) => i.f === t.items[0].f) ? t.items[0].f : 'std';
    const l = nEtiqueta({ id: nuevoId('etiquetas'), area: areaNueva(), tipo: 'lista', nombre: nom, items: itemsLista(t), formato: f });
    S.etiquetas.push(l);
    guardar('etiquetas', l, true);
    t.lista = l.id;
    et.nuevaLista = false;
    guardaTanda();
    pintarTanda();
    toast('Lista «' + nom + '» guardada. La tienes arriba para la próxima vez.');
    return;
  }
  if (e.target.id !== 'form-et') return;
  e.preventDefault();
  imprimirEt();
});

/* Las sugerencias se cierran al tocar fuera o con Escape */
document.addEventListener('pointerdown', (e) => {
  const o = $('et-sug');
  if (o && !o.hidden && !e.target.closest('#et-sug,#et-n')) o.hidden = true;
});
V.addEventListener('keydown', (e) => {
  if (e.target.id === 'et-n' && e.key === 'Escape' && $('et-sug')) $('et-sug').hidden = true;
});
