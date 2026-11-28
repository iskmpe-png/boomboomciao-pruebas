/* ---- Tema de día / noche ----
   «Automático» pone el modo noche de 20:00 a 07:00, o a cualquier hora si el móvil ya está en oscuro.
   Se puede fijar «Día» o «Noche» en Mi cuenta (Menú › Ajustes). */
const NOCHE_DE = 20,
  NOCHE_A = 7;
const temaAuto = () => {
  const h = new Date().getHours();
  if (h >= NOCHE_DE || h < NOCHE_A) return 'dark';
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
const temaActual = () => {
  const t = mem('esc2.tema');
  return t === 'dark' || t === 'light' ? t : temaAuto();
};
const pintarTema = () => {
  const t = temaActual();
  document.documentElement.setAttribute('data-theme', t);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', t === 'dark' ? '#0f1117' : '#f6f0e4');
};
pintarTema();
setInterval(pintarTema, 5 * 60000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) pintarTema();
});
if (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').addEventListener) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', pintarTema);
