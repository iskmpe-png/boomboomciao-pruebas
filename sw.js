/* Boom Boom Ciao: guarda la app en el dispositivo para que abra sin conexión.
   Sube el número de versión cada vez que publiques cambios. */
const CACHE = 'bbc-v7';
const BASE = [
  "./",
  "index.html",
  "config.js",
  "manifest.webmanifest",
  "vendor/supabase.js",
  "img/logo-oro.png",
  "img/icon-192.png",
  "img/icon-512.png",
  "css/inicio.css",
  "css/base.css",
  "css/componentes.css",
  "css/pantallas.css",
  "css/novedades.css",
  "js/nucleo/base.js",
  "js/nucleo/modelo.js",
  "js/nucleo/indices.js",
  "js/nucleo/guardado.js",
  "js/nucleo/calculo.js",
  "js/nucleo/pintado.js",
  "js/pantallas/carta.js",
  "js/pantallas/ficha.js",
  "js/pantallas/precios.js",
  "js/pantallas/recetas.js",
  "js/utilidades/dictado.js",
  "js/pantallas/inventario.js",
  "js/pantallas/mermas.js",
  "js/nucleo/alergenos-y-utilidades.js",
  "js/pantallas/alertas.js",
  "js/pantallas/comparar.js",
  "js/pantallas/panel.js",
  "js/pantallas/sala.js",
  "js/pantallas/ingenieria.js",
  "js/pantallas/eventos.js",
  "js/pantallas/modo-cocina.js",
  "js/pantallas/produccion.js",
  "js/pantallas/etiquetas.js",
  "js/pantallas/appcc.js",
  "js/pantallas/compras.js",
  "js/pantallas/ficha-extra.js",
  "js/exportar/informes-extra.js",
  "js/eventos/eventos-ampliacion.js",
  "js/nucleo/permisos.js",
  "js/nucleo/nombres.js",
  "js/nucleo/precio-historial.js",
  "js/utilidades/imagenes.js",
  "js/utilidades/documentos.js",
  "js/ia/asistente.js",
  "js/ia/escaner.js",
  "js/ia/ventas.js",
  "js/eventos/eventos-ia.js",
  "js/exportar/informes.js",
  "js/exportar/lienzo.js",
  "js/exportar/pdf.js",
  "js/exportar/excel.js",
  "js/exportar/varios.js",
  "js/eventos/eventos-principales.js",
  "js/nucleo/tema.js",
  "js/nucleo/navegacion.js",
  "js/nucleo/recibir.js",
  "js/datos/copia.js",
  "js/datos/deshacer.js",
  "js/pantallas/proveedores.js",
  "js/pantallas/pedidos.js",
  "js/pantallas/historial.js",
  "js/nube/legal-y-copias.js",
  "js/pantallas/grupo.js",
  "js/ia/tarifas.js",
  "js/ia/manual.js",
  "js/pantallas/primeros-pasos.js",
  "js/pantallas/buscador.js",
  "js/nube/limite-ia.js",
  "js/nube/sesion.js",
  "js/nube/almacen-local.js",
  "js/nube/sincronizacion.js",
  "js/nube/acceso.js",
  "js/nube/usuarios.js",
  "js/nube/ia.js",
  "js/arranque.js"
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const fuentes = /(^|\.)(googleapis\.com|gstatic\.com)$/.test(u.hostname);
  if (u.origin !== location.origin && !fuentes) return; // la base de datos nunca se guarda aquí
  const guarda = (res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copia = res.clone();
      caches.open(CACHE).then((c) => c.put(r, copia));
    }
    return res;
  };
  // Lo propio de la app: primero la red (así llegan las actualizaciones) y, si no hay, lo guardado.
  if (u.origin === location.origin) {
    e.respondWith(
      fetch(r).then(guarda).catch(() =>
        caches.match(r, { ignoreSearch: true }).then((m) => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))
      )
    );
    return;
  }
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then(guarda)));
});
