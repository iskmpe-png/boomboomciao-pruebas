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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
