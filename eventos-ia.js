/* ---- Eventos de lo nuevo ---- */
function nuevoInput2(e) {
  const t = e.target;
  if (t.dataset.scg && escaneo) {
    escaneo[t.dataset.scg] = t.dataset.scg === 'importe' ? parse(t.value) : t.value;
    if (t.dataset.scg === 'proveedor')
      escaneo.lineas.forEach((l, k) => {
        const n = q($('vista'), '.sc-l[data-k="' + k + '"] [data-out="n"]');
        if (n) n.innerHTML = notaLinea(l);
      });
    if (t.dataset.scg === 'proveedor' || t.dataset.scg === 'fecha') pintaScExtra();
    return true;
  }
  if (t.dataset.sl && escaneo) {
    const f = t.closest('.sc-l'),
      l = escaneo.lineas[+f.dataset.k];
    if (!l) return true;
    const c = t.dataset.sl;
    if (c === 'nombre') {
      l.nombre = t.value;
      const p = prodPorNombre(t.value);
      l.pid = p ? p.id : '';
      l.pasar = !!(p && puedeArea(p) && p.unidad === 'ud' && l.conv && l.unidad !== 'ud');
      l.act = !!(p && puedeArea(p) && (p.unidad === l.unidad || l.pasar) && l.precio > 0 && Math.abs(p.precio - l.precio) >= 0.005);
    } else {
      if (c === 'unidad') l.unidad = uni(t.value);
      else l[c] = parse(t.value);
      /* Corregido a mano: la cuenta de la IA ya no vale */
      delete l.conv;
      l.pasar = false;
    }
    q(f, '[data-out="n"]').innerHTML = notaLinea(l);
    pintaScExtra();
    return true;
  }
  if (t.dataset.sc && escaneo) {
    const l = escaneo.lineas[+t.closest('.sc-l').dataset.k];
    if (l) l[t.dataset.sc] = t.checked;
    return true;
  }
  if (t.dataset.vig && ventasImp) {
    ventasImp[t.dataset.vig] = t.value;
    return true;
  }
  if (t.dataset.vil && ventasImp) {
    const l = ventasImp.lineas[+t.closest('[data-k]').dataset.k],
      c = t.dataset.vil;
    if (l) {
      if (c === 'n') l.n = Math.round(parse(t.value));
      else if (c === 'precio') l.precio = Math.round(parse(t.value) * 100) / 100;
      else if (c === 'alias') l.alias = t.checked;
      else if (c === 'renombrar') l.renombrar = t.checked;
      else if (c === 'tiempo') l.tiempo = t.value.trim().slice(0, 40);
      else if (c === 'pid') {
        l.pid = t.value;
        /* Elegido a mano: deja de ser una sugerencia y se recuerda el nombre del TPV */
        if (l.como === 'parecido' || !l.como) l.como = l.pid && l.pid !== '__nuevo' ? 'manual' : l.como;
        const y = scrollY;
        vIng();
        scrollTo(0, y);
        return true;
      }
      if ($('vi-n')) $('vi-n').textContent = textoSumar();
      const mb = t.closest('[data-mi]'),
        m = mb && ventasImp.menus[+mb.dataset.mi],
        o = mb && q(mb, '[data-out="tm"]');
      if (m && o) o.textContent = totalMenu(m) + (totalMenu(m) === 1 ? ' menú' : ' menús');
    }
    return true;
  }
  if (t.dataset.vim && ventasImp) {
    const m = ventasImp.menus[+t.closest('[data-mi]').dataset.mi];
    if (m) m.ev = t.value;
    const y = scrollY;
    vIng();
    scrollTo(0, y);
    return true;
  }
  return false;
}
function nuevoSubmit2(f) {
  if (f.id === 'form-as') {
    if (asCtl) {
      asCtl.abort();
      return true;
    }
    const i = $('as-input'),
      v = i.value;
    i.value = '';
    preguntar(v);
    return true;
  }
  if (f.id === 'form-scan') {
    if (!puede(1)) return true;
    guardarEscaneo();
    return true;
  }
  if (f.id === 'form-ventas') {
    if (!puede(2)) return true;
    guardarVentas();
    return true;
  }
  if (FORMNIV[f.id] != null && !puede(FORMNIV[f.id])) {
    toast('Tu usuario no tiene permiso para esto.');
    return true;
  }
  return false;
}
function nuevoClick2(b, a) {
  if (a === 'as-nuevo') {
    if (asCtl) asCtl.abort();
    chat.length = 0;
    pintarChat();
    return true;
  }
  if (a === 'escanear') {
    escanear();
    return true;
  }
  if (a === 'sc-cancelar') {
    escaneo = null;
    vCompras();
    return true;
  }
  if (a === 'sc-quitar') {
    escaneo.lineas.splice(+b.closest('.sc-l').dataset.k, 1);
    vCompras();
    return true;
  }
  if (a === 'ventas-importar') {
    elegirPeriodoVentas();
    return true;
  }
  if (a === 'vi-crear-todos' && ventasImp) {
    ventasImp.lineas.forEach((l) => {
      if (!l.pid) l.pid = '__nuevo';
    });
    vIng();
    return true;
  }
  if (a === 'vi-cancelar') {
    ventasImp = null;
    vIng();
    return true;
  }
  if (a === 'plan-sugerir') {
    sugerirPlan();
    return true;
  }
  return false;
}
$('vista').addEventListener('click', (e) => {
  const s = e.target.closest('[data-sug]');
  if (s) preguntar(s.dataset.sug);
});
$('vista').addEventListener('keydown', (e) => {
  if (e.target.id === 'as-input' && e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const f = $('form-as');
    if (f) f.requestSubmit();
  }
});
