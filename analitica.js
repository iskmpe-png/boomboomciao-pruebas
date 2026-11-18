/* Boom Boom Ciao · analítica mínima con PostHog (UE), sin cookies ni almacenamiento.
   Envía: vista de página, errores de JavaScript y promesas rechazadas.
   No envía datos personales ni contenido de recetas: solo la ruta, el entorno y el error.
   Para desactivarla, quita la línea <script src="analitica.js"> de index.html. */
(function () {
  'use strict';
  var CLAVE = 'phc_AMzaxKuPnJJtEC6N5QxNChDyaYpGXnQjCNiG6LAh6bLP'; // clave pública de proyecto (no es secreta)
  var DESTINO = 'https://eu.i.posthog.com/i/v0/e/';
  var cfg = window.BBC_SUPABASE || {};
  var entorno = cfg.entorno || 'desconocido';
  // Identificador anónimo que solo vive en memoria: cambia en cada carga de la app.
  var id = 'anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  var enviados = 0;

  function enviar(evento, props) {
    if (enviados++ > 50) return; // evita inundar PostHog si algo entra en bucle
    var cuerpo = JSON.stringify({
      api_key: CLAVE,
      event: evento,
      distinct_id: id,
      properties: Object.assign({
        $current_url: location.origin + location.pathname,
        $pathname: location.pathname,
        entorno: entorno,
        version_app: window.BBC_VERSION || null,
        en_linea: navigator.onLine,
        $process_person_profile: false
      }, props || {})
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(DESTINO, new Blob([cuerpo], { type: 'application/json' }))) return;
      fetch(DESTINO, { method: 'POST', body: cuerpo, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function () {});
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
  enviar('$pageview');
})();
