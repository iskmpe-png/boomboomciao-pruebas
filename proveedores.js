/* ---- Proveedores: contactos para enviar pedidos ---- */
const casa = () => {
  const m = mios.find((x) => x.id === rid);
  return (m && m.nombre) || S.ajustes.nombre || 'Boom Boom Ciao';
};
const provDe = (n) => {
  const k = norm(n);
  return S.proveedores.find((x) => norm(x.nombre) === k) || null;
};
const telWa = (t) => {
  let d = String(t || '').replace(/\D/g, '');
  if (d.indexOf('00') === 0) d = d.slice(2);
  if (d.length === 9) d = '34' + d;
  return d;
};
function nombresProv() {
  const ns = proveedores();
  S.proveedores.forEach((x) => {
    if (x.nombre && !ns.some((n) => norm(n) === norm(x.nombre))) ns.push(x.nombre);
  });
  return ns.sort((a, z) => a.localeCompare(z, 'es'));
}
function vProveedores() {
  const ns = nombresProv(),
    cnt = {};
  S.productos.forEach((p) => {
    if (p.proveedor) cnt[p.proveedor] = (cnt[p.proveedor] || 0) + 1;
  });
  $('vista').innerHTML =
    '<div class="bar"><span class="hint grow">Guarda el WhatsApp y el correo de cada proveedor. Se usan en Pedidos para enviarle su parte del pedido.</span></div>' +
    '<form id="form-prov" class="card pv-add" novalidate><div class="field grow"><label for="pv-nuevo">Añadir proveedor</label><input id="pv-nuevo" type="text" autocomplete="off" list="dl-proveedores" placeholder="Nombre"></div><button class="btn" type="submit">Añadir</button></form>' +
    (ns.length
      ? '<section class="card"><div class="pv-lista">' +
        ns
          .map((n, i) => {
            const p = provDe(n) || {};
            return (
              '<div class="pv" data-pv="' +
              esc(n) +
              '"><div class="pv-n"><b>' +
              esc(n) +
              '</b><small>' +
              (cnt[n] ? cnt[n] + (cnt[n] === 1 ? ' producto' : ' productos') : 'sin productos') +
              '</small></div>' +
              '<div class="field"><label for="pv-w' +
              i +
              '">WhatsApp</label><input id="pv-w' +
              i +
              '" type="tel" inputmode="tel" autocomplete="off" data-pvf="whatsapp" placeholder="600 000 000" value="' +
              esc(p.whatsapp || '') +
              '"></div>' +
              '<div class="field"><label for="pv-e' +
              i +
              '">Correo</label><input id="pv-e' +
              i +
              '" type="email" inputmode="email" autocomplete="off" data-pvf="email" placeholder="pedidos@proveedor.com" value="' +
              esc(p.email || '') +
              '"></div>' +
              '<div class="field"><label for="pv-o' +
              i +
              '">Nota (días de reparto, pedido mínimo…)</label><input id="pv-o' +
              i +
              '" type="text" autocomplete="off" data-pvf="nota" value="' +
              esc(p.nota || '') +
              '"></div></div>'
            );
          })
          .join('') +
        '</div></section>'
      : vacio(
          'Aún no hay proveedores',
          'Aparecen solos cuando un producto de Precios tiene proveedor. También puedes añadirlos arriba.',
          '',
        ));
}
function guardaProv(n, campo, valor) {
  let p = provDe(n);
  if (!p) {
    p = nProv({ id: nuevoId('proveedores'), nombre: n });
    S.proveedores.push(p);
  }
  if (campo) p[campo] = valor;
  guardar('proveedores', p, true);
  return p;
}
