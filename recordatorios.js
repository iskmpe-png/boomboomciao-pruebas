/* ---- Recordatorios de pedidos ----
   Cada proveedor guarda los días en que acepta pedidos y la hora límite. Si hay productos
   suyos por debajo del stock mínimo, la app avisa desde unas horas antes del cierre
   (5 por defecto): por ejemplo, el jueves desde las 12:00 si el límite es a las 17:00. */
const DIAS_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];
/* Próximo cierre de pedidos del proveedor a partir de «ahora» */
function proximoCorte(p, ahora) {
  if (!p.diasPedido.length) return null;
  const [h, m] = (p.horaPedido || '23:59').split(':').map(Number);
  for (let k = 0; k < 8; k++) {
    const d = new Date(ahora);
    d.setDate(d.getDate() + k);
    d.setHours(h, m, 0, 0);
    if (p.diasPedido.indexOf(d.getDay()) >= 0 && d > ahora) return d;
  }
  return null;
}
function avisosPedido(ahora) {
  ahora = ahora || new Date();
  const falta = porPedir();
  return S.proveedores
    .filter((p) => p.diasPedido.length)
    .map((p) => {
      const corte = proximoCorte(p, ahora),
        items = falta.filter((x) => norm(x.p.proveedor) === norm(p.nombre)),
        desde = corte ? new Date(corte.getTime() - (Number(p.avisoHoras) || 5) * 36e5) : null;
      return { p, corte, items, activo: !!(corte && items.length && ahora >= desde), queda: corte ? corte - ahora : 0 };
    })
    .sort((a, z) => (a.corte ? a.corte.getTime() : 9e15) - (z.corte ? z.corte.getTime() : 9e15));
}
const fQueda = (ms) => {
  const min = Math.max(0, Math.round(ms / 60000));
  return min < 60 ? min + ' min' : Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : '');
};
const fCorte = (d) => {
  const hoyD = new Date(),
    man = new Date();
  man.setDate(hoyD.getDate() + 1);
  const dia = d.toDateString() === hoyD.toDateString() ? 'hoy' : d.toDateString() === man.toDateString() ? 'mañana' : 'el ' + DIAS_LARGOS[d.getDay()];
  return dia + ' a las ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};
/* Aviso fijo encima de cualquier pantalla. «Más tarde» lo calla una hora. */
function pintaRecordatorio() {
  const el = $('recordatorio');
  if (!el) return;
  const ac = $('acceso');
  if (!listo() || (ac && !ac.hidden) || !puede(1)) {
    el.hidden = true;
    return;
  }
  const l = avisosPedido().filter((a) => a.activo && !(Number(mem('bbc.calla.' + a.p.id)) > Date.now()));
  el.hidden = !l.length;
  el.innerHTML = l
    .map(
      (a) =>
        '<div class="rec' + (a.queda < 36e5 ? ' urgente' : '') + '" data-pid="' + esc(a.p.id) + '"><div class="rec-t"><b>Pedido a ' + esc(a.p.nombre) + ' antes de ' + esc(fCorte(a.corte)) + '</b><span>Quedan ' + fQueda(a.queda) + ' · ' +
        esc(a.items.slice(0, 4).map((x) => x.p.nombre).join(', ') + (a.items.length > 4 ? ' y ' + (a.items.length - 4) + ' más' : '')) + ' por debajo del mínimo</span></div>' +
        '<div class="rec-b"><a class="btn small primary" href="#almacen-pedidos" data-act="rec-ir">Hacer pedido</a><button class="btn small" type="button" data-act="rec-callar">Más tarde</button></div></div>',
    )
    .join('');
}
setInterval(pintaRecordatorio, 60000);
$('recordatorio').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = b.closest('[data-pid]').dataset.pid;
  if (b.dataset.act === 'rec-callar') {
    mem('bbc.calla.' + id, String(Date.now() + 36e5));
    pintaRecordatorio();
    toast('Te lo recuerdo dentro de una hora.');
  }
});
/* En Pedidos: el calendario de cada proveedor y lo que toca pedirle */
function proximosHTML() {
  const l = avisosPedido();
  if (!l.length)
    return '<section class="card"><h3>Próximos pedidos</h3><p class="hint">En <a href="#almacen-proveedores">Proveedores</a> marca qué días acepta pedidos cada uno y hasta qué hora. La app te avisará a tiempo cuando haya algo por debajo del mínimo.</p></section>';
  return (
    '<section class="card"><h3>Próximos pedidos</h3><div class="rows">' +
    l
      .map(
        (a) =>
          '<div class="row"><span class="n"><b>' + esc(a.p.nombre) + '</b><span>' + esc(ORDEN_SEMANA.filter((d) => a.p.diasPedido.indexOf(d) >= 0).map((d) => DIAS_CORTOS[d]).join(' ') + (a.p.horaPedido ? ' · hasta las ' + a.p.horaPedido : '')) +
          (a.items.length ? ' · ' + a.items.length + (a.items.length === 1 ? ' producto bajo mínimo' : ' productos bajo mínimo') : '') + '</span></span><span class="d">' +
          (a.corte ? '<b>' + esc(fCorte(a.corte)) + '</b>' + (a.activo ? '<span class="pill ' + (a.queda < 36e5 ? 'crit' : 'warn') + '">Quedan ' + fQueda(a.queda) + '</span>' : '') : '') + '</span></div>',
      )
      .join('') +
    '</div></section>'
  );
}
/* En Proveedores: casillas de días, hora límite y antelación del aviso */
function diasProvHTML(p, i) {
  return (
    '<div class="field wide pv-dias"><span class="lbl">Acepta pedidos</span><div class="dias">' +
    ORDEN_SEMANA.map((d) => '<label class="dia"><input type="checkbox" data-pvd="' + d + '"' + ((p.diasPedido || []).indexOf(d) >= 0 ? ' checked' : '') + '><span>' + DIAS_CORTOS[d] + '</span></label>').join('') +
    '</div></div>' +
    '<div class="field"><label for="pv-h' + i + '">Hasta las</label><input id="pv-h' + i + '" type="time" data-pvf="horaPedido" value="' + esc(p.horaPedido || '') + '"></div>' +
    '<div class="field"><label for="pv-a' + i + '">Avisar con (horas)</label><input id="pv-a' + i + '" type="text" inputmode="numeric" data-pvf="avisoHoras" value="' + esc(String(p.avisoHoras || 5)) + '"></div>'
  );
}
V.addEventListener('change', (e) => {
  const t = e.target,
    c = t.closest('[data-pv]');
  if (!c || t.dataset.pvd == null || !puede(2)) return;
  const p = guardaProv(c.dataset.pv),
    d = +t.dataset.pvd;
  p.diasPedido = (p.diasPedido || []).filter((x) => x !== d);
  if (t.checked) p.diasPedido.push(d);
  guardar('proveedores', p, true);
  pintaRecordatorio();
});
