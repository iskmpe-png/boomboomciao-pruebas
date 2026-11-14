/* Excel mínimo: libro .xlsx con una hoja, sin librerías */
let crcT = null;
function crc32(u) {
  if (!crcT) {
    crcT = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcT[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < u.length; i++) c = crcT[(c ^ u[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zip(archivos, tipo) {
  const enc = new TextEncoder(),
    partes = [],
    central = [];
  let off = 0;
  archivos.forEach((a) => {
    const nm = enc.encode(a[0]),
      d = typeof a[1] === 'string' ? enc.encode(a[1]) : a[1],
      crc = crc32(d),
      h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true);
    h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, d.length, true);
    h.setUint32(22, d.length, true);
    h.setUint16(26, nm.length, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, d.length, true);
    c.setUint32(24, d.length, true);
    c.setUint16(28, nm.length, true);
    c.setUint32(42, off, true);
    partes.push(new Uint8Array(h.buffer), nm, d);
    central.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + d.length;
  });
  const cl = central.reduce((t, u) => t + u.length, 0),
    e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, archivos.length, true);
  e.setUint16(10, archivos.length, true);
  e.setUint32(12, cl, true);
  e.setUint32(16, off, true);
  return new Blob(partes.concat(central, [new Uint8Array(e.buffer)]), {
    type: tipo || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
function xlsxDe(infs) {
  if (!Array.isArray(infs)) infs = [infs];
  const X = (s) =>
    String(s)
      .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const L = (n) => String.fromCharCode(65 + n),
    H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',
    usados = {},
    nombres = [];
  const hojas = infs.map((inf) => {
    let r = 0;
    const filas = [],
      nc = inf.cols.length,
      u = nc - 1,
      vacia = () => inf.cols.map(() => ({ v: '' }));
    const celda = (c, n, st) => {
      if (c == null) return '';
      const ref = L(n) + r;
      if (c.f != null)
        return (
          '<c r="' +
          ref +
          '" s="' +
          st +
          '"><f>' +
          X(c.f) +
          '</f>' +
          (typeof c.v === 'number' ? '<v>' + c.v + '</v>' : '') +
          '</c>'
        );
      if (typeof c.v === 'number') return '<c r="' + ref + '" s="' + st + '"><v>' + c.v + '</v></c>';
      return c.v === '' || c.v == null
        ? '<c r="' + ref + '" s="' + st + '"/>'
        : '<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><t xml:space="preserve">' + X(c.v) + '</t></is></c>';
    };
    const fila = (cs, est, alto) => {
      r++;
      filas.push(
        '<row r="' +
          r +
          '"' +
          (alto ? ' ht="' + alto + '" customHeight="1"' : '') +
          '>' +
          cs.map((c, n) => celda(c, n, c == null ? 0 : est(c, n))).join('') +
          '</row>',
      );
    };
    const nst = (c, b) =>
      typeof c.v !== 'number' ? (b ? 9 : 5) : c.k === 'e' ? (b ? 11 : 7) : c.k === 'p' ? (b ? 12 : 8) : b ? 10 : 6;
    let c0 = vacia();
    c0[0] = { v: 'Boom Boom Ciao · ' + inf.titulo };
    fila(c0, () => 1, 32);
    c0 = vacia();
    c0[0] = { v: inf.sub || '' };
    fila(c0, () => 2, 20);
    fila([]);
    fila(
      inf.cols.map((c) => ({ v: c.t })),
      (c, n) => (inf.cols[n].r ? 4 : 3),
      22,
    );
    const f0 = r + 1;
    inf.filas.forEach((f) => {
      const rr = r + 1;
      fila(
        f.map((c) => (c && c.f != null ? { v: c.v, k: c.k, f: c.f.replace(/\{R\}/g, rr) } : c)),
        (c) => nst(c),
      );
    });
    const f1 = r;
    if (inf.pie && inf.pie.length) {
      fila([]);
      const p0 = r + 1;
      inf.pie.forEach((p) => {
        const cs = [];
        for (let k = 0; k < nc; k++) cs.push(null);
        let f = p[2];
        if (f != null && f1 >= f0)
          f = f
            .replace(/\{SUMA\}/g, 'SUM(' + L(u) + f0 + ':' + L(u) + f1 + ')')
            .replace(/\{P(\d+)\}/g, (m, i) => '$' + L(u) + '$' + (p0 + Number(i)));
        else f = null;
        if (u > 0) cs[u - 1] = { v: p[0] };
        cs[u] = { v: p[1].v, k: p[1].k, f: f };
        fila(cs, (c, n) => (n === u ? nst(c, 1) : 9), 20);
      });
    }
    if (inf.texto) {
      fila([]);
      fila([{ v: inf.tituloTexto || '' }], () => 14);
      inf.texto.split('\n').forEach((t) => fila([{ v: t }], () => 13));
    }
    const cols =
      '<cols>' +
      inf.cols
        .map(
          (c, n) =>
            '<col min="' +
            (n + 1) +
            '" max="' +
            (n + 1) +
            '" width="' +
            Math.round(c.w * 11 + 5) +
            '" customWidth="1"/>',
        )
        .join('') +
      '</cols>';
    const base =
      ((inf.hoja || '') + inf.titulo)
        .replace(/[\[\]:*?\/\\"<>&']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'Hoja';
    let nb = base.slice(0, 31).trim(),
      k = 2;
    while (usados[nb.toLowerCase()]) {
      const suf = ' ' + k++;
      nb = base.slice(0, 31 - suf.length).trim() + suf;
    }
    usados[nb.toLowerCase()] = 1;
    nombres.push(nb);
    return (
      H +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      cols +
      '<sheetData>' +
      filas.join('') +
      '</sheetData>' +
      (nc > 1
        ? '<mergeCells count="2"><mergeCell ref="A1:' + L(u) + '1"/><mergeCell ref="A2:' + L(u) + '2"/></mergeCells>'
        : '') +
      '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/></worksheet>'
    );
  });
  const n = hojas.length,
    F = (extra, color) => '<font>' + extra + '<sz val="11"/><color rgb="' + color + '"/><name val="Calibri"/></font>',
    fill = (c) =>
      '<fill><patternFill patternType="solid"><fgColor rgb="' + c + '"/><bgColor indexed="64"/></patternFill></fill>';
  const xf = (nf, fo, fi, bo, al) =>
    '<xf numFmtId="' +
    nf +
    '" fontId="' +
    fo +
    '" fillId="' +
    fi +
    '" borderId="' +
    bo +
    '" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"' +
    (al || '') +
    '/></xf>';
  const estilos =
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="165" formatCode="#,##0.00\\ &quot;€&quot;"/><numFmt numFmtId="166" formatCode="0.0\\ &quot;%&quot;"/></numFmts>' +
    '<fonts count="6">' +
    F('', 'FF121512') +
    F('<b/>', 'FF121512') +
    '<font><b/><sz val="16"/><color rgb="FFF3ECDD"/><name val="Calibri"/></font>' +
    F('', 'FFE3C36A') +
    F('<b/>', 'FF2D3661') +
    F('<b/>', 'FF2D3661') +
    '</fonts>' +
    '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    fill('FF2D3661') +
    fill('FFF3ECDD') +
    fill('FFE9DFC8') +
    '</fills>' +
    '<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFD8CFBB"/></bottom><diagonal/></border><border><left/><right/><top/><bottom style="medium"><color rgb="FFC8A24A"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="15">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    xf(0, 2, 2, 0, ' indent="1"') +
    xf(0, 3, 2, 2, ' indent="1"') +
    xf(0, 4, 4, 0, ' indent="1"') +
    xf(0, 4, 4, 0, ' horizontal="right"') +
    xf(0, 0, 0, 1, ' indent="1"') +
    xf(0, 0, 0, 1) +
    xf(165, 0, 0, 1) +
    xf(166, 0, 0, 1) +
    xf(0, 1, 3, 0, ' indent="1"') +
    xf(0, 1, 3, 0) +
    xf(165, 1, 3, 0) +
    xf(166, 1, 3, 0) +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>';
  return zip(
    [
      [
        '[Content_Types].xml',
        H +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          hojas
            .map(
              (h, i) =>
                '<Override PartName="/xl/worksheets/sheet' +
                (i + 1) +
                '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
            )
            .join('') +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      ],
      [
        '_rels/.rels',
        H +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      ],
      [
        'xl/workbook.xml',
        H +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>' +
          nombres
            .map((nb, i) => '<sheet name="' + X(nb) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>')
            .join('') +
          '</sheets><calcPr fullCalcOnLoad="1"/></workbook>',
      ],
      [
        'xl/_rels/workbook.xml.rels',
        H +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          hojas
            .map(
              (h, i) =>
                '<Relationship Id="rId' +
                (i + 1) +
                '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' +
                (i + 1) +
                '.xml"/>',
            )
            .join('') +
          '<Relationship Id="rId' +
          (n + 1) +
          '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      ],
      ['xl/styles.xml', H + estilos],
    ].concat(hojas.map((h, i) => ['xl/worksheets/sheet' + (i + 1) + '.xml', h])),
  );
}
const dlP = Promise.resolve(
  window.claude && typeof window.claude.use === 'function' ? window.claude.use('downloads') : null,
).catch(() => null);
async function exportar(tipo) {
  const inf = informe();
  if (!inf) {
    toast('No hay nada que exportar aquí.');
    return;
  }
  toast('Preparando el archivo…');
  let blob;
  try {
    if (tipo === 'xlsx') blob = xlsxDe(inf);
    else {
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
      const cvs = lienzos(inf, tipo === 'pdf');
      blob = tipo === 'pdf' ? pdfDe(cvs) : await new Promise((ok) => cvs[0].toBlob(ok, 'image/png'));
    }
  } catch (e) {
    toast('No se pudo preparar el archivo.');
    return;
  }
  await entregar(blob, 'BoomBoomCiao-' + (norm(inf.titulo).replace(/ /g, '-') || 'informe') + '-' + hoy() + '.' + tipo);
}
async function entregar(blob, nombre) {
  const dl = await dlP;
  if (dl) {
    try {
      await dl.save({ filename: nombre, data: blob });
      toast('Archivo guardado.');
      return true;
    } catch (e) {
      const c = e && e.code;
      if (c === 'declined') {
        $('toast').hidden = true;
        return false;
      }
      toast(
        c === 'rate_limited'
          ? 'Espera un momento y vuelve a intentarlo.'
          : 'Aquí no se pueden guardar archivos. Abre la página desde claude.ai.',
      );
      return false;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Archivo listo: ' + nombre);
  return true;
}
