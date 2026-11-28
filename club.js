/* ---- Club de socios: alta, tarjeta, preferencias y baja ----
   Página aparte de la app del equipo. No usa analítica ni cookies; solo guarda en el teléfono la clave
   de la tarjeta para volver a verla. */
(() => {
  const VERSION = 'club-0.1';
  const CFG = window.BBC_SUPABASE || {},
    L = CFG.legal || {},
    P = new URLSearchParams(location.search),
    rid = P.get('l') || '',
    origen = P.get('o') || 'web',
    caja = document.getElementById('club'),
    LLAVE = 'bbc-club.' + rid;
  const $ = (i) => document.getElementById(i);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const dato = (v, que) => (v ? esc(v) : '<span class="falta">[' + que + ' pendiente]</span>');
  const clave = (v) => {
    try {
      if (v === undefined) return localStorage.getItem(LLAVE) || '';
      if (v) localStorage.setItem(LLAVE, v);
      else localStorage.removeItem(LLAVE);
    } catch (e) {}
    return v || '';
  };
  const pon = (h) => (caja.innerHTML = h);
  if (CFG.entorno === 'pruebas') $('prueba').hidden = false;
  if (!CFG.url || !window.supabase || !/^[0-9a-f-]{36}$/i.test(rid)) return pon('<h1>Club</h1><p>Este enlace no está completo. Pida el código QR en el restaurante.</p>');
  const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'bbc-club' } });
  const rpc = async (n, a) => {
    const r = await sb.rpc(n, a);
    if (r.error) throw r.error;
    return r.data;
  };
  const marcas = (v) =>
    [
      ['correo', 'Quiero recibir promociones por correo.'],
      ['movil', 'Quiero recibirlas por SMS o WhatsApp.'],
      ['perfil', 'Quiero ofertas según mis gustos y visitas.'],
    ]
      .map((m) => '<label class="marca"><input type="checkbox" id="m-' + m[0] + '"' + (v && v[m[0]] ? ' checked' : '') + '> <span>' + m[1] + '</span></label>')
      .join('');
  const legal = () =>
    '<details class="legal"><summary>Protección de datos y condiciones</summary><ul>' +
    '<li><b>Responsable:</b> ' + dato(L.responsable, 'razón social') + ' · ' + dato(L.cif, 'CIF') + ' · ' + dato(L.direccion, 'domicilio') + '.</li>' +
    '<li><b>Para qué:</b> gestionar su alta en el club y, solo si marca las casillas, enviarle ofertas por el medio elegido o adaptarlas a sus visitas.</li>' +
    '<li><b>Base:</b> su alta (condiciones del club) y su consentimiento para cada tipo de envío. Puede retirarlo cuando quiera.</li>' +
    '<li><b>Quién los recibe:</b> los proveedores técnicos necesarios (base de datos en la Unión Europea). No se venden.</li>' +
    '<li><b>Cuánto tiempo:</b> mientras sea socio. Al darse de baja se borran.</li>' +
    '<li><b>Sus derechos:</b> acceso, rectificación, supresión, oposición, limitación y portabilidad en ' + dato(L.email, 'correo de privacidad') + '. Puede reclamar ante la AEPD (aepd.es).</li>' +
    '<li><b>Condiciones:</b> alta gratuita, para mayores de 18 años, personal e intransferible. Las ventajas se anunciarán antes de su uso.</li></ul></details>';

  async function alta() {
    const i = await rpc('club_info', { p_rid: rid });
    if (!i) return pon('<h1>Club</h1><p>No encuentro ese restaurante.</p>');
    if (!i.abierto) return pon('<h1>Club ' + esc(i.local) + '</h1><p>Todavía no está abierto. ¡Muy pronto!</p>');
    pon(
      '<div><h1>Club ' + esc(i.local) + '</h1><p>Alta gratuita en un minuto.</p></div><form id="f" novalidate>' +
        '<label>Nombre<input id="nombre" autocomplete="given-name" maxlength="80" required></label>' +
        '<label>Correo<input id="correo" type="email" autocomplete="email" maxlength="120" required></label>' +
        '<label>Móvil (opcional)<input id="tel" type="tel" autocomplete="tel" maxlength="20"></label>' +
        '<label>Fecha de nacimiento (opcional)<input id="nac" type="date" autocomplete="bday"></label>' +
        '<label class="marca"><input type="checkbox" id="mayor"> <span>Tengo 18 años o más y acepto las condiciones del club. *</span></label>' +
        marcas() +
        '<button type="submit">Unirme gratis</button><p id="msg" role="alert"></p></form>' +
        legal(),
    );
    $('f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const b = e.target.querySelector('button');
      b.disabled = true;
      $('msg').textContent = '';
      try {
        const r = await rpc('club_alta', {
          p_rid: rid, p_nombre: $('nombre').value, p_correo: $('correo').value, p_movil: $('tel').value || null, p_nacimiento: $('nac').value || null,
          p_mayor: $('mayor').checked, p_condiciones: $('mayor').checked, p_acepta_correo: $('m-correo').checked, p_acepta_movil: $('m-movil').checked, p_acepta_perfil: $('m-perfil').checked,
          p_version: VERSION, p_origen: origen,
        });
        if (!r.ok) {
          b.disabled = false;
          return ($('msg').textContent = r.error);
        }
        clave(r.clave);
        await tarjeta();
      } catch (err) {
        b.disabled = false;
        $('msg').textContent = 'No se ha podido completar el alta. Revise la conexión.';
      }
    });
  }
  async function tarjeta(aviso) {
    const f = await rpc('club_ficha', { p_clave: clave() });
    if (!f) {
      clave('');
      return alta();
    }
    pon(
      '<div class="tarjeta"><h2>Club ' + esc(f.local) + '</h2><div class="numero">' + String(f.numero).padStart(6, '0') + '</div><div>' + esc(f.nombre) + ' · Socio gratuito</div></div>' +
        '<form id="p"><h2>Mis avisos</h2>' + marcas(f) + '<button type="submit">Guardar</button><p id="msg" role="status">' + esc(aviso || '') + '</p></form>' +
        '<button type="button" class="suave" id="baja">Darme de baja y borrar mis datos</button>' +
        legal(),
    );
    if (!f.tiene_movil) $('m-movil').disabled = true;
    $('p').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await rpc('club_preferencias', { p_clave: clave(), p_correo: $('m-correo').checked, p_movil: $('m-movil').checked, p_perfil: $('m-perfil').checked });
        await tarjeta('Guardado.');
      } catch (err) {
        $('msg').textContent = 'No se ha podido guardar.';
      }
    });
    $('baja').addEventListener('click', async () => {
      if (!window.confirm('Se borrarán sus datos del club. ¿Seguir?')) return;
      try {
        await rpc('club_baja', { p_clave: clave() });
        clave('');
        pon('<h1>Baja hecha</h1><p>Hemos borrado sus datos del club. Gracias.</p>');
      } catch (err) {
        $('msg').textContent = 'No se ha podido completar la baja.';
      }
    });
  }
  (clave() ? tarjeta() : alta()).catch(() => pon('<h1>Club</h1><p>Ahora mismo no se puede abrir. Inténtelo más tarde.</p>'));
})();
