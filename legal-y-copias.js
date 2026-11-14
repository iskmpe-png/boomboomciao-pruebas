/* ---- Capa común: aviso legal, copias automáticas ---- */
function capa(html) {
  menu(false);
  const c = $('capa');
  c.innerHTML = html;
  c.hidden = false;
  document.body.style.overflow = 'hidden';
  const b = c.querySelector('[data-capa="cerrar"]');
  if (b) b.focus({ preventScroll: true });
}
function cerrarCapa() {
  $('capa').hidden = true;
  $('capa').innerHTML = '';
  if ($('acceso').hidden) document.body.style.overflow = '';
}
const capaTop = (t, s) =>
  '<div class="mx-top"><div><h2>' +
  esc(t) +
  '</h2>' +
  (s ? '<p class="hint">' + esc(s) + '</p>' : '') +
  '</div><button class="btn" type="button" data-capa="cerrar">Cerrar</button></div>';
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('capa').hidden) cerrarCapa();
});
function verLegal() {
  const L = (CFG && CFG.legal) || {},
    resp = L.responsable || 'la empresa titular del restaurante',
    falta = (v) => v || 'pendiente de completar';
  capa(
    capaTop('Aviso legal y privacidad', 'Cómo se tratan tus datos en esta aplicación') +
      '<div class="mx-lista legal">' +
      '<h3>Quién es el responsable</h3><p>' +
      esc(resp) +
      (L.cif ? ' · NIF ' + esc(L.cif) : '') +
      '. Dirección: ' +
      esc(falta(L.direccion)) +
      '. Contacto para privacidad: ' +
      esc(falta(L.email)) +
      '.</p>' +
      '<h3>Qué datos se guardan</h3><p>Tu nombre, tu correo y tu contraseña (cifrada, nadie puede leerla). También queda registro de lo que haces en la app: qué creas, cambias o eliminas y cuándo. La app no pide ni guarda datos de salud, bancarios ni de localización.</p>' +
      '<h3>Para qué se usan</h3><p>Para darte acceso, saber quién ha hecho cada cambio y gestionar la cocina: costes, compras, inventario, mermas y registros de seguridad alimentaria. No se usan para publicidad ni se venden a nadie.</p>' +
      '<h3>Con qué base legal</h3><p>La gestión de la relación laboral y el interés legítimo de la empresa en organizar y controlar su actividad.</p>' +
      '<h3>Quién más interviene</h3><p>Proveedores técnicos que prestan servicio a la empresa: Supabase (base de datos y cuentas' +
      (L.region ? ', con servidores en ' + esc(L.region) : '') +
      '), GitHub (alojamiento de la aplicación) y Google (asistente y lectura de albaranes; solo recibe los datos de cocina que se le consultan y las fotos de albaranes que se escanean).</p>' +
      '<h3>Cuánto tiempo</h3><p>Mientras tengas acceso a la aplicación. Cuando dejes de tenerlo, tu cuenta se elimina; el registro de cambios se conserva el tiempo necesario para las obligaciones de la empresa.</p>' +
      '<h3>Tus derechos</h3><p>Puedes pedir acceso a tus datos, corregirlos, eliminarlos, limitar su uso u oponerte, escribiendo al contacto de privacidad. Si no quedas conforme, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>' +
      '<h3>Uso de la aplicación</h3><p>La cuenta es personal: no compartas tu contraseña. Los datos de costes, precios y proveedores son confidenciales de la empresa y no deben copiarse fuera de ella.</p></div>',
  );
}
/* Copias automáticas (una al día, guardadas 30 días) */
let copias = null;
function verCopias(msg) {
  capa(
    capaTop('Copias automáticas', 'Se guarda una copia al día y se conservan 30 días') +
      '<div class="mx-lista">' +
      (!copias
        ? '<p class="hint" style="padding:12px 0">Cargando…</p>'
        : copias.length
          ? copias
              .map(
                (c) =>
                  '<div class="us-it"><span class="us-n"><b>' +
                  esc(fFecha(c.dia)) +
                  '</b><small>' +
                  c.registros +
                  ' registros</small></span><button class="btn small" type="button" data-capa="cp-bajar" data-id="' +
                  c.id +
                  '">Descargar</button><button class="btn small" type="button" data-capa="cp-restaurar" data-id="' +
                  c.id +
                  '">Restaurar</button></div>',
              )
              .join('')
          : '<p class="hint" style="padding:12px 0">Todavía no hay copias. La primera se hace hoy.</p>') +
      '</div>' +
      '<p class="hint">Restaurar devuelve cada registro a como estaba ese día. Lo creado después no se borra. Descarga una copia de vez en cuando y guárdala fuera, por si un día falla el servicio.</p><p class="hint" id="cp-msg" role="status">' +
      esc(msg || '') +
      '</p>',
  );
  if (!copias)
    sb.from('copias')
      .select('id,dia,registros')
      .eq('restaurante_id', rid)
      .order('dia', { ascending: false })
      .limit(40)
      .then(
        (q) => {
          copias = q.error ? [] : q.data || [];
          if (!$('capa').hidden)
            verCopias(
              q.error
                ? /copias|relation|schema/i.test(q.error.message || '')
                  ? 'Falta activar las copias: ejecuta en Supabase el tercer script.'
                  : errTxt(q.error)
                : '',
            );
        },
        () => {
          copias = [];
          verCopias('Sin conexión.');
        },
      );
}
const copiaDatos = (id) =>
  sb
    .from('copias')
    .select('dia,datos')
    .eq('id', id)
    .limit(1)
    .then((q) => {
      if (q.error || !q.data || !q.data[0]) throw q.error || new Error('No se encontró la copia.');
      return q.data[0];
    });
