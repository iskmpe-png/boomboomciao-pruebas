/* ---- Recetas ---- */
const cantTxt = (i) => {
  const c = i.cantidad * factor,
    u = un(i);
  return u !== 'ud' && c >= 1000 ? fNum(c / 1000, 2) + ' ' + UDI[u] : fNum(c) + ' ' + UD[u];
};
function textoReceta(p) {
  const l = [(p.nombre || 'Receta').toUpperCase(), 'Rinde: ' + rindeF(p), '', 'INGREDIENTES'];
  p.ingredientes.forEach((i) => {
    if (nom(i))
      l.push('- ' + nom(i) + ': ' + cantTxt(i) + (conCostes ? ' (' + fEur.format(coste(i) * factor) + ')' : ''));
  });
  if (p.elaboracion.trim()) l.push('', 'ELABORACIÓN', p.elaboracion.trim());
  if (conCostes) {
    l.push('', (p.base ? 'Coste por ' + UDI[p.unidadBase] : 'Coste por ración') + ': ' + fEur.format(costeUd(p)));
    if (p.pvp > 0 && !p.base) l.push('Precio en carta: ' + fEur.format(p.pvp));
  }
  if (S.ajustes.nombre) l.push('', S.ajustes.nombre);
  return l.join('\n');
}
function enlacesReceta() {
  const p = plato(recetaId);
  if (!p || !$('r-wa')) return;
  const t = textoReceta(p);
  $('r-wa').href = 'https://wa.me/?text=' + encodeURIComponent(t);
  $('r-gm').href =
    'https://mail.google.com/mail/?view=cm&fs=1&su=' +
    encodeURIComponent('Receta: ' + (p.nombre || '')) +
    '&body=' +
    encodeURIComponent(t);
  $('r-texto').value = t;
}
function vRecetas() {
  if (!plato(recetaId)) recetaId = plato() ? platoId : S.platos[0] ? ordenados(S.platos)[0].id : null;
  const p = plato(recetaId);
  if (!p) {
    $('vista').innerHTML = vacio(
      'Aún no hay recetas',
      'Cada plato de la Carta aparece aquí como receta, con sus ingredientes y cantidades.',
      '<a class="btn primary" href="#carta">Ir a Carta</a>',
    );
    return;
  }
  const ings = p.ingredientes.filter((i) => nom(i));
  $('vista').innerHTML =
    '<div class="bar"><div class="field"><label for="sel-receta">Receta</label><select id="sel-receta">' +
    opcionesPlatos(p.id) +
    '</select></div>' +
    '<div class="field corto" style="flex-basis:120px"><label for="r-cant">Preparar (' +
    (p.base ? UDI[p.unidadBase] : 'raciones') +
    ')</label><input class="num" id="r-cant" type="text" inputmode="decimal" value="' +
    esc(show(r3(p.raciones * factor))) +
    '"></div>' +
    '<button class="btn" type="button" data-act="modo-cocina">Modo cocina</button>' +
    '<a class="btn primary" id="r-wa" target="_blank" rel="noopener">WhatsApp</a><a class="btn" id="r-gm" target="_blank" rel="noopener">Gmail</a><button class="btn" type="button" data-act="copiar-receta">Copiar</button>' +
    expHTML(1) +
    '</div>' +
    '<section class="card"><div><h2 style="font-size:1.9rem">' +
    esc(p.nombre || 'Sin nombre') +
    '</h2><p class="hint" id="r-rinde">Rinde ' +
    rindeF(p) +
    '</p></div>' +
    '<div id="r-lista">' +
    listaRecetaHTML(p) +
    '</div>' +
    '<div class="field"><label for="r-elab">Elaboración</label><textarea id="r-elab" rows="7" placeholder="Pasos, tiempos y temperaturas. Puedes dictarlos con el micrófono del teclado.">' +
    esc(p.elaboracion) +
    '</textarea></div>' +
    '<label class="check" for="r-costes"><input type="checkbox" id="r-costes"' +
    (conCostes ? ' checked' : '') +
    '> Incluir costes y precio de carta al compartir</label>' +
    '<p class="hint" id="r-msg" aria-live="polite"></p><div class="field" id="r-caja" hidden><label for="r-texto">Texto de la receta</label><textarea id="r-texto" rows="8" readonly></textarea></div></section>';
  enlacesReceta();
}
