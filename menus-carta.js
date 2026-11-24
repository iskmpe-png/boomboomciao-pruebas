/* ---- Menús dentro de la carta ----
   Un menú (por ejemplo «Menú Nochevieja 2026») sale en la carta como un plato más, con su
   precio por persona. Los platos que solo se venden dentro de él no salen sueltos: aparecen
   debajo del menú. Su food cost se calcula sobre el menú entero, así que un plato caro se
   compensa con los baratos. */
const ICO_MENU =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>';
/* Los menús salen plegados: solo el menú. Sus platos se ven al tocar «Ver platos». */
const menusAbiertos = new Set();
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="menu-ver"]');
  if (!b) return;
  const id = b.dataset.id,
    caja = b.parentElement && b.parentElement.querySelector('.menu-platos[data-menu="' + CSS.escape(id) + '"]'),
    ab = !menusAbiertos.has(id);
  if (ab) menusAbiertos.add(id);
  else menusAbiertos.delete(id);
  if (caja) caja.hidden = !ab;
  b.setAttribute('aria-expanded', String(ab));
  b.textContent = (ab ? 'Ocultar platos' : 'Ver ' + b.dataset.n + (b.dataset.n === '1' ? ' plato' : ' platos')) + (ab ? ' ▴' : ' ▾');
});
function menusHTML() {
  const l = menusCarta().filter((e) => !e.platos.length || e.platos.some((x) => { const p = plato(x.id); return p && enArea(p); }));
  if (!l.length) return '';
  return (
    '<h3 class="grupoh">Menús</h3>' +
    l
      .map((e) => {
        const c = costeMenu(e);
        return (
          '<button class="row menurow" type="button" data-act="ev-carta" data-id="' + esc(e.id) + '"><span class="mini-foto menu" aria-hidden="true">' + ICO_MENU + '</span>' +
          '<span class="n"><b>' + esc(e.nombre || 'Menú sin nombre') + '</b><span>' + resumenMenu(e) +
          (e.precio > 0 ? ' · ' + fEur.format(e.precio) + ' por persona' : ' · falta el precio') + '</span></span>' +
          '<span class="d"><b>' + fEur.format(c) + '</b>' + evPill(e) + '</span></button>' +
          (function () {
            const n = e.platos.filter((x) => plato(x.id)).length,
              ab = menusAbiertos.has(e.id);
            return n
              ? '<button class="link menu-ver" type="button" data-act="menu-ver" data-id="' + esc(e.id) + '" data-n="' + n + '" aria-expanded="' + ab + '">' + (ab ? 'Ocultar platos ▴' : 'Ver ' + n + (n === 1 ? ' plato' : ' platos') + ' ▾') + '</button>'
              : '';
          })() +
          '<div class="menu-platos" data-menu="' + esc(e.id) + '"' + (menusAbiertos.has(e.id) ? '' : ' hidden') + '>' +
          ordenLineasMenu(e)
            .map(([x]) => {
              const p = plato(x.id);
              return p
                ? '<button class="row subrow" type="button" data-act="abrir" data-id="' + esc(p.id) + '">' + miniFoto(p) + '<span class="n"><b>' + esc(p.nombre || 'Sin nombre') + '</b><span>' +
                    (e.opciones && tmpo(x) ? esc(tmpo(x)) + ' · ' : '') + (x.n !== 1 ? fNum(x.n, 2) + ' raciones · ' : '') + 'coste ' + fEur.format(x.n * costeUd(p)) + '</span></span></button>'
                : '';
            })
            .join('') +
          '</div>'
        );
      })
      .join('')
  );
}
/* Reparto del precio del menú entre sus platos según lo que cuesta cada uno */
function nivelHTML(e) {
  const c = costeMenu(e),
    fc = fcMenu(e);
  if (!(c > 0)) return '<p class="hint">Añade platos con ingredientes para ver el reparto.</p>';
  if (!(e.precio > 0)) return '<p class="hint">Pon el precio por persona para ver cómo se reparte entre los platos.</p>';
  return (
    (e.opciones
      ? '<p class="hint">El menú cuesta de media <b>' + fEur.format(c) + '</b> por persona (una opción de cada tiempo): food cost <b>' + fNum(fc) + ' %</b>. Abajo, lo que le tocaría a cada opción del precio del menú si la eligen.</p>'
      : '<p class="hint">Si repartes los ' + fEur.format(e.precio) + ' del menú según lo que cuesta cada plato, todos quedan al <b>' + fNum(fc) + ' %</b>: los platos caros se compensan con los baratos.</p>') +
    '<div class="tabla"><table class="nivel"><thead><tr><th>Plato</th><th>Coste</th><th>Precio repartido</th><th>Suelto</th></tr></thead><tbody>' +
    e.platos
      .map((x) => {
        const p = plato(x.id);
        if (!p) return '';
        const pc = x.n * costeUd(p),
          fs = fcDe(p);
        return (
          '<tr><td>' + esc(p.nombre) + '</td><td>' + fEur.format(pc) + '</td><td>' + fEur.format((e.precio * pc) / c) + '</td><td>' +
          (fs == null ? '—' : '<span class="pill ' + (fs <= 30 ? 'ok' : fs <= 35 ? 'warn' : 'crit') + '">' + fNum(fs) + ' %</span>') + '</td></tr>'
        );
      })
      .join('') +
    '</tbody><tfoot><tr><td>Menú</td><td>' + fEur.format(c) + '</td><td>' + fEur.format(e.precio) + '</td><td>' + evPill(e) + '</td></tr></tfoot></table></div>' +
    '<p class="hint">«Suelto» es el food cost de cada plato con su precio de carta, solo como referencia.</p>'
  );
}
/* Ingredientes de un plato dentro del menú, por persona */
function ingsMenuHTML(p, n) {
  const ings = p.ingredientes.filter((i) => nom(i));
  if (!ings.length) return '';
  const rac = p.raciones > 0 ? p.raciones : 1;
  return (
    '<details class="ev-ings"><summary>Ingredientes</summary><ul class="ri">' +
    ings
      .map((i) => {
        const q = (i.cantidad * n) / rac,
          u = un(i);
        return '<li><span>' + esc(nom(i)) + ' · ' + (u !== 'ud' && q >= 1000 ? fNum(q / 1000, 2) + ' ' + UDI[u] : fNum(q) + ' ' + UD[u]) + '</span><b>' + fEur.format((coste(i) * n) / rac) + '</b></li>';
      })
      .join('') +
    '</ul></details>'
  );
}
/* Crear un menú con los platos marcados en Carta › Seleccionar */
function selMenu() {
  const l = S.platos.filter((p) => selIds.has(p.id) && !p.base);
  if (!l.length) {
    toast('Marca primero los platos del menú.');
    return;
  }
  const ev = nEvento({ id: nuevoId('eventos'), nombre: '', pax: 0, enCarta: true, platos: l.map((p) => ({ id: p.id, n: 1 })) });
  enLote(() => {
    S.eventos.push(ev);
    guardar('eventos', ev, true);
    l.forEach((p) => {
      if (p.soloMenu) return;
      p.soloMenu = true;
      guardar('platos', p, true);
    });
  });
  selFin();
  sucio();
  evId = ev.id;
  location.hash = '#carta-eventos';
  setTimeout(() => {
    if ($('ev-nombre')) $('ev-nombre').focus();
  }, 60);
  toast('Menú creado con ' + l.length + (l.length === 1 ? ' plato' : ' platos') + ': ponle nombre y precio por persona.');
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="ev-carta"]');
  if (!b) return;
  evId = b.dataset.id;
  if (location.hash === '#carta-eventos') vEventos();
  else location.hash = '#carta-eventos';
});
V.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'ev-opc' || t.dataset.evt != null) {
    const ev = evento();
    if (!ev || !puede(2)) return;
    if (t.id === 'ev-opc') ev.opciones = t.checked;
    else if (ev.platos[+t.dataset.evt]) ev.platos[+t.dataset.evt].tiempo = t.value.trim().slice(0, 40);
    guardar('eventos', ev, true);
    sucio();
    vEventos();
    return;
  }
  if (e.target.id !== 'ev-encarta') return;
  const ev = evento();
  if (!ev || !puede(2)) return;
  ev.enCarta = e.target.checked;
  guardar('eventos', ev, true);
  sucio();
  toast(ev.enCarta ? 'El menú sale en Carta › Platos con su precio por persona.' : 'El menú ya no sale en la carta.');
});
/* ---- Ingeniería: menús vendidos en el mes ----
   El número de menús sale de los platos del TPV (el tiempo que más vendió). El coste es el real:
   lo que costaron los platos que de verdad se eligieron dentro del menú. */
