/* ---- Historial de cambios (app con usuarios) ---- */
let hist = null,
  histErr = '',
  hQ = '',
  hC = '';
const HACC = { alta: 'Creado', cambio: 'Cambio', baja: 'Eliminado', restaurado: 'Recuperado' };
const HCAMPO = {
  nombre: 'Nombre',
  precio: 'Precio',
  unidad: 'Unidad',
  proveedor: 'Proveedor',
  pvp: 'Precio en carta',
  raciones: 'Raciones',
  objetivo: 'Objetivo de food cost %',
  iva: 'IVA %',
  elaboracion: 'Elaboración',
  grupo: 'Carta o menú',
  descripcion: 'Descripción',
  vino: 'Vino',
  alergenos: 'Alérgenos',
  caducidad: 'Caducidad (días)',
  minimo: 'Stock mínimo',
  familia: 'Familia',
  cantidad: 'Cantidad',
  merma: 'Merma %',
  fecha: 'Fecha',
  importe: 'Importe',
  albaran: 'Albarán',
  motivo: 'Motivo',
  whatsapp: 'WhatsApp',
  email: 'Correo',
  nota: 'Nota',
  cerrado: 'Cerrado',
  total: 'Total',
  periodo: 'Periodo',
  punto: 'Punto',
  valor: 'Valor',
  ok: 'Correcto',
  pax: 'Comensales',
  base: 'Elaboración de la casa',
  unidadBase: 'Unidad de la elaboración',
  productoId: 'Producto',
  baseId: 'Elaboración',
  hora: 'Hora',
  tipo: 'Tipo',
  quien: 'Responsable',
  ingredientes: 'Ingredientes',
  lineas: 'Líneas',
  cantidades: 'Conteo',
  unidades: 'Unidades vendidas',
  items: 'Plan',
  hecho: 'Hecho',
  platos: 'Platos',
  n: 'Cantidad',
};
const HSKIP = { actualizado: 1, historial: 1, anterior: 1, creado: 1, por: 1, id: 1, semanas: 1, importes: 1 };
const hn = (x) =>
  x.nombre ||
  (prod(x.productoId) || {}).nombre ||
  (plato(x.baseId || x.id) || {}).nombre ||
  x.descripcion ||
  'Sin nombre';
const hv = (v) =>
  v == null || v === ''
    ? 'vacío'
    : typeof v === 'number'
      ? fNum(v, 3)
      : typeof v === 'boolean'
        ? v
          ? 'sí'
          : 'no'
        : Array.isArray(v)
          ? v.length
            ? v.map((x) => (x && typeof x === 'object' ? hn(x) : x)).join(', ')
            : 'vacío'
          : typeof v === 'object'
            ? '…'
            : String(v).length > 90
              ? String(v).slice(0, 90) + '…'
              : String(v);
