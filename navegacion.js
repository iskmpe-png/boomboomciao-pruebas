/* ---- Navegación ---- */
function ruta() {
  let h = (location.hash || '').replace('#', '');
  /* El asistente ya no es una pantalla: es el chat flotante */
  if (h === 'inicio-asistente') {
    h = 'inicio-panel';
    try {
      history.replaceState(null, '', '#inicio-panel');
    } catch (e) {}
    setTimeout(abrirChat, 0);
  }
  h = ALIAS[h] || h;
  const ps = h.split('-'),
    n = SUBS[ps[0]] ? ps[0] : 'inicio';
  let sb = sub[n];
  if (SUBS[ps[0]] && ps[1] && SUBS[n].some((x) => x[0] === ps[1])) sb = ps[1];
  if (!SUBS[n].some((x) => x[0] === sb)) sb = SUBS[n][0][0];
  finEdicion();
  if (n !== vista || sb !== sub[n]) {
    editProd = null;
    abierta = false;
  }
  if (pendAbrir) {
    abierta = true;
    pendAbrir = false;
  }
  vista = n;
  sub[n] = sb;
  pintar();
}
window.addEventListener('hashchange', ruta);
const SECN = { inicio: 'Inicio', carta: 'Carta', precios: 'Precios', cocina: 'Cocina', control: 'Control', almacen: 'Almacén' };
const SECI = {
  inicio: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
  carta: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  precios: '<path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 8.5h.01"/>',
  cocina: '<path d="M6 10a4 4 0 1 1 2.5-7.1 4 4 0 0 1 7 0A4 4 0 1 1 18 10v7H6z"/><path d="M6 21h12"/>',
  almacen: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  control: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
};
/* ---- Menú según el rango ----
   Dueño y encargados lo ven todo. El equipo (cocina, barra, solo consulta) ve solo lo que usa en el día a día:
   sin precios, costes, ingeniería, menús ni comparaciones. */
const SUBS_TODO = JSON.parse(JSON.stringify(SUBS));
const MENU_EQUIPO = { inicio: ['panel', 'turnos'], cocina: ['recetas', 'produccion', 'etiquetas', 'appcc'], almacen: ['inventario', 'compras', 'mermas'] };
function aplicarMenuRol() {
  const eq = !puede(2),
    extra = (SUBS.inicio || []).filter((x) => !SUBS_TODO.inicio.some((y) => y[0] === x[0]));
  sinPrecios = eq;
  Object.keys(SUBS).forEach((k) => delete SUBS[k]);
  Object.keys(SUBS_TODO).forEach((k) => {
    if (!eq) SUBS[k] = SUBS_TODO[k].map((x) => x.slice());
    else if (MENU_EQUIPO[k]) SUBS[k] = SUBS_TODO[k].filter((x) => MENU_EQUIPO[k].indexOf(x[0]) >= 0).map((x) => x.slice());
  });
  if (!eq) SUBS.inicio = SUBS.inicio.concat(extra);
  SUBS.inicio[0][1] = eq ? 'Tablón' : 'Panel';
  if (!SUBS[vista]) {
    vista = 'inicio';
    try {
      if (location.hash) history.replaceState(null, '', '#inicio-panel');
    } catch (e) {}
  }
  Object.keys(SUBS).forEach((k) => {
    if (!SUBS[k].some((x) => x[0] === sub[k])) sub[k] = SUBS[k][0][0];
  });
  construirMenu();
  if (typeof pintarTabbar === 'function') pintarTabbar();
}
function construirMenu() {
  $('menu-nav').innerHTML = Object.keys(SUBS)
    .map(
      (v) =>
        '<details data-sec="' +
        v +
        '"><summary><svg viewBox="0 0 24 24" aria-hidden="true">' +
        SECI[v] +
        '</svg>' +
        SECN[v] +
        '</summary><div class="m-sub">' +
        SUBS[v]
          .map((x) => '<a href="#' + v + '-' + x[0] + '" data-m="' + v + '-' + x[0] + '">' + x[1] + '</a>')
          .join('') +
        '</div></details>',
    )
    .join('');
  if (window.matchMedia && matchMedia('(min-width:1040px)').matches)
    $('menu-nav')
      .querySelectorAll('details')
      .forEach((d) => {
        d.open = true;
      });
}
construirMenu();
function pintarMenu() {
  $('menu-nav')
    .querySelectorAll('a')
    .forEach((a) => {
      if (a.dataset.m === vista + '-' + sub[vista]) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  $('menu-nav')
    .querySelectorAll('details')
    .forEach((d) => {
      const es = d.dataset.sec === vista;
      d.classList.toggle('actual', es);
      if (es) d.open = true;
    });
}
function menu(abrir) {
  document.body.classList.toggle('menu-abierto', abrir);
  $('btn-menu').setAttribute('aria-expanded', String(abrir));
  if (abrir) {
    const a = q($('menu-nav'), 'a[aria-current]');
    if (a) a.focus();
  }
}
$('btn-menu').addEventListener('click', () => menu(!document.body.classList.contains('menu-abierto')));
$('menu-cerrar').addEventListener('click', () => {
  menu(false);
  $('btn-menu').focus();
});
$('velo').addEventListener('click', () => menu(false));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('menu-abierto')) {
    menu(false);
    $('btn-menu').focus();
  }
});
$('menu-nav').addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a) return;
  menu(false);
  if (a.dataset.m === 'carta-platos' && abierta) {
    abierta = false;
    if (pant === 'carta') vCarta();
  }
});
