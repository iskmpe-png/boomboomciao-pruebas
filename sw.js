/* Boom Boom Ciao: guarda la app en el dispositivo para que abra sin conexión.
   Sube el número de versión cada vez que publiques cambios. */
const CACHE = 'bbc-v8';
const BASE = [
  "./",
  "index.html",
  "config.js",
  "manifest.webmanifest",
  "supabase.js",
  "logo-oro.png",
  "icon-192.png",
  "icon-512.png",
  "inicio.css",
  "base.css",
  "componentes.css",
  "pantallas.css",
  "novedades.css",
  "base.js",
  "modelo.js",
  "indices.js",
  "guardado.js",
  "calculo.js",
  "pintado.js",
  "carta.js",
  "ficha.js",
  "precios.js",
  "recetas.js",
  "dictado.js",
  "inventario.js",
  "mermas.js",
  "alergenos-y-utilidades.js",
  "alertas.js",
  "comparar.js",
  "panel.js",
  "sala.js",
  "ingenieria.js",
  "eventos.js",
  "modo-cocina.js",
  "produccion.js",
  "etiquetas.js",
  "appcc.js",
  "compras.js",
  "ficha-extra.js",
  "informes-extra.js",
  "eventos-ampliacion.js",
  "permisos.js",
  "nombres.js",
  "precio-historial.js",
  "imagenes.js",
  "documentos.js",
  "asistente.js",
  "escaner.js",
  "ventas.js",
  "eventos-ia.js",
  "informes.js",
  "lienzo.js",
  "pdf.js",
  "excel.js",
  "varios.js",
  "eventos-principales.js",
  "tema.js",
  "navegacion.js",
  "recibir.js",
  "copia.js",
  "deshacer.js",
  "proveedores.js",
  "pedidos.js",
  "historial.js",
  "legal-y-copias.js",
  "grupo.js",
  "tarifas.js",
  "manual.js",
  "primeros-pasos.js",
  "buscador.js",
  "limite-ia.js",
  "sesion.js",
  "almacen-local.js",
  "sincronizacion.js",
  "acceso.js",
  "usuarios.js",
  "ia.js",
  "arranque.js"
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