function difs(a, b) {
  a = a || {};
  b = b || {};
  const out = [];
  Object.keys(Object.assign({}, a, b)).forEach((k) => {
    if (HSKIP[k]) return;
    const x = a[k],
      y = b[k];
    if (canon(x) === canon(y)) return;
    const et = HCAMPO[k] || k;
    if (Array.isArray(x) || Array.isArray(y)) {
      const xa = Array.isArray(x) ? x : [],
        ya = Array.isArray(y) ? y : [];
      if (xa.concat(ya).some((e) => e && typeof e === 'object')) {
        const mk = (l) => {
            const m = new Map();
            l.forEach((e) => {
              let n = hn(e);
              while (m.has(n)) n += ' (otro)';
              m.set(n, e);
            });
            return m;
          },
          mx = mk(xa),
          my = mk(ya);
        my.forEach((e, n) => {
          if (!mx.has(n)) out.push('Añadido: ' + n);
          else difs(mx.get(n), e).forEach((s) => out.push(n + ' · ' + s));
        });
        mx.forEach((e, n) => {
          if (!my.has(n)) out.push('Quitado: ' + n);
        });
      } else out.push(et + ': ' + hv(xa) + ' → ' + hv(ya));
    } else if ((x && typeof x === 'object') || (y && typeof y === 'object')) {
      const xo = x || {},
        yo = y || {};
      Object.keys(Object.assign({}, xo, yo)).forEach((kk) => {
        if (canon(xo[kk]) !== canon(yo[kk])) {
          const p = prod(kk) || plato(kk);
          out.push(et + ' · ' + (p ? p.nombre : kk) + ': ' + hv(xo[kk]) + ' → ' + hv(yo[kk]));
        }
      });
    } else out.push(et + ': ' + hv(x) + ' → ' + hv(y));
  });
  return out;
}
function cargarHist() {
  histErr = '';
  sb.from('historial')
    .select('id,col,doc_id,accion,antes,despues,nombre,creado')
    .eq('restaurante_id', rid)
    .order('id', { ascending: false })
    .limit(300)
    .then(
      (q) => {
        if (q.error) {
          hist = [];
          histErr = /historial|relation|schema|404/i.test(q.error.message || '')
            ? 'Falta activar el historial en la base de datos: ejecuta en Supabase el segundo script (historial).'
            : errTxt(q.error);
        } else hist = q.data || [];
        if (pant === 'historial') vHistorial();
      },
      () => {
        hist = [];
        histErr = 'Sin conexión. Vuelve a intentarlo.';
        if (pant === 'historial') vHistorial();
      },
    );
}
function vHistorial() {
  if (!sb || nivel !== 'admin') {
    $('vista').innerHTML = vacio(
      'Historial no disponible',
      'El historial de cambios solo lo ven el dueño y el encargado.',
      '',
    );
    return;
  }
  if (!hist) {
    $('vista').innerHTML = '<section class="card estado"><strong>Cargando el historial</strong></section>';
    cargarHist();
    return;
  }
  const qs = {},
    cs = {};
  hist.forEach((h) => {
    qs[h.nombre || 'Sin nombre'] = 1;
    cs[h.col] = 1;
  });
  const l = hist.filter((h) => (!hQ || (h.nombre || 'Sin nombre') === hQ) && (!hC || h.col === hC)),
    fh = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  $('vista').innerHTML =
    '<div class="bar" data-libre><div class="field"><label for="h-q">Persona</label><select id="h-q"><option value="">Todas</option>' +
    Object.keys(qs)
      .sort()
      .map((n) => '<option' + (n === hQ ? ' selected' : '') + '>' + esc(n) + '</option>')
      .join('') +
    '</select></div>' +
    '<div class="field"><label for="h-c">Apartado</label><select id="h-c"><option value="">Todos</option>' +
    Object.keys(cs)
      .sort()
      .map(
        (c) =>
          '<option value="' + esc(c) + '"' + (c === hC ? ' selected' : '') + '>' + esc(COLTXT[c] || c) + '</option>',
      )
      .join('') +
    '</select></div>' +
    '<button class="btn" type="button" data-act="hist-recargar">Actualizar</button></div>' +
    (histErr ? '<p class="aviso">' + esc(histErr) + '</p>' : '') +
    (l.length
      ? '<section class="card"><div class="hi-lista">' +
        l
          .slice(0, lim.hist)
          .map((h) => {
            const ref = h.despues || h.antes || {},
              d = h.antes && h.despues ? difs(h.antes, h.despues) : [],
              ver = d.slice(0, 14);
            return (
              '<div class="hi"><div class="hi-c"><b>' +
              esc(h.nombre || 'Sin nombre') +
              '</b><span class="pill' +
              (h.accion === 'baja' ? ' crit' : h.accion === 'cambio' ? '' : ' ok') +
              '">' +
              HACC[h.accion] +
              '</span><span class="hi-t">' +
              esc((COLTXT[h.col] || h.col) + ' · ' + tituloDoc(h.col, ref)) +
              '</span><small>' +
              esc(fh.format(new Date(h.creado))) +
              '</small></div>' +
              (ver.length
                ? '<ul class="hi-d">' +
                  ver.map((s) => '<li>' + esc(s) + '</li>').join('') +
                  (d.length > ver.length ? '<li>y ' + (d.length - ver.length) + ' cambios más</li>' : '') +
                  '</ul>'
                : '') +
              (h.antes && NORM[h.col] && (h.accion === 'cambio' || h.accion === 'baja')
                ? '<button class="link" type="button" data-act="hist-volver" data-id="' +
                  h.id +
                  '">' +
                  (h.accion === 'baja' ? 'Recuperar' : 'Volver a como estaba antes') +
                  '</button>'
                : '') +
              '</div>'
            );
          })
          .join('') +
        '</div>' +
        masHTML('hist', l.length) +
        '</section>'
      : histErr
        ? ''
        : vacio(
            'Sin cambios registrados',
            'Aquí verás quién cambió cada cosa, cuándo, y el valor anterior y el nuevo.',
            '',
          ));
}
V.addEventListener('change', (e) => {
  const t = e.target,
    c = t.closest('[data-pv]');
  if (c && t.dataset.pvf) {
    if (!puede(2)) return;
    guardaProv(c.dataset.pv, t.dataset.pvf, t.value.trim());
  } else if (t.dataset.ped) {
    const q = parse(t.value);
    if (q > 0) pedCarga()[t.dataset.ped] = q;
    else delete pedCarga()[t.dataset.ped];
    pedGuarda();
    vPedidos();
  } else if (t.id === 'h-q') {
    hQ = t.value;
    vHistorial();
  } else if (t.id === 'h-c') {
    hC = t.value;
    vHistorial();
  }
});
V.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.id === 'form-prov') {
    e.preventDefault();
    const n = $('pv-nuevo').value.trim();
    if (!n) return;
    if (!puede(2)) {
      toast('Tu usuario no tiene permiso para esto.');
      return;
    }
    if (!provDe(n)) guardaProv(n);
    vProveedores();
  } else if (f.id === 'form-ped') {
    e.preventDefault();
    const p = prodPorNombre($('ped-prod').value),
      q = parse($('ped-cant').value);
    if (!p) {
      toast('Elige un producto de la lista de Precios.');
      return;
    }
    if (!(q > 0)) {
      toast('Escribe la cantidad.');
      return;
    }
    pedCarga()[p.id] = r3((Number(pedido[p.id]) || 0) + q);
    delete pedEnv[p.proveedor || 'Sin proveedor'];
    pedGuarda();
    vPedidos();
    $('ped-prod').focus();
  }
});
V.addEventListener('click', (e) => {
  const en = e.target.closest('[data-env]');
  if (en) {
    pedEnv[en.dataset.env] = true;
    setTimeout(() => {
      if (pant === 'pedidos') vPedidos();
    }, 600);
    return;
  }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'ped-falta') {
    porPedir().forEach((x) => {
      if (!(pedCarga()[x.p.id] > 0)) pedido[x.p.id] = x.pedir;
    });
    pedGuarda();
    vPedidos();
  } else if (a === 'ped-vaciar') {
    if (confirmar(b, '¿Vaciar el pedido?')) {
      pedido = {};
      Object.keys(pedEnv).forEach((k) => delete pedEnv[k]);
      pedGuarda();
      vPedidos();
    }
  } else if (a === 'ped-quitar') {
    delete pedCarga()[b.dataset.id];
    pedGuarda();
    vPedidos();
  } else if (a === 'ped-copiar') {
    const tx = pedTexto(pedGrupos()[b.dataset.k] || []);
    const ok = () => toast('Pedido copiado.');
    try {
      navigator.clipboard.writeText(tx).then(ok, () => toast('No se pudo copiar aquí.'));
    } catch (er) {
      toast('No se pudo copiar aquí.');
    }
  } else if (a === 'hist-recargar') {
    hist = null;
    vHistorial();
  } else if (a === 'hist-volver') {
    const h = (hist || []).find((x) => String(x.id) === b.dataset.id);
    if (!h || !confirmar(b, '¿Seguro? Pulsa otra vez')) return;
    const o = NORM[h.col](Object.assign({}, h.antes, { id: h.doc_id })),
      i = S[h.col].findIndex((x) => x.id === h.doc_id);
    if (i >= 0) S[h.col][i] = o;
    else S[h.col].push(o);
    guardar(h.col, o, true);
    sucio();
    toast('Recuperado: ' + tituloDoc(h.col, o));
    setTimeout(() => {
      hist = null;
      if (pant === 'historial') vHistorial();
    }, 1800);
  }
});
