/* ---- Textos legales: privacidad, términos, cookies, aviso legal, proveedores y licencias ----
   Los datos de la empresa salen de config.js (CFG.legal), así se ven también antes de entrar.
   Si cambias algo importante de estos textos, sube LEGAL_V: a todos se les pedirá aceptarlo otra vez
   y queda registrado quién lo aceptó y cuándo (tabla «aceptaciones», script 9). */
const LEGAL_V = '3.0';
const LEGAL_FECHA = '24 de noviembre de 2026';
const LG = () => {
  const L = (typeof CFG !== 'undefined' && CFG && CFG.legal) || {},
    f = (v, txt) => (v ? esc(v) : '<span class="lg-falta">[' + txt + ']</span>');
  return {
    titular: f(L.responsable, 'razón social de la empresa'),
    cif: f(L.cif, 'NIF/CIF'),
    dir: f(L.direccion, 'domicilio social'),
    email: f(L.email, 'correo de contacto'),
    tel: L.telefono ? esc(L.telefono) : '',
    registro: L.registro ? esc(L.registro) : '',
    region: esc(L.region || 'la Unión Europea'),
    app: esc(L.app || 'la aplicación de gestión de cocina de Boom Boom Ciao'),
  };
};
const LEGAL_DOCS = {
  privacidad: [
    'Privacidad',
    (d) =>
      '<p class="hint">Versión ' + LEGAL_V + ' · ' + LEGAL_FECHA + '</p>' +
      '<h3>Quién trata tus datos</h3><p>' + d.titular + ' (NIF ' + d.cif + '), con domicilio en ' + d.dir + '. Contacto para privacidad: ' + d.email + (d.tel ? ' · ' + d.tel : '') + '.</p>' +
      '<h3>Qué datos guardamos y para qué</h3><ul>' +
      '<li><b>Tu cuenta:</b> nombre, usuario (o correo si lo elegiste) y contraseña cifrada. Para que puedas entrar y para saber quién hace cada cosa.</li>' +
      '<li><b>Tu trabajo en la app:</b> lo que creas, cambias o eliminas (fichas, compras, registros de APPCC, mermas, tareas, etiquetas) con fecha y autor. Lo exige el control de seguridad alimentaria y la organización de la cocina.</li>' +
      '<li><b>Fotos y documentos</b> que subes (limpieza, albaranes). Pueden salir personas por casualidad: haz las fotos a la zona, no a compañeros.</li>' +
      '<li><b>Turnos y horarios</b> del equipo, si el restaurante los sube.</li>' +
      '<li><b>Registro de aceptación</b> de estos textos (qué versión y cuándo).</li></ul>' +
      '<p>No pedimos datos de salud, bancarios, de localización ni tu correo si no quieres darlo. No hay publicidad, no vendemos datos y no hacemos perfiles.</p>' +
      '<h3>Base legal</h3><p>La relación laboral o de servicio con la empresa (art. 6.1.b RGPD), las obligaciones legales de higiene y trazabilidad de alimentos (art. 6.1.c) y el interés legítimo en organizar la cocina (art. 6.1.f).</p>' +
      '<h3>Inteligencia artificial</h3><p>El asistente y la lectura de albaranes usan la API de Gemini de Google. Solo se le envía lo necesario para cada consulta (la pregunta, datos de cocina y la foto o PDF que escaneas). Se usa el servicio de pago de la API, en cuyas condiciones Google no usa estos datos para entrenar sus modelos. Nosotros tampoco entrenamos ninguna IA con tus datos. Revisa siempre lo que propone la IA antes de guardarlo.</p>' +
      '<h3>Cuánto tiempo se guardan</h3><ul>' +
      '<li>Fotos de limpieza: 24 h (el restaurante puede subirlo a 48 h). Después se borran solas; queda el registro (zona, hora y quién).</li>' +
      '<li>Albaranes (fotos y PDF): los días que fije el restaurante en Compras (30 por defecto) y siempre después de descargar el ZIP del mes.</li>' +
      '<li>Lo que se elimina en la app: 90 días (para poder recuperarlo), luego se borra del todo.</li>' +
      '<li>Historial de cambios: 2 años. Copias de seguridad automáticas: 30 días.</li>' +
      '<li>Contadores de uso de la IA: 13 meses. Etiquetas en cola de impresión: 7 días. Intentos de acceso: 1 día.</li>' +
      '<li>Tu cuenta: mientras trabajes con nosotros. Si la eliminas o te dan de baja, se borra; lo que registraste para el APPCC se conserva sin tu nombre de usuario el tiempo que exija la normativa.</li></ul>' +
      '<h3>Quién más los ve</h3><p>Solo las personas de tu restaurante, según su rango (el equipo no ve precios ni costes). Y los proveedores técnicos de la pestaña «Proveedores», que los tratan por encargo nuestro y con contrato de encargo del tratamiento.</p>' +
      '<h3>Tus derechos</h3><p>Puedes ver, corregir, descargar y eliminar tus datos tú mismo en <b>Menú › Mi cuenta</b>. También puedes pedir limitación u oposición escribiendo a ' + d.email + '. Si no quedas conforme, puedes reclamar a la Agencia Española de Protección de Datos (www.aepd.es).</p>' +
      '<h3>Seguridad</h3><p>Conexión cifrada (HTTPS), contraseñas cifradas, cada restaurante solo ve sus datos (seguridad por filas en la base de datos), cada uno solo borra lo que subió y queda registro de los cambios.</p>',
  ],
  terminos: [
    'Términos de uso',
    (d) =>
      '<p class="hint">Versión ' + LEGAL_V + ' · ' + LEGAL_FECHA + '</p>' +
      '<h3>Qué es</h3><p>' + d.app + ' es una herramienta interna de ' + d.titular + ' para escandallos, compras, inventario, APPCC, etiquetas, tareas y turnos.</p>' +
      '<h3>Tu cuenta</h3><ul><li>Es personal: no compartas tu usuario ni tu contraseña. Guarda tu código de recuperación.</li><li>Lo que haces queda a tu nombre. No subas cosas a nombre de otra persona.</li><li>El dueño o el encargado aprueban tu acceso, deciden tu área (cocina o barra) y pueden darte de baja.</li></ul>' +
      '<h3>Uso correcto</h3><ul><li>Los datos de costes, precios, proveedores y recetas son confidenciales de la empresa: no los copies ni los compartas fuera.</li><li>No subas fotos de personas, datos de clientes ni contenido que no sea del trabajo.</li><li>No intentes acceder a lo que tu rango no permite ni sobrecargar el sistema.</li></ul>' +
      '<h3>La IA y los cálculos</h3><p>Los cálculos de costes y la lectura de albaranes son una ayuda: revísalos antes de tomar decisiones. Las etiquetas y registros de APPCC son responsabilidad de quien los hace y de la empresa.</p>' +
      '<h3>Disponibilidad</h3><p>Intentamos que la app funcione siempre, pero dependemos de internet y de proveedores externos, así que <b>no garantizamos un servicio sin cortes</b>. Puede haber paradas por mantenimiento, normalmente fuera del horario de servicio. Si no hay conexión, la app sigue abriendo con los últimos datos y guarda lo que hagas para subirlo después. Hay copias automáticas diarias durante 30 días.</p>' +
      '<h3>Responsabilidad</h3><p>La empresa no responde de daños por un uso contrario a estos términos ni por cortes de proveedores externos, salvo lo que no se pueda excluir por ley.</p>' +
      '<h3>Cambios</h3><p>Si cambian estos términos te lo pediremos aceptar de nuevo al entrar. La ley aplicable es la española.</p>',
  ],
  cookies: [
    'Cookies',
    () =>
      '<p>Esta app <b>no usa cookies de publicidad, de análisis ni rastreadores de terceros</b>, y no carga nada de otras webs (ni fuentes de Google, ni estadísticas).</p>' +
      '<p>Solo guarda en tu dispositivo lo imprescindible para funcionar, que la ley permite sin pedir consentimiento (art. 22.2 LSSI):</p><ul>' +
      '<li><b>Sesión:</b> para que no tengas que entrar cada vez (lo gestiona Supabase en el almacenamiento del navegador).</li>' +
      '<li><b>Preferencias:</b> tema claro u oscuro, último restaurante, formato de etiqueta, avisos vistos.</li>' +
      '<li><b>Datos sin conexión:</b> una copia de los datos de tu restaurante y la propia app, para abrir rápido y trabajar sin internet.</li></ul>' +
      '<p>Se borran al salir de tu cuenta o al limpiar los datos del navegador. Si algún día se añadiera algo opcional (por ejemplo, estadísticas), no se activaría hasta que lo aceptes.</p>',
  ],
  aviso: [
    'Aviso legal',
    (d) =>
      '<h3>Titular</h3><p>' + d.titular + ' · NIF ' + d.cif + ' · ' + d.dir + (d.registro ? ' · ' + d.registro : '') + '. Contacto: ' + d.email + (d.tel ? ' · ' + d.tel : '') + '.</p>' +
      '<h3>Propiedad intelectual</h3><p>El diseño y el código de la app son de su titular. Las librerías, fuentes e iconos de terceros se usan con sus licencias (pestaña «Licencias»). Los logotipos de marcas solo se usan con permiso de su dueño.</p>' +
      '<h3>Reclamaciones de derechos de autor</h3><p>Si crees que algo de la app (una foto, un texto, una receta) infringe tus derechos, escribe a ' + d.email + ' con el asunto «Derechos de autor»: qué contenido es, dónde aparece, por qué es tuyo y tus datos de contacto. Lo revisaremos y, si procede, lo retiraremos en un plazo máximo de 10 días hábiles.</p>' +
      '<h3>Certificaciones</h3><p>No declaramos certificaciones de seguridad (como SOC 2 o ISO 27001) que no tenemos. Las medidas de seguridad reales se explican en «Privacidad».</p>',
  ],
  proveedores: [
    'Proveedores',
    (d) =>
      '<p>Empresas que tratan datos por encargo nuestro, solo para prestar el servicio:</p><ul>' +
      '<li><b>Supabase</b> (Supabase Inc.): base de datos, cuentas, archivos y funciones del servidor. Servidores en ' + d.region + '. Contrato de encargo (DPA) de Supabase.</li>' +
      '<li><b>Google</b> (Google Cloud EMEA / Google LLC): API de Gemini para el asistente y la lectura de albaranes, recetas y horarios. Servicio de pago, sin uso de datos para entrenamiento. Puede implicar transferencias internacionales con cláusulas contractuales tipo y el Marco de Privacidad de Datos UE-EE. UU.</li>' +
      '<li><b>GitHub</b> (GitHub Inc.): alojamiento de los archivos de la app (no guarda datos del restaurante).</li>' +
      (typeof CFG !== 'undefined' && CFG && CFG.turnstile ? '<li><b>Cloudflare</b> (Cloudflare Inc.): comprobación contra robots al crear una cuenta (Turnstile). Solo en esa pantalla.</li>' : '') +
      '</ul>' +
      '<p>No hay otros servicios: ni estadísticas, ni publicidad, ni redes sociales. Si el restaurante conecta una impresora con el puente de impresión, ese ordenador es del propio restaurante.</p>',
  ],
  licencias: [
    'Licencias',
    () =>
      '<p>La app usa estas piezas de código abierto, que se pueden usar en programas comerciales cumpliendo su licencia (se incluye el aviso de copyright):</p><ul>' +
      '<li><b>supabase-js</b> · MIT · © Supabase</li>' +
      '<li><b>SheetJS Community Edition</b> (leer y crear Excel) · Apache 2.0 · © SheetJS LLC</li>' +
      '<li><b>PDF.js</b> (leer PDF) · Apache 2.0 · © Mozilla Foundation</li>' +
      '<li><b>Plus Jakarta Sans</b> · SIL Open Font License 1.1 · © The Plus Jakarta Sans Project Authors</li>' +
      '<li><b>Bricolage Grotesque</b> · SIL Open Font License 1.1 · © The Bricolage Grotesque Project Authors</li></ul>' +
      '<p>Los iconos y el resto del código son propios. Los textos completos de las licencias están en la carpeta <code>vendor/licencias</code> de la app.</p>',
  ],
};
let legalTab = 'privacidad';
function verLegal(tab) {
  if (tab && LEGAL_DOCS[tab]) legalTab = tab;
  const d = LG();
  capa(
    capaTop('Privacidad y términos', 'Versión ' + LEGAL_V + ' · ' + LEGAL_FECHA) +
      '<div class="seg lg-tabs" role="tablist" aria-label="Documentos">' +
      Object.keys(LEGAL_DOCS).map((k) => '<button type="button" role="tab" data-lg="' + k + '" aria-selected="' + (k === legalTab) + '" aria-pressed="' + (k === legalTab) + '">' + LEGAL_DOCS[k][0] + '</button>').join('') +
      '</div><div class="mx-lista legal" role="tabpanel">' + LEGAL_DOCS[legalTab][1](d) + '</div>',
  );
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-lg]');
  if (b) verLegal(b.dataset.lg);
});

