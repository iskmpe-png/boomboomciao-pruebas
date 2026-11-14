/* ---- Dictado (inventario y mermas) ---- */
const NUMW = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  quince: 15,
  veinte: 20,
  medio: 0.5,
  media: 0.5,
};
const RU = '(kilogramos?|kilos?|kgs?|gramos?|grs?|g|mililitros?|ml|litros?|lts?|l|unidades|unidad|uds?)';
const claseU = (u) => {
  if (!u) return '';
  if (/^(kilo|kg)/.test(u)) return 'kg';
  if (/^(gr|g$)/.test(u)) return 'g';
  if (/^(mili|ml)/.test(u)) return 'ml';
  if (/^(li|lt|l$)/.test(u)) return 'l';
  return 'ud';
};
function buscarProd(n) {
  if (!n) return null;
  const ex = prodPorNombre(n);
  if (ex) return ex;
  const tk = n.split(' ');
  let mejor = null,
    pm = 0;
  idx().pn.forEach((p, pn) => {
    let s = 0;
    if (pn.indexOf(n) >= 0 || n.indexOf(pn) >= 0) s = 0.9 - Math.abs(pn.length - n.length) / 200;
    else {
      const pt = pn.split(' '),
        c = tk.filter((x) => x.length > 2 && pt.indexOf(x) >= 0).length;
      s = c / Math.max(tk.length, 1);
    }
    if (s > pm) {
      pm = s;
      mejor = p;
    }
  });
  return pm >= 0.5 ? mejor : null;
}
function leerDictado(t) {
  const ok = [],
    no = [];
  String(t)
    .split(/[\n;]+|,(?!\d)|\.(?!\d)/)
    .forEach((ch) => {
      const s = ch.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      if (!s) return;
      let cant = 0,
        u = '',
        resto = s;
      const m = s.match(new RegExp('(\\d+(?:[.,]\\d+)?)\\s*' + RU + '?(?![a-z])'));
      if (m) {
        cant = parse(m[1]);
        u = claseU(m[2]);
        resto = s.replace(m[0], ' ');
      } else {
        const w = s.match(
          new RegExp(
            '(?:^|\\s)(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|medio|media)\\s+' +
              RU +
              '(?![a-z])',
          ),
        );
        if (w) {
          cant = NUMW[w[1]];
          u = claseU(w[2]);
          resto = s.replace(w[0], ' ');
        }
      }
      const p = buscarProd(norm(resto.replace(/\b(de|del|la|el|los|las)\b/g, ' ')));
      if (!p || !(cant > 0)) {
        no.push(ch.trim());
        return;
      }
      if ((u === 'g' || u === 'ml') && p.unidad !== 'ud') cant = cant / 1000;
      ok.push({ p: p, cant: cant });
    });
  return { ok: ok, no: no };
}
const dictadoHTML = (id, act, txt) =>
  '<details><summary>Dictar por voz</summary><div class="col"><p class="hint">Toca el recuadro y pulsa el micrófono del teclado. Di producto y cantidad, separados por comas. ' +
  txt +
  '</p>' +
  '<textarea id="' +
  id +
  '" rows="2" aria-label="Dictado" placeholder="harina 25 kilos, mozzarella 8 kilos, aceite 10 litros"></textarea><div class="acciones"><button class="btn primary small" type="button" data-act="' +
  act +
  '">Sumar</button></div><div id="' +
  id +
  '-msg" aria-live="polite"></div></div></details>';
function msgDictado(id, r) {
  $(id + '-msg').innerHTML =
    (r.ok.length
      ? '<p class="msg">Sumado: ' +
        r.ok.map((x) => esc(x.p.nombre) + ' ' + fNum(x.cant, 3) + ' ' + UDI[x.p.unidad]).join(', ') +
        '.</p>'
      : '') +
    (r.no.length
      ? '<p class="msg" style="margin-top:6px;background:var(--warn-bg);color:var(--warn)">No reconocí: ' +
        r.no.map(esc).join(' · ') +
        '. Comprueba que el producto está en Precios y que dijiste la cantidad.</p>'
      : '') +
    (!r.ok.length && !r.no.length
      ? '<p class="msg">Escribe o dicta algo primero, por ejemplo: harina 25 kilos.</p>'
      : '');
  $(id).value = r.no.join(', ');
}
