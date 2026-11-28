/* ---- Club de socios, visto por dirección (usuario maestro) ----
   Abrir o cerrar el alta, el QR para mesas y redes, y quién se ha apuntado (script 013). */
const CL = { d: null, leido: 0 };
const errCl = (e) => (/does not exist|schema cache|PGRST20|42P01/i.test((e && (e.message || e.code)) || '') ? 'Falta instalar el script 013 en la base de datos.' : errTxt(e));
const enlaceClub = (origen) => new URL('club.html?l=' + rid + '&o=' + origen, location.href.split('#')[0]).href;
async function leerClub() {
  const [c, l] = await Promise.all([
    sb.from('club_config').select('abierto').eq('restaurante_id', rid).maybeSingle(),
    todas(() => sb.from('club_socios').select('id,numero,nombre,correo,movil,acepta_correo,acepta_movil,acepta_perfil,origen,creado,confirmado').eq('restaurante_id', rid).order('numero', { ascending: false })),
  ]);
  if (c.error) throw c.error;
  CL.d = { abierto: !!(c.data && c.data.abierto), socios: l };
  CL.leido = Date.now();
}
function clubHTML() {
  const d = CL.d;
  if (!d) return '<section class="card estado"><strong>Cargando el club…</strong></section>';
  const si = (k) => d.socios.filter((s) => s[k]).length,
    falta = !(CFG && CFG.legal && CFG.legal.responsable && CFG.legal.email);
  return (
    (falta ? '<p class="est mal">Antes de apuntar a clientes de verdad faltan los datos legales de la empresa, el delegado de datos y la confirmación por correo</p>' : '') +
    '<section class="card hoy-turno"><div><span class="rotulo">Alta de socios</span><span class="cifra">' + (d.abierto ? 'Abierta' : 'Cerrada') + '</span></div><button class="btn ' + (d.abierto ? 'danger' : 'oro') + '" type="button" data-cl="abrir" data-v="' + (d.abierto ? '0' : '1') + '">' + (d.abierto ? 'Cerrar el alta' : 'Abrir el alta') + '</button></section>' +
    '<div class="hoy-dos"><div class="loseta marino"><span>Socios</span><b>' + d.socios.length + '</b></div><div class="loseta oro"><span>Aceptan correo</span><b>' + si('acepta_correo') + '</b></div></div>' +
    '<section class="card col"><h3>QR para las mesas</h3><div id="cl-qr" style="width:min(260px,100%);background:#fff;padding:12px;border-radius:18px"></div>' +
    '<div class="acciones"><a class="btn small" href="' + esc(enlaceClub('mesa')) + '" target="_blank" rel="noopener">Abrir la página</a><button class="btn small" type="button" data-cl="copiar" data-o="redes">Copiar enlace para redes</button></div></section>' +
    '<section class="card"><h3>Últimas altas</h3><ul class="fich-lista">' +
    (d.socios.slice(0, 50).map((s) => '<li><span><b>' + String(s.numero).padStart(6, '0') + ' · ' + esc(s.nombre) + '</b><small>' + esc(s.correo) + ' · ' + diaTxt(diaMad(s.creado)) + ' · ' + esc(s.origen) + '</small></span><span class="est ' + (s.confirmado ? 'ok">Confirmado' : 'aviso">Sin confirmar') + '</span></li>').join('') || '<li><span class="hint">Aún no hay socios.</span></li>') +
    '</ul></section><p class="hint">No envíe promociones a correos sin confirmar. El envío y la confirmación llegarán con el proveedor de correo.</p>' +
    '<p class="hint" id="fi-msg" role="status"></p>'
  );
}
async function pintaClub() {
  ponPantalla('club', clubHTML());
  const o = $('cl-qr');
  if (!o || o.firstChild) return;
  try {
    await cargarLib('qrcode-generator.js?v=40', 'qrcode');
    const q = window.qrcode(0, 'M');
    q.addData(enlaceClub('mesa'));
    q.make();
    if ($('cl-qr')) $('cl-qr').innerHTML = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  } catch (e) {}
}
function vClub() {
  if (!hayFichaje()) return sinNube('club');
  if (!esMaestro()) return ponPantalla('club', '<section class="card estado"><strong>Solo el usuario maestro</strong></section>');
  pintaClub();
  if (CL.d && Date.now() - CL.leido < 15000) return;
  leerClub()
    .then(() => {
      if (pant === 'club') pintaClub();
    })
    .catch((e) => ponPantalla('club', '<section class="card estado"><strong>No se pudo cargar el club</strong><span>' + esc(errCl(e)) + '</span></section>'));
}
$('vista').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-cl]');
  if (!b) return;
  if (b.dataset.cl === 'copiar') {
    const u = enlaceClub(b.dataset.o);
    navigator.clipboard.writeText(u).then(
      () => toast('Enlace copiado.'),
      () => window.prompt('Copia este enlace', u),
    );
    return;
  }
  const abrir = b.dataset.v === '1';
  if (abrir && !window.confirm('Cualquiera con el enlace podrá apuntarse. ¿Abrir el alta?')) return;
  const r = await sb.rpc('club_abrir', { p_rid: rid, p_abierto: abrir });
  if (r.error) return toast(errCl(r.error));
  CL.leido = 0;
  pintar();
});
