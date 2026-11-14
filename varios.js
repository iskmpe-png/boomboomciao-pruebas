/* ---- Exportar varias fichas a la vez ---- */
const mx = { sel: new Set(), tipo: 'esc', f: '', g: '', ocupado: false, vuelve: null };
const MXT = { esc: 'Escandallos', rec: 'Recetas', dos: 'Los dos' };
function mxLista() {
  const f = norm(mx.f),
    l = ordenados(S.platos).filter((p) => (!mx.g || grupoDe(p) === mx.g) && (!f || norm(p.nombre).indexOf(f) >= 0));
  return l.filter((p) => !p.base).concat(l.filter((p) => p.base));
}
function abrirMulti() {
  mx.sel = new Set();
  mx.f = '';
  mx.g = '';
  mx.ocupado = false;
  mx.tipo = pant === 'recetas' ? 'rec' : 'esc';
  mx.vuelve = document.activeElement;
  const gs = {};
  S.platos.forEach((p) => {
    gs[grupoDe(p)] = 1;
  });
  const ks = Object.keys(gs).sort((a, z) => (a === G_BASE) - (z === G_BASE) || a.localeCompare(z, 'es'));
  $('multi').innerHTML =
    '<div class="mx-top"><div><h2>Exportar varios</h2><p class="hint">Cada ficha sale con los mismos datos que al exportarla sola.</p></div><button class="btn" type="button" data-mx="cerrar">Cerrar</button></div>' +
    '<div class="seg" role="group" aria-label="Qué exportar">' +
    Object.keys(MXT)
      .map(
        (k) =>
          '<button type="button" data-mx="tipo" data-v="' +
          k +
          '" aria-pressed="' +
          (k === mx.tipo) +
          '">' +
          MXT[k] +
          '</button>',
      )
      .join('') +
    '</div>' +
    '<div class="mx-fil"><div class="field"><label for="mx-b">Buscar</label><input id="mx-b" type="search" autocomplete="off"></div><div class="field"><label for="mx-g">Carta o menú</label><select id="mx-g"><option value="">Todo</option>' +
    ks.map((n) => '<option>' + esc(n) + '</option>').join('') +
    '</select></div>' +
    '<button class="btn" type="button" data-mx="todos">Marcar todos</button><button class="btn" type="button" data-mx="ninguno">Quitar</button></div>' +
    '<div class="mx-lista" id="mx-lista"></div>' +
    '<p class="hint" id="mx-n" aria-live="polite"></p>' +
    '<div class="mx-pie"><button class="btn primary" type="button" data-mx="pdf">PDF único</button><button class="btn" type="button" data-mx="png">Imágenes PNG</button><button class="btn" type="button" data-mx="xlsx">Excel</button></div>';
  $('multi').hidden = false;
  document.body.style.overflow = 'hidden';
  mxPintar();
  $('mx-b').focus({ preventScroll: true });
}
function cerrarMulti() {
  if (mx.ocupado) return;
  $('multi').hidden = true;
  $('multi').innerHTML = '';
  document.body.style.overflow = '';
  if (mx.vuelve && mx.vuelve.isConnected) mx.vuelve.focus();
}
function mxPintar() {
  const l = mxLista();
  $('mx-lista').innerHTML = l.length
    ? l
        .map(
          (p) =>
            '<label class="mx-it"><input type="checkbox" data-id="' +
            esc(p.id) +
            '"' +
            (mx.sel.has(p.id) ? ' checked' : '') +
            '><span><b>' +
            esc(p.nombre || 'Sin nombre') +
            '</b><small>' +
            esc(grupoDe(p)) +
            '</small></span></label>',
        )
        .join('')
    : '<p class="hint" style="padding:12px 0">Nada coincide con la búsqueda.</p>';
  mxCuenta();
}
function mxCuenta(msg) {
  const n = mx.sel.size,
    docs = n * (mx.tipo === 'dos' ? 2 : 1);
  $('mx-n').textContent =
    msg ||
    (n
      ? n +
        (n === 1 ? ' ficha marcada' : ' fichas marcadas') +
        (mx.tipo === 'dos' ? ' · escandallo y receta de cada una (' + docs + ' documentos)' : '') +
        '. El PDF las reúne en un solo documento; las imágenes van una por ficha' +
        (docs > 1 ? ', juntas en un archivo ZIP' : '') +
        '.'
      : 'Marca las fichas que quieras exportar.');
  $('multi')
    .querySelectorAll('.mx-pie .btn')
    .forEach((b) => {
      b.disabled = !n || mx.ocupado;
    });
}
const pausa = () => new Promise((ok) => setTimeout(ok, 0));
async function exportarVarios(fmt) {
  if (mx.ocupado || !mx.sel.size) return;
  const ps = ordenados(S.platos).filter((p) => mx.sel.has(p.id)),
    ps2 = ps.filter((p) => !p.base).concat(ps.filter((p) => p.base)),
    infs = [];
  ps2.forEach((p) => {
    if (mx.tipo !== 'rec') {
      const i = infFicha(p);
      i.arch = 'escandallo-';
      i.hoja = mx.tipo === 'dos' ? 'E ' : '';
      infs.push(i);
    }
    if (mx.tipo !== 'esc') {
      const i = infReceta(p, 1);
      i.arch = 'receta-';
      i.hoja = mx.tipo === 'dos' ? 'R ' : '';
      infs.push(i);
    }
  });
  mx.ocupado = true;
  mxCuenta('Preparando 0 de ' + infs.length + '…');
  let blob,
    nombre =
      'BoomBoomCiao-' +
      (mx.tipo === 'esc' ? 'escandallos' : mx.tipo === 'rec' ? 'recetas' : 'escandallos-y-recetas') +
      '-' +
      hoy();
  try {
    if (fmt === 'xlsx') {
      blob = xlsxDe(infs);
      nombre += '.xlsx';
    } else {
      try {
        await Promise.all(
          [
            '52px Anton',
            '60px "Instrument Serif"',
            '21px "Hanken Grotesk"',
            '600 21px "Hanken Grotesk"',
            '500 17px "DM Mono"',
          ].map((f) => document.fonts.load(f)),
        );
      } catch (e) {}
      const partes = [],
        vistos = {};
      for (let k = 0; k < infs.length; k++) {
        const inf = infs[k];
        mxCuenta('Preparando ' + (k + 1) + ' de ' + infs.length + '…');
        await pausa();
        if (fmt === 'pdf')
          lienzos(inf, true).forEach((cv) => {
            partes.push(jpgDe(cv));
            cv.width = cv.height = 0;
          });
        else {
          const cv = lienzos(inf, false)[0],
            b = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
          cv.width = cv.height = 0;
          let nm = inf.arch + (norm(inf.titulo).replace(/ /g, '-') || 'ficha'),
            n2 = nm,
            c = 2;
          while (vistos[n2]) n2 = nm + '-' + c++;
          vistos[n2] = 1;
          partes.push([n2 + '.png', infs.length > 1 ? new Uint8Array(await b.arrayBuffer()) : b]);
        }
      }
      if (fmt === 'pdf') {
        blob = pdfDe(partes);
        nombre += '.pdf';
      } else if (partes.length === 1) {
        blob = partes[0][1];
        nombre = 'BoomBoomCiao-' + partes[0][0];
      } else {
        blob = zip(partes, 'application/zip');
        nombre += '-imagenes.zip';
      }
    }
  } catch (e) {
    mx.ocupado = false;
    mxCuenta();
    toast('No se pudo preparar el archivo.');
    return;
  }
  mx.ocupado = false;
  mxCuenta();
  const ok = await entregar(blob, nombre);
  if (ok) cerrarMulti();
}
$('multi').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mx]');
  if (!b) return;
  const a = b.dataset.mx;
  if (a === 'cerrar') cerrarMulti();
  else if (a === 'tipo') {
    mx.tipo = b.dataset.v;
    $('multi')
      .querySelectorAll('[data-mx="tipo"]')
      .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    mxCuenta();
  } else if (a === 'todos') {
    mxLista().forEach((p) => mx.sel.add(p.id));
    mxPintar();
  } else if (a === 'ninguno') {
    mx.sel.clear();
    mxPintar();
  } else exportarVarios(a);
});
$('multi').addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'mx-g') {
    mx.g = t.value;
    mxPintar();
  } else if (t.dataset.id) {
    if (t.checked) mx.sel.add(t.dataset.id);
    else mx.sel.delete(t.dataset.id);
    mxCuenta();
  }
});
let mxT;
$('multi').addEventListener('input', (e) => {
  if (e.target.id === 'mx-b') {
    clearTimeout(mxT);
    mxT = setTimeout(() => {
      mx.f = e.target.value;
      mxPintar();
    }, 140);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('multi').hidden) cerrarMulti();
});
