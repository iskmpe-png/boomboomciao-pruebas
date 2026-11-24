/* Boom Boom Ciao: guarda la app en el dispositivo para que abra sin conexión.
   Sube el número de versión cada vez que publiques cambios. */
const CACHE = 'bbc-v30';
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
  "fuentes.css",
  "plus-jakarta-sans-latin-400-normal.woff2",
  "plus-jakarta-sans-latin-500-normal.woff2",
  "plus-jakarta-sans-latin-600-normal.woff2",
  "plus-jakarta-sans-latin-700-normal.woff2",
  "plus-jakarta-sans-latin-800-normal.woff2",
  "bricolage-grotesque-latin-700-normal.woff2",
  "bricolage-grotesque-latin-800-normal.woff2",
  "base.css",
  "componentes.css",
  "pantallas.css",
  "novedades.css",
  "retoques-movil.css",
  "zz-estilo.css",
  "zzz-pomodoro.css",
  "base.js",
  "modelo.js",
  "indices.js",
  "guardado.js",
  "calculo.js",
  "formatos.js",
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
  "detalle.js",
  "eventos-ampliacion.js",
  "permisos.js",
  "nombres.js",
  "precio-historial.js",
  "imagenes.js",
  "documentos.js",
  "asistente.js",
  "chat-flotante.js",
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
  "interfaz.js",
  "recibir.js",
  "copia.js",
  "deshacer.js",
  "proveedores.js",
  "pedidos.js",
  "historial.js",
  "legal-y-copias.js",
  "legal.js",
  "grupo.js",
  "tarifas.js",
  "escandallos.js",
  "unidades.js",
  "seleccion.js",
  "grupos-carta.js",
  "fotos.js",
  "menus-carta.js",
  "zonas.js",
  "recordatorios.js",
  "turnos.js",
  "reparto.js",
  "cuadre.js",
  "aprobar.js",
  "consumo.js",
  "enlazar.js",
  "repaso-kgl.js",
  "tablon.js",
  "tareas.js",
  "etiquetas-acciones.js",
  "manual.js",
  "primeros-pasos.js",
  "buscador.js",
  "limite-ia.js",
  "sesion.js",
  "almacen-local.js",
  "archivos.js",
  "avisos.js",
  "limpieza.js",
  "sincronizacion.js",
  "acceso.js",
  "mi-cuenta.js",
  "usuarios.js",
  "ia.js",
  "arranque.js"
];
self.addEventListener('install', (e) => {
  // cache: 'reload' = siempre del servidor, nunca de la caché del navegador (así no se mezclan versiones)
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
  if (u.origin !== location.origin) return; // la base de datos nunca se guarda aquí
  const guarda = (res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copia = res.clone();
      caches.open(CACHE).then((c) => c.put(r, copia));
    }
    return res;
  };
  // Lo propio de la app sale al instante de lo guardado en el móvil (abre mucho más rápido).
  // Las actualizaciones llegan con un sw.js nuevo: guarda la versión nueva entera y la app se recarga sola.
  if (u.origin === location.origin) {
    e.respondWith(
      caches.match(r, { ignoreSearch: true }).then(
        (m) =>
          m ||
          fetch(r)
            .then(guarda)
            .catch(() => (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))
      )
    );
    return;
  }
});
// Avisos al móvil: llegan del servidor aunque la app esté cerrada
self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (er) {
    d = { cuerpo: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(d.titulo || 'Boom Boom Ciao', {
      body: d.cuerpo || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: d.clave || undefined,
      data: { url: d.url || '' },
    })
  );
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = new URL('./' + ((e.notification.data && e.notification.data.url) || ''), self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => {
      for (const c of l) {
        if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) {
          c.navigate(destino).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