$('capa').addEventListener('click', (e) => {
  const b = e.target.closest('[data-capa]');
  if (!b) return;
  const a = b.dataset.capa,
    m = (t) => {
      const el = $('cp-msg');
      if (el) el.textContent = t;
    };
  if (a === 'cerrar') cerrarCapa();
  else if (a === 'cp-bajar') {
    m('Preparando…');
    copiaDatos(b.dataset.id)
      .then((c) => {
        const d = {};
        COLS.forEach((k) => {
          d[k] = [];
        });
        (c.datos || []).forEach((x) => {
          if (x.col === 'ajustes') d.ajustes = x.data;
          else if (d[x.col]) d[x.col].push(Object.assign({}, x.data, { id: x.id }));
        });
        m('');
        return entregar(
          new Blob([JSON.stringify({ app: 'boomboomciao', version: 1, fecha: c.dia, datos: d })], {
            type: 'application/json',
          }),
          'BoomBoomCiao-copia-' + c.dia + '.json',
        );
      })
      .catch((er) => m(errTxt(er)));
  } else if (a === 'cp-restaurar') {
    if (!confirmar(b, '¿Seguro? Pulsa otra vez')) return;
    m('Restaurando…');
    copiaDatos(b.dataset.id)
      .then((c) =>
        db
          .lote(
            (c.datos || [])
              .filter((x) => x && x.col && x.id && (x.col === 'ajustes' || NORM[x.col]))
              .map((x) => [x.col, String(x.id), x.data || {}]),
          )
          .then(() => {
            cerrarCapa();
            toast('Datos restaurados a la copia del ' + fFecha(c.dia) + '.');
          }),
      )
      .catch((er) => m(errTxt(er)));
  }
});
function copiaDeHoy() {
  if (!sb || sinRed) return;
  const k = 'bbc.copia.' + rid,
    h = hoy();
  if (mem(k) === h) return;
  sb.rpc('copia_diaria', { p_rid: rid }).then(
    (q) => {
      if (!q.error) mem(k, h);
    },
    () => {},
  );
}
