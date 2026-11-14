/* ---- Pedido general: se arma una vez y se envía a cada proveedor por separado ---- */
let pedido = null;
const pedEnv = {};
const pedCarga = () => {
  if (!pedido) {
    try {
      pedido = JSON.parse(mem('bbc.pedido.' + (rid || '')) || '{}') || {};
    } catch (e) {
      pedido = {};
    }
  }
  return pedido;
};
const pedGuarda = () => mem('bbc.pedido.' + (rid || ''), JSON.stringify(pedido));
const pedLineas = () =>
  Object.keys(pedCarga())
    .map((id) => ({ p: prod(id), q: Number(pedido[id]) || 0 }))
    .filter((x) => x.p && x.q > 0)
    .sort((a, z) => a.p.nombre.localeCompare(z.p.nombre, 'es'));
const pedGrupos = () => {
  const g = {};
  pedLineas().forEach((x) => {
    const k = x.p.proveedor || 'Sin proveedor';
    (g[k] || (g[k] = [])).push(x);
  });
  return g;
};
const pedTexto = (ls) =>
  ['Hola, pedido de ' + casa() + ' (' + fFecha(hoy()) + '):', '']
    .concat(
      ls.map((x) => '- ' + x.p.nombre + ': ' + fNum(x.q, 2) + ' ' + UDI[x.p.unidad]),
      ['', 'Gracias.'],
    )
    .join('\n');
function vPedidos() {
  const g = pedGrupos(),
    ks = Object.keys(g).sort((a, z) => a.localeCompare(z, 'es')),
    falta = porPedir(),
    n = pedLineas().length;
  $('vista').innerHTML =
    '<div class="bar"><span class="hint grow">Arma el pedido general y envía a cada proveedor solo su parte.</span>' +
    (falta.length
      ? '<button class="btn" type="button" data-act="ped-falta">Añadir lo que falta (' + falta.length + ')</button>'
      : '') +
    (n ? '<button class="btn" type="button" data-act="ped-vaciar">Vaciar</button>' : '') +
    expHTML() +
    '</div>' +
    '<form id="form-ped" class="card pv-add" novalidate data-libre><div class="field grow"><label for="ped-prod">Producto</label><input id="ped-prod" type="text" list="dl-solo-prod" autocomplete="off" placeholder="Escribe para buscar"></div>' +
    '<div class="field" style="flex:0 1 110px"><label for="ped-cant">Cantidad</label><input id="ped-cant" class="num" type="text" inputmode="decimal" autocomplete="off"></div><button class="btn primary" type="submit">Añadir</button></form>' +
    (ks.length
      ? ks
          .map((k) => {
            const c = provDe(k) || {},
              tx = encodeURIComponent(pedTexto(g[k])),
              wa = telWa(c.whatsapp),
              as = encodeURIComponent('Pedido ' + casa() + ' · ' + fFecha(hoy()));
            return (
              '<section class="card" data-libre><div class="acciones" style="justify-content:space-between"><h2>' +
              esc(k) +
              '</h2>' +
              (pedEnv[k] ? '<span class="pill ok">Enviado</span>' : '') +
              '</div>' +
              '<p class="hint">' +
              (c.whatsapp || c.email
                ? esc(
                    [c.whatsapp ? 'WhatsApp ' + c.whatsapp : '', c.email || '', c.nota || '']
                      .filter(Boolean)
                      .join(' · '),
                  )
                : 'Sin contacto guardado. <a href="#almacen-proveedores">Añádelo en Proveedores</a> para enviarle el pedido directo.') +
              '</p>' +
              '<div class="rows">' +
              g[k]
                .map(
                  (x) =>
                    '<div class="row"><div class="n"><b>' +
                    esc(x.p.nombre) +
                    '</b></div><div class="d ped-d"><input class="num" type="text" inputmode="decimal" aria-label="Cantidad de ' +
                    esc(x.p.nombre) +
                    '" data-ped="' +
                    esc(x.p.id) +
                    '" value="' +
                    fNum(x.q, 2) +
                    '"><span>' +
                    UDI[x.p.unidad] +
                    '</span><button class="icon" type="button" data-act="ped-quitar" data-id="' +
                    esc(x.p.id) +
                    '" aria-label="Quitar ' +
                    esc(x.p.nombre) +
                    '" style="width:34px;height:34px">×</button></div></div>',
                )
                .join('') +
              '</div>' +
              '<div class="acciones"><a class="btn primary small" target="_blank" rel="noopener" data-env="' +
              esc(k) +
              '" href="https://wa.me/' +
              wa +
              '?text=' +
              tx +
              '">' +
              (wa ? 'Enviar por WhatsApp' : 'WhatsApp (elegir chat)') +
              '</a>' +
              (c.email
                ? '<a class="btn small" data-env="' +
                  esc(k) +
                  '" href="mailto:' +
                  encodeURIComponent(c.email).replace(/%40/g, '@') +
                  '?subject=' +
                  as +
                  '&body=' +
                  tx +
                  '">Enviar por correo</a>'
                : '') +
              '<button class="btn small" type="button" data-act="ped-copiar" data-k="' +
              esc(k) +
              '">Copiar texto</button></div></section>'
            );
          })
          .join('')
      : vacio(
          'El pedido está vacío',
          'Añade productos arriba' +
            (falta.length ? ' o pulsa «Añadir lo que falta» para traer lo que está por debajo del stock mínimo' : '') +
            '. Después envía a cada proveedor su parte por WhatsApp o correo.',
          '',
        ));
}
