/* ---- Tema claro / oscuro ---- */
const temaActual = () => {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark' || t === 'light') return t;
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
/* El botón de tema está dentro de Mi cuenta (Menú › Ajustes) */
const pintarTema = () => {
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', temaActual() === 'dark' ? '#0f1222' : '#26306b');
};
const tg = mem('esc2.tema');
if (tg === 'dark' || tg === 'light') document.documentElement.setAttribute('data-theme', tg);
pintarTema();
