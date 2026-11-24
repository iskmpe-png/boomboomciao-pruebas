CU('sample').then((sm) => {
  if (!sm) return;
  sAPI = sm;
  refrescar();
  sm.limits().then(
    (l) => {
      sLim = l;
      refrescar();
    },
    () => {},
  );
});
CU('db').then(
  (d) => {
    if (!d) {
      if (CFG && CFG.url && window.supabase) nube();
      else local();
      return;
    }
    remoto(d);
    CU('user').then((u) => {
      if (!u) return;
      uAPI = u;
      u.id().then(
        (i) => {
          miId = i;
        },
        () => {},
      );
      Promise.all([u.canEdit(), u.can('data.write')]).then(
        (r) => setNivel(r[0] ? 'admin' : r[1] === false ? 'view' : 'interact'),
        () => {},
      );
    });
  },
  () => {
    if (CFG && CFG.url && window.supabase) nube();
    else local();
  },
);

/* Fuera de Claude: guardar la app en el dispositivo para que abra sin conexión */
if (!window.claude && 'serviceWorker' in navigator) {
  const habia = !!navigator.serviceWorker.controller;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        /* Al volver a la app, mira si hay versión nueva */
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  });
  /* Versión nueva instalada: se recarga sola cuando no molesta (al salir de la app o al tocar el aviso) */
  let recargando = false;
  const recargar = () => {
    if (recargando) return;
    recargando = true;
    location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habia) return;
    if (document.hidden) return recargar();
    const a = $('aviso');
    if (a) {
      a.textContent = 'Hay una versión nueva de la app. Toca aquí para actualizar.';
      a.hidden = false;
      a.style.cursor = 'pointer';
      a.addEventListener('click', recargar, { once: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) recargar();
    });
  });
}

/* «Actualizar»: si un móvil se queda con una versión vieja o mezclada, borra lo guardado de la app
   (no los datos del restaurante, que están en la nube y en la cola de este móvil) y la descarga de nuevo */
(() => {
  const b = $('btn-reparar');
  if (!b) return;
  if (window.claude || !('serviceWorker' in navigator)) {
    b.hidden = true;
    return;
  }
  b.addEventListener('click', async () => {
    b.disabled = true;
    b.textContent = 'Actualizando…';
    try {
      const rs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(rs.map((r) => r.unregister()));
      const ks = await caches.keys();
      await Promise.all(ks.filter((k) => k.indexOf('bbc-') === 0).map((k) => caches.delete(k)));
    } catch (e) {}
    location.reload();
  });
})();