function menusVendidosHTML() {
  const v = ventasMes(false);
  if (!v || !v.menus || !Object.keys(v.menus).length) return '';
  const det = {};
  v.importes.forEach((x) =>
    (x.menuLineas || []).forEach(([pid, n, ev]) => {
      const d = det[ev] || (det[ev] = {});
      d[pid] = (d[pid] || 0) + n;
    }),
  );
  const filas = Object.keys(v.menus)
    .map((id) => {
      const e = S.eventos.find((x) => x.id === id),
        n = Number(v.menus[id]) || 0,
        d = det[id] || {},
        coste = suma(Object.keys(d), (pid) => {
          const p = idx().pl.get(pid);
          return p ? d[pid] * costeUd(p) : 0;
        }),
        ing = e && e.precio > 0 ? n * e.precio : 0;
      return { e, id, n, d, coste, ing, fc: ing > 0 ? (coste / (ing / 1.1)) * 100 : null };
    })
    .filter((x) => x.n > 0)
    .sort((a, z) => z.n - a.n);
  if (!filas.length) return '';
  return (
    '<section class="card"><h3>Menús vendidos en ' + esc(fMes(mesM).toLowerCase()) + '</h3><p class="hint">Sus platos no cuentan abajo con el precio de carta. Coste real = lo que costaron los platos que se eligieron.</p><div class="rows">' +
    filas
      .map(
        (x) =>
          '<details class="vimp"><summary class="row"><span class="n"><b>' + esc(x.e ? x.e.nombre || 'Menú sin nombre' : 'Menú borrado') + '</b><span>' +
          esc(x.n + (x.n === 1 ? ' menú' : ' menús') + (x.ing ? ' · ' + fEur.format(x.ing) + ' de venta' : ' · sin precio') + ' · coste real ' + fEur.format(x.coste) + (x.n ? ' (' + fEur.format(x.coste / x.n) + ' por menú)' : '')) +
          '</span></span><span class="d">' + (x.fc == null ? '<span class="pill">Sin precio</span>' : '<span class="pill ' + (x.fc <= 30 ? 'ok' : x.fc <= 35 ? 'warn' : 'crit') + '">' + fNum(x.fc) + ' %</span>') + '</span></summary>' +
          '<div class="tabla"><table class="nivel"><thead><tr><th>Plato del menú</th><th>Vendidos</th><th>Coste</th></tr></thead><tbody>' +
          Object.keys(x.d)
            .sort((a, z) => x.d[z] - x.d[a])
            .map((pid) => {
              const p = idx().pl.get(pid);
              return '<tr><td>' + esc(p ? p.nombre : '(plato borrado)') + '</td><td>' + fNum(x.d[pid], 0) + '</td><td>' + (p ? fEur.format(x.d[pid] * costeUd(p)) : '—') + '</td></tr>';
            })
            .join('') +
          '</tbody></table></div></details>',
      )
      .join('') +
    '</div></section>'
  );
}
