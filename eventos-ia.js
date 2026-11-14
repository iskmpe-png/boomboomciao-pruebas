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
      l.act = !!(p && puede(2) && p.unidad === l.unidad && l.precio > 0 && Math.abs(p.precio - l.precio) >= 0.005);
    } else if (c === 'unidad') l.unidad = uni(t.value);
    else l[c] = parse(t.value);
    q(f, '[data-out="n"]').innerHTML = notaLinea(l);
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
    const l = ventasImp.lineas[+t.closest('[data-k]').dataset.k];
    if (l) {
      if (t.dataset.vil === 'n') l.n = Math.round(parse(t.value));
      else l.pid = t.value;
      $('vi-n').textContent =
        suma(
          ventasImp.lineas.filter((x) => x.pid),
          (x) => x.n,
        ) + ' platos vendidos';
    }
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
    importarVentas();
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
