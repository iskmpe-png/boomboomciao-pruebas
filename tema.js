/* ---- Tema claro / oscuro ---- */
const temaActual = () => {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark' || t === 'light') return t;
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
const pintarTema = () => {
  $('btn-tema').textContent = temaActual() === 'dark' ? 'Claro' : 'Oscuro';
};
const tg = mem('esc2.tema');
if (tg === 'dark' || tg === 'light') document.documentElement.setAttribute('data-theme', tg);
$('btn-tema').addEventListener('click', () => {
  const n = temaActual() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', n);
  mem('esc2.tema', n);
  pintarTema();
});
pintarTema();