/* ---- Aviso de cookies (informativo: no hay nada opcional que aceptar o rechazar) ---- */
function avisoCookies() {
  if (mem('bbc.cookies') === LEGAL_V || $('aviso-cookies')) return;
  const a = document.createElement('div');
  a.id = 'aviso-cookies';
  a.setAttribute('role', 'region');
  a.setAttribute('aria-label', 'Aviso sobre cookies');
  a.innerHTML =
    '<p><b>Sin cookies de publicidad ni rastreadores.</b> Solo guardamos en tu dispositivo lo imprescindible para que la app funcione (tu sesión, tus preferencias y los datos para trabajar sin conexión).</p>' +
    '<div class="acciones"><button class="btn primary" type="button" data-ck="ok">Entendido</button><button class="link" type="button" data-ck="ver">Ver la política de cookies</button></div>';
  a.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ck]');
    if (!b) return;
    if (b.dataset.ck === 'ver') verLegal('cookies');
    mem('bbc.cookies', LEGAL_V);
    a.remove();
  });
  document.body.appendChild(a);
}
setTimeout(avisoCookies, 600);

/* ---- Casilla de aceptación (sin marcar) para crear cuenta ---- */
const casillaLegalHTML = () =>
  '<label class="check ac-legal"><input type="checkbox" id="ac-legal"> He leído y acepto los <button class="link" type="button" data-lg-abrir="terminos">términos de uso</button> y la <button class="link" type="button" data-lg-abrir="privacidad">política de privacidad</button>.</label>';
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-lg-abrir]');
  if (!b) return;
  e.preventDefault();
  verLegal(b.dataset.lgAbrir);
});
/* Tras entrar: si no consta que esta persona aceptó la versión actual, se le pide (una vez por versión) */
async function comprobarLegal() {
  if (!sb || !yo) return;
  try {
    if (mem('bbc.legalPend') === LEGAL_V) {
      const r = await sb.rpc('aceptar_legal', { p_version: LEGAL_V });
      if (!r.error) mem('bbc.legalPend', '');
      return;
    }
    if (mem('bbc.legalOk.' + yo.id) === LEGAL_V) return;
    const q = await sb.rpc('legal_aceptado', { p_version: LEGAL_V });
    if (q.error) return; // script 9 sin ejecutar: no se bloquea a nadie
    if (q.data === true) {
      mem('bbc.legalOk.' + yo.id, LEGAL_V);
      return;
    }
    pedirLegal();
  } catch (e) {}
}
function pedirLegal() {
  capa(
    '<div class="mx-top"><div><h2>Términos y privacidad</h2><p class="hint">Versión ' + LEGAL_V + '. Para seguir usando la app, léelos y acéptalos.</p></div></div>' +
      '<div class="col"><p>Hemos actualizado los términos de uso y la política de privacidad: qué datos se guardan, cuánto tiempo, qué proveedores intervienen y cómo descargar o borrar los tuyos.</p>' +
      ['terminos', 'privacidad', 'proveedores'].map((k) => '<details class="lg-d"><summary>' + LEGAL_DOCS[k][0] + '</summary><div class="legal">' + LEGAL_DOCS[k][1](LG()) + '</div></details>').join('') +
      '<label class="check"><input type="checkbox" id="lg-acepto"> He leído y acepto los términos de uso y la política de privacidad.</label>' +
      '<div class="acciones"><button class="btn primary" type="button" id="lg-ok" disabled>Aceptar y seguir</button><button class="link" type="button" id="lg-salir">Salir de mi cuenta</button></div><p class="hint" id="lg-msg" aria-live="polite"></p></div>',
  );
  const b = $('capa').querySelector('[data-capa="cerrar"]');
  if (b) b.remove();
  $('lg-acepto').addEventListener('change', (e) => ($('lg-ok').disabled = !e.target.checked));
  $('lg-salir').addEventListener('click', () => {
    cerrarCapa();
    salirNube();
  });
  $('lg-ok').addEventListener('click', async () => {
    $('lg-ok').disabled = true;
    const r = await sb.rpc('aceptar_legal', { p_version: LEGAL_V });
    if (r.error) {
      $('lg-msg').textContent = 'No se pudo guardar. Revisa la conexión y vuelve a intentarlo.';
      $('lg-ok').disabled = false;
      return;
    }
    mem('bbc.legalOk.' + yo.id, LEGAL_V);
    pedirLegalAbierto = false;
    cerrarCapa();
    toast('Gracias. Queda registrado.');
  });
  pedirLegalAbierto = true;
}
let pedirLegalAbierto = false;
