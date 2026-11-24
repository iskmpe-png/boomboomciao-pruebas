/* ---- Grupos de la carta: las subdivisiones de Platos (Pizzas, Pastas, Brunch, Menú Nochevieja…)
   y de Elaboraciones (Salsas, Masas, Mayonesas, Caldos…). Cada lista tiene los suyos. ---- */
let grElab = false;
const grClave = () => (grElab ? 'gruposElab' : 'grupos');
const grLista = () => (grElab ? gruposElab() : gruposCarta());
function grGuardar(l) {
  S.ajustes[grClave()] = nAjustes({ [grClave()]: l })[grClave()];
  guardar('ajustes', S.ajustes, true);
  dlSucio = true;
}
function grPintar(foco) {
  const gs = grLista();
  /* Los grupos que solo existían en alguna ficha pasan a la lista para poder ordenarlos y renombrarlos */
  if (gs.length !== (S.ajustes[grClave()] || []).length && puede(2)) grGuardar(gs);
  capa(
    capaTop(grElab ? 'Grupos de elaboraciones' : 'Grupos de la carta', grElab ? 'Ordena tus elaboraciones: salsas, masas, mayonesas, caldos…' : 'Crea las subdivisiones de Platos y ponlas en el orden en que quieres verlas.') +
      '<form id="form-grupo" class="acciones" novalidate><div class="field grow"><label for="gr-nuevo">Nuevo grupo</label><input id="gr-nuevo" type="text" autocomplete="off" maxlength="60" placeholder="' + (grElab ? 'Ej. Salsas' : 'Ej. Pizzas') + '"></div><button class="btn primary" type="submit">Añadir</button></form>' +
      (gs.length
        ? '<div class="grc-lista">' +
          gs
            .map((g, k) => {
              const n = S.platos.filter((p) => !!p.base === grElab && p.grupo.trim() === g).length;
              return (
                '<div class="grc" data-k="' + k + '"><input type="text" data-gr="nombre" maxlength="60" aria-label="Nombre del grupo" value="' + esc(g) + '"><small>' + n + (grElab ? (n === 1 ? ' elaboración' : ' elaboraciones') : n === 1 ? ' plato' : ' platos') + '</small>' +
                '<button class="btn small" type="button" data-capa="gr-subir" aria-label="Subir ' + esc(g) + '"' + (k ? '' : ' disabled') + '>↑</button>' +
                '<button class="btn small" type="button" data-capa="gr-bajar" aria-label="Bajar ' + esc(g) + '"' + (k < gs.length - 1 ? '' : ' disabled') + '>↓</button>' +
                '<button class="link" type="button" data-capa="gr-quitar" style="color:var(--crit)">Quitar</button></div>'
              );
            })
            .join('') +
          '</div><p class="hint">' + (grElab ? 'Para repartirlas: en Elaboraciones pulsa «Seleccionar varios», marca las que van juntas y elige el grupo (o cámbialo en «Datos de la ficha»). Al quitar un grupo, sus elaboraciones no se borran: quedan sin grupo.' : 'Para repartir los platos: en Platos pulsa «Seleccionar», marca los que van juntos y elige el grupo. Al quitar un grupo, sus platos no se borran: quedan sin grupo.') + '</p>'
        : '<p class="hint" style="padding:12px 0">' + (grElab ? 'Todavía no hay grupos. Añade el primero: Salsas, Masas, Mayonesas, Caldos, Fondos…' : 'Todavía no hay grupos. Añade el primero: Pizzas, Pastas, Carnes, Antipasti, Brunch, Menú Nochevieja 2026…') + '</p>'),
  );
  const i = $(foco || 'gr-nuevo');
  if (i) i.focus({ preventScroll: true });
}
/* Cambia el grupo en todas las fichas que lo tenían */
function grRenombrar(de, a) {
  S.platos.forEach((p) => {
    if (!!p.base !== grElab || p.grupo.trim() !== de) return;
    p.grupo = a;
    guardar('platos', p, true);
  });
  if (grp === de) grp = a;
}
V.addEventListener('click', (e) => {
  if (e.target.closest('[data-act="gr-editar"]')) {
    grElab = enElab();
    grPintar();
  }
});
$('capa').addEventListener('submit', (e) => {
  if (!e.target.closest('#form-grupo')) return;
  e.preventDefault();
  const n = $('gr-nuevo').value.trim().slice(0, 60);
  if (!n) return;
  if (grLista().some((g) => norm(g) === norm(n))) {
    toast('Ya hay un grupo con ese nombre.');
    return;
  }
  grGuardar(grLista().concat([n]));
  grPintar();
  pintar();
});
$('capa').addEventListener('change', (e) => {
  const t = e.target,
    f = t.closest('.grc');
  if (!f || t.dataset.gr !== 'nombre') return;
  const gs = grLista(),
    k = +f.dataset.k,
    de = gs[k],
    a = t.value.trim().slice(0, 60);
  if (!a || a === de) {
    t.value = de;
    return;
  }
  if (gs.some((g, j) => j !== k && norm(g) === norm(a))) {
    toast('Ya hay un grupo con ese nombre.');
    t.value = de;
    return;
  }
  gs[k] = a;
  grRenombrar(de, a);
  grGuardar(gs);
  grPintar();
  pintar();
});
$('capa').addEventListener('click', (e) => {
  const b = e.target.closest('[data-capa^="gr-"]');
  if (!b) return;
  const gs = grLista(),
    k = +b.closest('.grc').dataset.k,
    a = b.dataset.capa;
  if (a === 'gr-quitar') {
    if (!confirmar(b, 'Pulsa otra vez')) return;
    grRenombrar(gs[k], '');
    gs.splice(k, 1);
  } else {
    const j = a === 'gr-subir' ? k - 1 : k + 1;
    if (j < 0 || j >= gs.length) return;
    gs.splice(j, 0, gs.splice(k, 1)[0]);
  }
  grGuardar(gs);
  grPintar();
  pintar();
});
