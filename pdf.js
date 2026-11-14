/* PDF mínimo: una imagen JPEG por página A4 */
function jpgDe(cv) {
  const bin = atob(cv.toDataURL('image/jpeg', 0.9).split(',')[1]),
    jpg = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) jpg[k] = bin.charCodeAt(k);
  return { jpg: jpg, width: cv.width, height: cv.height };
}
function pdfDe(cvs) {
  const enc = new TextEncoder(),
    partes = [],
    offs = [];
  let len = 0;
  const add = (u) => {
      partes.push(u);
      len += u.length;
    },
    txt = (s) => add(enc.encode(s));
  const obj = (n, cuerpo, stream) => {
    offs[n] = len;
    txt(n + ' 0 obj\n' + cuerpo + '\n');
    if (stream) {
      txt('stream\n');
      add(stream);
      txt('\nendstream\n');
    }
    txt('endobj\n');
  };
  txt('%PDF-1.4\n');
  const n = cvs.length,
    kids = [];
  cvs.forEach((cv, i) => {
    if (!cv.jpg) cv = jpgDe(cv);
    const jpg = cv.jpg;
    const pg = 3 + i * 3,
      ct = pg + 1,
      im = pg + 2,
      ph = ((595.28 * cv.height) / cv.width).toFixed(2),
      c = enc.encode('q 595.28 0 0 ' + ph + ' 0 0 cm /Im0 Do Q');
    kids.push(pg + ' 0 R');
    obj(
      pg,
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 ' +
        ph +
        '] /Resources << /XObject << /Im0 ' +
        im +
        ' 0 R >> >> /Contents ' +
        ct +
        ' 0 R >>',
    );
    obj(ct, '<< /Length ' + c.length + ' >>', c);
    obj(
      im,
      '<< /Type /XObject /Subtype /Image /Width ' +
        cv.width +
        ' /Height ' +
        cv.height +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
        jpg.length +
        ' >>',
      jpg,
    );
  });
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>');
  const total = 2 + n * 3,
    xref = len;
  let x = 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n';
  for (let k = 1; k <= total; k++) x += String(offs[k]).padStart(10, '0') + ' 00000 n \n';
  txt(x + 'trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
  return new Blob(partes, { type: 'application/pdf' });
}
