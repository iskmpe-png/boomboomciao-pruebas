/* ---- Eventos de las pantallas nuevas ---- */
function tog(l, a) {
  const k = l.indexOf(a);
  if (k >= 0) l.splice(k, 1);
  else l.push(a);
  return k < 0;
}
function nuevoInput(e) {
  const t = e.target;
  if (t.id === 'sim-pvp' || t.id === 'sim-sube') {
    calcSim();
    return true;
  }
  if (t.id === 'r-cant') {
    const p = plato(recetaId),
      v = parse(t.value);
    if (p) {
      factor = v > 0 ? v / (p.raciones > 0 ? p.raciones : 1) : 1;
      $('r-lista').innerHTML = listaRecetaHTML(p);
      $('r-rinde').textContent = 'Rinde ' + rindeF(p);
      enlacesReceta();
    }
    return true;
  }
  if (t.dataset.v) {
    const v = ventasMes(true),
      n = Math.round(parse(t.value));
    if (n > 0) v.unidades[t.dataset.v] = n;
    else delete v.unidades[t.dataset.v];
    guardar('ventas', v);
    calcIng();
    return true;
  }
  if (t.dataset.plan) {
    const v = plan(true),
      c = parse(t.value);
    if (c > 0) v.items[t.dataset.plan] = c;
    else delete v.items[t.dataset.plan];
    guardar('planes', v);
    calcPlan();
    return true;
  }
  if (t.dataset.ev) {
    const ev = evento();
    if (ev) {
      ev[t.dataset.ev] = t.dataset.ev === 'nombre' ? t.value : parse(t.value);
      guardar('eventos', ev);
      calcEv();
    }
    return true;
  }
  if (t.dataset.evn) {
    const ev = evento();
    if (ev && ev.platos[+t.dataset.evn]) {
      ev.platos[+t.dataset.evn].n = parse(t.value);
      guardar('eventos', ev);
      calcEv();
    }
    return true;
  }
  if (t.id === 'et-dias') {
    const p = plato(et.id),
      d = Math.round(parse(t.value));
    if (p && d > 0) {
      p.caducidad = d;
      guardar('platos', p);
      pintarEt();
    }
    return true;
  }
  if (t.id === 'et-resp') {
    et.resp = t.value;
    mem('bbc.resp', et.resp);
    pintarEt();
    return true;
  }
  return false;
}
function nuevoChange(e) {
  const t = e.target;
  if (t.id === 'et-plato') {
    et.id = t.value;
    vEtiquetas();
    return true;
  }
  if (t.id === 'et-fecha') {
    if (t.value) {
      et.fecha = t.value;
      pintarEt();
    }
    return true;
  }
  if (t.id === 'plan-fecha') {
    if (t.value) {
      planF = t.value;
      vProduccion();
    }
    return true;
  }
  if (t.dataset.planh) {
    const v = plan(true);
    if (t.checked) v.hecho[t.dataset.planh] = true;
    else delete v.hecho[t.dataset.planh];
    guardar('planes', v, true);
    return true;
  }
  if (t.id === 'ap-tipo') {
    apTipo = t.value;
    vAppcc();
    return true;
  }
  if (t.id === 'ap-dia') {
    if (t.value) {
      apDia = t.value;
      lim.appcc = 25;
      listaAppcc();
    }
    return true;
  }
  if (t.id === 'ap-per') {
    apPer = t.value;
    lim.appcc = 25;
    listaAppcc();
    return true;
  }
  return false;
}
function nuevoSubmit(f) {
  if (f.id === 'form-compra') {
    const imp = parse($('co-imp').value),
      msg = $('co-msg'),
      pv = $('co-prov').value.trim(),
      fe = $('co-fecha').value || hoy();
    if (!pv) {
      msg.textContent = 'Escribe el proveedor.';
      $('co-prov').focus();
      return true;
    }
    if (!(imp > 0)) {
      msg.textContent = 'Escribe el importe.';
      $('co-imp').focus();
      return true;
    }
    const c = nCompra({
      id: nuevoId('compras'),
      fecha: fe,
      proveedor: pv,
      albaran: $('co-alb').value.trim(),
      importe: imp,
      creado: new Date().toISOString(),
      por: miId || '',
    });
    S.compras.push(c);
    guardar('compras', c, true);
    if (fe.slice(0, 7) !== mesM) {
      mesM = fe.slice(0, 7);
      vCompras();
    } else {
      $('co-alb').value = '';
      $('co-imp').value = '';
      msg.textContent = 'Compra apuntada.';
      listaCompras();
      $('co-prov').focus();
    }
    return true;
  }
  if (f.id === 'form-appcc') {
    const pt = $('ap-punto').value.trim(),
      msg = $('ap-msg'),
      vi = $('ap-valor'),
      raw = vi ? vi.value.trim() : '',
      val = raw === '' ? null : parse(raw),
      d = new Date();
    if (!pt) {
      msg.textContent = 'Escribe el equipo, la zona o el proveedor.';
      $('ap-punto').focus();
      return true;
    }
    if (apTipo === 'temp' && val == null) {
      msg.textContent = 'Escribe la temperatura.';
      vi.focus();
      return true;
    }
    const ok = apTipo === 'temp' ? (/congel/i.test(pt) ? val <= -18 : val <= 5) : $('ap-ok').checked,
      quien = $('ap-quien').value.trim();
    if (quien) {
      et.resp = quien;
      mem('bbc.resp', quien);
    }
    const a = nAppcc({
      id: nuevoId('appcc'),
      fecha: hoy(),
      hora: pad(d.getHours()) + ':' + pad(d.getMinutes()),
      tipo: apTipo,
      punto: pt,
      valor: val,
      ok: ok,
      nota: $('ap-nota').value.trim(),
      quien: quien,
      por: miId || '',
    });
    S.appcc.push(a);
    guardar('appcc', a, true);
    apDia = hoy();
    $('ap-dia').value = apDia;
    $('ap-punto').value = '';
    if (vi) vi.value = '';
    $('ap-nota').value = '';
    msg.textContent = ok ? 'Registrado.' : 'Registrado como incidencia: anota qué se hizo para corregirlo.';
    listaAppcc();
    $('ap-punto').focus();
    return true;
  }
  return false;
}
function nuevoClick(b, a) {
  if (a === 'alg-prod') {
    const p = prod(b.closest('.editor').dataset.id);
    if (p) {
      b.setAttribute('aria-pressed', String(tog(p.alergenos, b.dataset.a)));
      guardar('productos', p);
    }
    return true;
  }
  if (a === 'alg-plato') {
    const p = plato();
    if (p) {
      b.setAttribute('aria-pressed', String(tog(p.alergenos, b.dataset.a)));
      guardar('platos', p);
      calcExtra();
    }
    return true;
  }
  if (a === 'visto-alerta') {
    const p = prod(b.closest('[data-id]').dataset.id);
    if (p) {
      p.anterior = 0;
      guardar('productos', p, true);
      vAlertas();
    }
    return true;
  }
  if (a === 'cambiar-prov') {
    if (!confirmar(b, 'Pulsa otra vez para cambiar')) return true;
    const f = b.closest('[data-de]'),
      de = f.dataset.de,
      al = prod(f.dataset.a);
    let n = 0;
    if (al)
      S.platos.forEach((pl) => {
        let ch = false;
        pl.ingredientes.forEach((i) => {
          if (i.productoId === de) {
            i.productoId = al.id;
            i.nombre = al.nombre;
            i.precio = al.precio;
            i.unidad = al.unidad;
            ch = true;
          }
        });
        if (ch) {
          n++;
          guardar('platos', pl);
        }
      });
    toast('Cambiado en ' + n + (n === 1 ? ' ficha' : ' fichas'));
    vComparar();
    return true;
  }
  if (a === 'ev-nuevo') {
    const ev = nEvento({ id: nuevoId('eventos'), nombre: '', pax: 10, platos: [] });
    S.eventos.push(ev);
    evId = ev.id;
    guardar('eventos', ev);
    vEventos();
    $('ev-nombre').focus();
    return true;
  }
  if (a === 'ev-abrir') {
    evId = b.dataset.id;
    vEventos();
    return true;
  }
  if (a === 'ev-volver') {
    evId = null;
    vEventos();
    return true;
  }
  if (a === 'ev-add') {
    const ev = evento(),
      id = $('ev-sel').value;
    if (ev && id) {
      ev.platos.push({ id: id, n: 1 });
      guardar('eventos', ev);
      vEventos();
    }
    return true;
  }
  if (a === 'ev-quitar') {
    const ev = evento();
    if (ev) {
      ev.platos.splice(+b.closest('[data-k]').dataset.k, 1);
      guardar('eventos', ev);
      vEventos();
    }
    return true;
  }
  if (a === 'ev-borrar') {
    if (!confirmar(b, 'Pulsa otra vez')) return true;
    borrar('eventos', evId);
    evId = null;
    vEventos();
    return true;
  }
  if (a === 'ap-borrar') {
    borrar('appcc', b.closest('.row').dataset.id);
    listaAppcc();
    return true;
  }
  if (a === 'co-borrar') {
    borrar('compras', b.closest('.row').dataset.id);
    listaCompras();
    return true;
  }
  if (a === 'modo-cocina') {
    abrirCocina();
    return true;
  }
  return false;
}
