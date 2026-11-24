/* ---- Detalles de la interfaz 3.0: barra de secciones abajo, deslizar para actualizar y ajustes ---- */
/* Barra de abajo en el móvil: las secciones de uso diario a un toque y «Más» abre el menú */
const TAB_ORDEN = ['inicio', 'carta', 'cocina', 'almacen'];
function pintarTabbar() {
  const t = $('tabbar');
  if (!t) return;
  const secs = TAB_ORDEN.filter((k) => SUBS[k]);
  t.innerHTML =
    secs
      .map(
        (k) =>
          '<a href="#' + k + '-' + sub[k] + '" class="tb-i"' + (vista === k ? ' aria-current="page"' : '') + ' data-sec="' + k + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + SECI[k] + '</svg><span>' + SECN[k] + '</span></a>',
      )
      .join('') +
    '<button type="button" class="tb-i" id="tb-mas" aria-label="Más secciones y ajustes" aria-controls="menu"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg><span>Más</span></button>';
  document.body.classList.add('con-tabbar');
}
document.addEventListener('click', (e) => {
  if (e.target.closest('#tb-mas')) menu(!document.body.classList.contains('menu-abierto'));
  else if (e.target.closest('#btn-ajustes')) verCuentaPanel();
});

/* Deslizar hacia abajo desde arriba del todo = actualizar (en móviles y tablets) */
(function () {
  const ind = $('tirar');
  if (!ind || !('ontouchstart' in window)) return;
  let y0 = null,
    dy = 0;
  const libre = () => !document.body.classList.contains('menu-abierto') && $('capa').hidden && $('acceso').hidden && (!$('usuarios') || $('usuarios').hidden) && !document.querySelector('.hoja-arch');
  window.addEventListener(
    'touchstart',
    (e) => {
      y0 = window.scrollY <= 0 && libre() && e.touches.length === 1 ? e.touches[0].clientY : null;
      dy = 0;
    },
    { passive: true },
  );
  window.addEventListener(
    'touchmove',
    (e) => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy <= 0 || window.scrollY > 0) {
        ind.classList.remove('ver', 'listo');
        return;
      }
      const d = Math.min(dy, 140);
      ind.style.transform = 'translate(-50%, ' + (d * 0.6 - 60) + 'px)';
      ind.classList.add('ver');
      ind.classList.toggle('listo', dy > 110);
      ind.firstChild.textContent = dy > 110 ? 'Suelta para actualizar' : 'Desliza para actualizar';
    },
    { passive: true },
  );
  window.addEventListener('touchend', () => {
    const ok = y0 != null && dy > 110 && window.scrollY <= 0;
    y0 = null;
    ind.style.transform = '';
    ind.classList.remove('ver', 'listo');
    if (ok) actualizarApp();
  });
})();
/* Busca una versión nueva de la app y vuelve a cargar los datos */
async function actualizarApp() {
  const ind = $('tirar');
  if (ind) {
    ind.firstChild.textContent = 'Actualizando…';
    ind.classList.add('ver', 'girando');
  }
  try {
    const r = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
    if (r) {
      await r.update();
      /* Si hay versión nueva, se instala y la app se recarga sola al terminar */
      if (r.installing || r.waiting) {
        if (r.waiting) r.waiting.postMessage && r.waiting.postMessage('activar');
        setTimeout(() => location.reload(), 5000);
        return;
      }
    }
  } catch (e) {}
  location.reload();
}
