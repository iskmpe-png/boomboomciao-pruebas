/* ---- Documentos: sacar el contenido de Excel, CSV, PDF, texto y fotos ---- */
const cargarScript = (src) =>
  new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = ok;
    s.onerror = () => ko(new Error('No se pudo cargar una parte de la app. Revisa la conexión.'));
    document.head.appendChild(s);
  });
const libExcel = () => (window.XLSX ? Promise.resolve() : cargarScript(LIBS.xlsx));
const libPdf = () =>
  (window.pdfjsLib ? Promise.resolve() : cargarScript(LIBS.pdf)).then(() => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
  });
const tipoDoc = (f) => {
  const n = f.name.toLowerCase();
  if (/\.(xlsx|xls|ods)$/.test(n)) return 'excel';
  if (/\.(csv|tsv|txt)$/.test(n) || /^text\//.test(f.type)) return 'texto';
  if (/\.pdf$/.test(n) || f.type === 'application/pdf') return 'pdf';
  if (/^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/.test(n)) return 'imagen';
  return '';
};
/* Devuelve { textos: [texto…], imagenes: [Blob…] } con lo que hay dentro del archivo */
async function leerDocumento(f) {
  const tipo = tipoDoc(f);
  if (tipo === 'imagen') return { textos: [], imagenes: [await reducir(f, 1800)] };
  if (tipo === 'texto') return { textos: [await f.text()], imagenes: [] };
  if (tipo === 'excel') {
    await libExcel();
    const wb = window.XLSX.read(await f.arrayBuffer(), { type: 'array' });
    return {
      textos: wb.SheetNames.map(
        (n) => 'HOJA: ' + n + '\n' + window.XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: ';', blankrows: false }),
      ).filter((t) => t.length > 12),
      imagenes: [],
    };
  }
  if (tipo === 'pdf') {
    await libPdf();
    const pdf = await window.pdfjsLib.getDocument({ data: await f.arrayBuffer(), isEvalSupported: false }).promise;
    const n = Math.min(pdf.numPages, 60),
      textos = [],
      imagenes = [];
    for (let k = 1; k <= n; k++) {
      const pg = await pdf.getPage(k),
        tc = await pg.getTextContent();
      /* Se reconstruyen las líneas juntando los trozos que están a la misma altura */
      const filas = {};
      tc.items.forEach((it) => {
        if (!it.str || !it.str.trim()) return;
        const y = Math.round(it.transform[5] / 3);
        (filas[y] || (filas[y] = [])).push([it.transform[4], it.str]);
      });
      const t = Object.keys(filas)
        .sort((a, b) => b - a)
        .map((y) =>
          filas[y]
            .sort((a, b) => a[0] - b[0])
            .map((x) => x[1])
            .join(' ; '),
        )
        .join('\n');
      if (t.replace(/\s/g, '').length > 60) textos.push(t);
      else if (imagenes.length < 24) {
        /* Página escaneada: no tiene texto, se manda como foto */
        const vp = pg.getViewport({ scale: 1 }),
          v = pg.getViewport({ scale: Math.min(2.2, 1700 / Math.max(vp.width, vp.height)) }),
          cv = document.createElement('canvas');
        cv.width = Math.round(v.width);
        cv.height = Math.round(v.height);
        await pg.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise;
        imagenes.push(await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.85)));
        cv.width = cv.height = 0;
      }
    }
    return { textos, imagenes };
  }
  throw new Error('No sé leer «' + f.name + '». Sirven Excel, CSV, PDF, texto y fotos. Si es un Word, guárdalo como PDF.');
}
/* Parte un texto largo en trozos por líneas, para no pasarse del tamaño de una consulta */
function trocear(texto, max) {
  const out = [];
  let act = '';
  texto.split('\n').forEach((l) => {
    if (act.length + l.length + 1 > max && act) {
      out.push(act);
      act = '';
    }
    act += (act ? '\n' : '') + l.slice(0, 600);
  });
  if (act.trim()) out.push(act);
  return out;
}
