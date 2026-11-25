/* Boom Boom Ciao · analítica mínima con PostHog (UE), sin cookies ni almacenamiento.
   Envía: vista de página, errores de JavaScript y promesas rechazadas.
   No envía datos personales ni contenido de recetas: solo la ruta, el entorno y el error.
   Para desactivarla, quita la línea <script src="analitica.js"> de index.html. */
(function () {
  'use strict';
  var CLAVE = 'phc_AMzaxKuPnJJtEC6N5QxNChDyaYpGXnQjCNiG6LAh6bLP'; // clave pública de proyecto (no es secreta)
  var DESTINO = 'https://eu.i.posthog.com/i/v0/e/';
  // Identificador anónimo que solo vive en memoria: cambia en cada carga de la app.
  var id = 'anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  var enviados = 0;

  // El entorno lo dice config.js, que carga después (defer): se lee en el momento de enviar.
  function entorno() {
    var cfg = window.BBC_SUPABASE || {};
    if (cfg.entorno) return cfg.entorno;
    return /pruebas/.test(location.pathname) ? 'pruebas' : 'produccion';
  }

  function enviar(evento, props) {
    if (enviados++ > 50) return; // evita inundar PostHog si algo entra en bucle
    var cuerpo = JSON.stringify({
      api_key: CLAVE,
      event: evento,
      distinct_id: id,
      properties: Object.assign({
        $current_url: location.origin + location.pathname,
        $pathname: location.pathname,
        entorno: entorno(),
        version_app: window.BBC_VERSION || null,
        en_linea: navigator.onLine,
        $process_person_profile: false
      }, props || {})
    });
    // Se envía como text/plain: es un tipo «simple» y no necesita permiso previo (CORS).
    // Con application/json, Safari/iPhone descartaba los envíos sin avisar.
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(DESTINO, new Blob([cuerpo], { type: 'text/plain;charset=UTF-8' }))) return;
    } catch (e) { /* sigue con fetch */ }
    try {
      fetch(DESTINO, { method: 'POST', body: cuerpo, headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, keepalive: true }).catch(function () {});
    } catch (e) { /* la analítica nunca debe romper la app */ }
  }

  window.addEventListener('error', function (e) {
    enviar('$exception', {
      $exception_type: (e.error && e.error.name) || 'Error',
      $exception_message: String(e.message || '').slice(0, 500),
      archivo: e.filename ? e.filename.replace(location.origin, '') : null,
      linea: e.lineno || null,
      columna: e.colno || null
    });
  });

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason || {};
    enviar('$exception', {
      $exception_type: r.name || 'PromesaRechazada',
      $exception_message: String(r.message || r).slice(0, 500)
    });
  });

  window.BBC_ANALITICA = { evento: enviar }; // por si se quieren medir acciones concretas más adelante
  // La vista de página, cuando ya han cargado los scripts con defer (config.js incluido).
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enviar('$pageview'); });
  else enviar('$pageview');
})();
