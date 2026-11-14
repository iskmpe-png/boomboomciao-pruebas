/* ---- Dibujo del informe en lienzo (PNG y páginas de PDF) ---- */
const CW = 1240,
  CM = 64,
  CPH = 1754,
  PAPEL = {
    bg: '#F3ECDD',
    ink: '#121512',
    mut: '#5E5C52',
    lin: '#D9CFB8',
    z: '#ECE4D1',
    az: '#2D3661',
    oro: '#E3C36A',
  };
function lienzos(inf, porPaginas) {
  if (inf.etiqueta) return [lienzoEt(inf.etiqueta)];
  const medir = document.createElement('canvas').getContext('2d'),
    ancho = CW - 2 * CM,
    sw = inf.cols.reduce((t, c) => t + c.w, 0);
  const xs = [];
  let x = CM;
  inf.cols.forEach((c) => {
    xs.push(x);
    x += (ancho * c.w) / sw;
  });
  xs.push(CM + ancho);
  const items = [{ k: 'th', h: 44 }];
  inf.filas.forEach((f, n) => items.push({ k: 'tr', h: 38, f: f, z: n % 2 }));
  if (!inf.filas.length) items.push({ k: 'tx', h: 36, t: 'Sin datos.' });
  if (inf.pie && inf.pie.length) {
    items.push({ k: 'gap', h: 18 });
    inf.pie.forEach((p) => items.push({ k: 'pie', h: 40, p: p }));
  }
  if (inf.texto) {
    items.push({ k: 'gap', h: 26 }, { k: 'h', h: 40, t: inf.tituloTexto || '' });
    medir.font = '22px "Hanken Grotesk",sans-serif';
    inf.texto.split('\n').forEach((par) => {
      let ln = '';
      par.split(' ').forEach((w) => {
        const t = ln ? ln + ' ' + w : w;
        if (medir.measureText(t).width > ancho && ln) {
          items.push({ k: 'tx', h: 32, t: ln });
          ln = w;
        } else ln = t;
      });
      items.push({ k: 'tx', h: 32, t: ln });
    });
  }
  const paginas = [],
    TOP1 = 300,
    TOPN = 130,
    PIE = 70;
  if (porPaginas) {
    let pg = [],
      y = TOP1;
    items.forEach((it) => {
      if (y + it.h > CPH - PIE) {
        paginas.push(pg);
        pg = [];
        y = TOPN;
        if (it.k === 'tr') {
          pg.push({ k: 'th', h: 44 });
          y += 44;
        }
      }
      pg.push(it);
      y += it.h;
    });
    paginas.push(pg);
  } else {
    const max = Math.floor((15000 - TOP1 - PIE) / 38);
    let its = items;
    if (inf.filas.length > max)
      its = [{ k: 'th', h: 44 }].concat(
        inf.filas.slice(0, max).map((f, n) => ({ k: 'tr', h: 38, f: f, z: n % 2 })),
        [
          {
            k: 'tx',
            h: 36,
            t: '… y ' + (inf.filas.length - max) + ' filas más. Usa PDF o Excel para el listado completo.',
          },
        ],
      );
    paginas.push(its);
  }
  return paginas.map((its, np) => {
    const alto = porPaginas ? CPH : TOP1 + its.reduce((t, i) => t + i.h, 0) + PIE,
      cv = document.createElement('canvas');
    cv.width = CW;
    cv.height = alto;
    const g = cv.getContext('2d');
    g.fillStyle = PAPEL.bg;
    g.fillRect(0, 0, CW, alto);
    g.textBaseline = 'alphabetic';
    const corta = (t, w) => {
      if (g.measureText(t).width <= w) return t;
      while (t.length > 1 && g.measureText(t + '…').width > w) t = t.slice(0, -1);
      return t + '…';
    };
    let y;
    if (np === 0) {
      g.fillStyle = PAPEL.az;
      g.fillRect(0, 0, CW, 150);
      g.fillStyle = '#C8A24A';
      g.fillRect(0, 150, CW, 5);
      g.fillStyle = PAPEL.oro;
      g.font = '52px Anton,Impact,sans-serif';
      g.fillText('BOOM BOOM CIAO', CM, 96);
      g.fillStyle = PAPEL.bg;
      g.font = '20px "DM Mono",monospace';
      g.textAlign = 'right';
      g.fillText('GESTIÓN DE COCINA', CW - CM, 90);
      g.textAlign = 'left';
      g.fillStyle = PAPEL.ink;
      g.font = '60px "Instrument Serif",Georgia,serif';
      g.fillText(corta(inf.titulo, ancho), CM, 232);
      g.fillStyle = PAPEL.mut;
      g.font = '20px "DM Mono",monospace';
      g.fillText(corta(inf.sub.toUpperCase(), ancho), CM, 268);
      y = TOP1;
    } else {
      g.fillStyle = PAPEL.az;
      g.fillRect(0, 0, CW, 70);
      g.fillStyle = PAPEL.oro;
      g.font = '30px Anton,Impact,sans-serif';
      g.fillText('BOOM BOOM CIAO', CM, 48);
      g.fillStyle = PAPEL.bg;
      g.font = '18px "DM Mono",monospace';
      g.textAlign = 'right';
      g.fillText(corta(inf.titulo.toUpperCase(), 600) + ' · ' + (np + 1), CW - CM, 46);
      g.textAlign = 'left';
      y = TOPN;
    }
    const celda = (t, c, by) => {
      const w = xs[c + 1] - xs[c] - 14;
      t = corta(t, w);
      if (inf.cols[c].r) {
        g.textAlign = 'right';
        g.fillText(t, xs[c + 1] - 8, by);
        g.textAlign = 'left';
      } else g.fillText(t, xs[c] + (c ? 6 : 8), by);
    };
    its.forEach((it) => {
      if (it.k === 'th') {
        g.fillStyle = PAPEL.az;
        g.fillRect(CM, y, ancho, it.h - 6);
        g.fillStyle = PAPEL.bg;
        g.font = '500 17px "DM Mono",monospace';
        inf.cols.forEach((c, n) => celda(c.t.toUpperCase(), n, y + 25));
      } else if (it.k === 'tr') {
        if (it.z) {
          g.fillStyle = PAPEL.z;
          g.fillRect(CM, y, ancho, it.h);
        }
        g.fillStyle = PAPEL.ink;
        it.f.forEach((c, n) => {
          g.font = (n === 0 ? '600 ' : '') + '21px "Hanken Grotesk",sans-serif';
          celda(c.t, n, y + 26);
        });
      } else if (it.k === 'pie') {
        g.strokeStyle = PAPEL.lin;
        g.beginPath();
        g.moveTo(CM + ancho * 0.45, y);
        g.lineTo(CM + ancho, y);
        g.stroke();
        g.fillStyle = PAPEL.mut;
        g.font = '500 17px "DM Mono",monospace';
        g.fillText(it.p[0].toUpperCase(), CM + ancho * 0.45 + 8, y + 27);
        g.fillStyle = PAPEL.az;
        g.font = '700 23px "Hanken Grotesk",sans-serif';
        g.textAlign = 'right';
        g.fillText(it.p[1].t, CM + ancho - 8, y + 28);
        g.textAlign = 'left';
      } else if (it.k === 'h') {
        g.fillStyle = PAPEL.az;
        g.font = '500 18px "DM Mono",monospace';
        g.fillText(it.t.toUpperCase(), CM, y + 26);
      } else if (it.k === 'tx') {
        g.fillStyle = PAPEL.ink;
        g.font = '22px "Hanken Grotesk",sans-serif';
        g.fillText(it.t, CM, y + 24);
      }
      y += it.h;
    });
    return cv;
  });
}
