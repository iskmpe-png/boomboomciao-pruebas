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
  if (e.key === 'Escape' && !$('capa').hidden && !(typeof pedirLegalAbierto !== 'undefined' && pedirLegalAbierto)) cerrarCapa();
});
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
