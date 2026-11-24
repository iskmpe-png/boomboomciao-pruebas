/* ---- Fotos de limpieza (APPCC › Limpieza) ----
   Cada persona sube las fotos que quiera de cada zona (área de pastas, almacén…). Se ven en APPCC
   durante unas horas (24 por defecto, máximo 48) y después se borran solas para dejar sitio a las
   siguientes. El registro de limpieza (quién, qué zona, a qué hora) se queda para la inspección. */
const LIMP = 'limpieza';
const horasFotos = () => S.ajustes.horasFotos || 24;
const fotoViva = (f) => Date.now() - (Date.parse(f.subido) || 0) < horasFotos() * 36e5;
const urlsLimp = new Map();
async function subirFotoLimpieza(reg, k, file) {
  const blob = await reducir(file, 1400),
    ruta = (rid || 'local') + '/' + reg.fecha + '/' + reg.id + '-' + k + '-' + Date.now().toString(36) + '.jpg',
    f = { ruta: ruta, tam: blob.size, subido: new Date().toISOString() };
  if (!enNube()) {
    await idb.set('limp:' + ruta, blob);
    return f;
  }
  try {
    const r = await sb.storage.from(LIMP).upload(ruta, blob, { contentType: 'image/jpeg', upsert: true });
    if (r.error) throw r.error;
  } catch (e) {
    await idb.set('limpend:' + ruta, blob);
    f.pendiente = true;
  }
  return f;
}
async function fotosA(reg, files, alAvanzar) {
  let mal = 0,
    hechas = 0;
  const base = reg.fotos.length;
  const res = await enParalelo(
    files,
    async (file, k) => {
      try {
        const f = await subirFotoLimpieza(reg, base + k, file);
        hechas++;
        if (alAvanzar) alAvanzar(hechas, files.length);
        return f;
      } catch (e) {
        mal++;
        return null;
      }
    },
    3,
  );
  res.forEach((f) => {
    if (f) reg.fotos.push(f);
  });
  guardar('appcc', reg, true);
  if (mal) toast(mal === 1 ? 'Una foto no se pudo abrir (en iPhone: Ajustes › Cámara › Formatos › «Más compatible»).' : mal + ' fotos no se pudieron abrir.');
  if (pant === 'appcc') pintaGaleria();
  return { ok: files.length - mal, mal: mal, pendientes: res.filter((f) => f && f.pendiente).length };
}
async function blobLimp(ruta) {
  const l = (await idb.get('limpend:' + ruta)) || (await idb.get('limp:' + ruta));
  if (l) return l;
  if (!enNube()) return null;
  const r = await sb.storage.from(LIMP).download(ruta);
  if (r.error) throw r.error;
  return r.data;
}
/* Sube las que se quedaron sin conexión */
async function subirLimpPend() {
  if (!enNube() || sinRed) return;
  for (const a of S.appcc) {
    let ch = false;
    for (const f of a.fotos) {
      if (!f.pendiente) continue;
      const b = await idb.get('limpend:' + f.ruta);
      if (b) {
        const r = await sb.storage.from(LIMP).upload(f.ruta, b, { contentType: 'image/jpeg', upsert: true });
        if (r.error) continue;
        await idb.del('limpend:' + f.ruta);
      }
      delete f.pendiente;
      ch = true;
    }
    if (ch) guardar('appcc', a, true);
  }
}
/* Quita las fotos caducadas: del almacén (el servidor también lo hace cada pocos minutos) y del registro */
let limpiandoF = false;
async function caducarFotos() {
  if (limpiandoF || !listo() || !puede(1)) return;
  limpiandoF = true;
  try {
    const viejas = [];
    S.appcc.forEach((a) => {
      const m = a.fotos.filter((f) => !fotoViva(f));
      if (m.length) viejas.push([a, m]);
    });
    if (!viejas.length) return;
    const rutas = [].concat(...viejas.map((x) => x[1].map((f) => f.ruta)));
    await Promise.all(rutas.map((r) => Promise.all([idb.del('limp:' + r), idb.del('limpend:' + r)])));
    if (enNube() && !sinRed)
      try {
        await sb.storage.from(LIMP).remove(rutas);
      } catch (e) {}
    viejas.forEach(([a, m]) => {
      a.fotos = a.fotos.filter((f) => m.indexOf(f) < 0);
      a.fotosBorradas += m.length;
      m.forEach((f) => {
        const u = urlsLimp.get(f.ruta);
        if (u) URL.revokeObjectURL(u);
        urlsLimp.delete(f.ruta);
      });
      guardar('appcc', a, true);
    });
  } finally {
    limpiandoF = false;
  }
}
setInterval(() => {
  caducarFotos();
  subirLimpPend();
}, 15 * 60000);
window.addEventListener('online', () => setTimeout(subirLimpPend, 4000));
const queda = (f) => {
  const h = Math.max(0, horasFotos() - (Date.now() - Date.parse(f.subido)) / 36e5);
  return h >= 1 ? 'se borra en ' + Math.round(h) + ' h' : 'se borra en menos de 1 h';
};
/* Lo que toca limpiar hoy según el horario de turnos, y si ya se hizo */
function limpiezaHoyHTML() {
  const d = String(new Date().getDay());
  const filas = filasHoy().filter((f) => /limpi/.test(norm(f.tarea)) && (f.am[d] || f.pm[d]));
  if (!filas.length) return '';
  const hechos = S.appcc.filter((a) => a.tipo === 'limpieza' && a.fecha === hoy());
  const hecho = (txt) =>
    hechos.filter((a) => partesP(txt).some((p) => partesP(a.quien).indexOf(p) >= 0 || (quienEs(p).length === 1 && quienEs(p)[0].user_id === a.por)));
  return (
    '<section class="card"><h3>Hoy toca</h3><div class="rows">' +
    filas
      .map((f) =>
        ['am', 'pm']
          .filter((fr) => f[fr][d])
          .map((fr) => {
            const h = hecho(f[fr][d]),
              nf = suma(h, (a) => a.fotos.length + a.fotosBorradas);
            return (
              '<div class="row"><span class="n"><b>' + esc(f.tarea) + '</b><span>' + (fr === 'am' ? 'Mañana' : 'Tarde') + ' · ' + esc(f[fr][d]) + '</span></span><span class="d">' +
              (h.length ? '<span class="pill ok">Hecho' + (nf ? ' · ' + nf + (nf === 1 ? ' foto' : ' fotos') : '') + '</span>' : '<span class="pill warn">Pendiente</span>') +
              '</span></div>'
            );
          })
          .join(''),
      )
      .join('') +
    '</div></section>'
  );
}
/* Galería de las fotos vivas, por persona y zona */
function galeriaHTML() {
  return '<section class="card" id="lf-gal"></section>';
}
function pintaGaleria() {
  const el = $('lf-gal');
  if (!el) return;
  const regs = S.appcc.filter((a) => a.tipo === 'limpieza' && a.fotos.some(fotoViva)).sort((a, z) => (z.fecha + z.hora).localeCompare(a.fecha + a.hora)),
    porQuien = {};
  regs.forEach((a) => {
    const k = a.quien || nombre(a.por) || 'Sin nombre';
    (porQuien[k] || (porQuien[k] = [])).push(a);
  });
  el.innerHTML =
    '<div class="acciones" style="justify-content:space-between"><h3>Fotos de limpieza</h3>' +
    (puede(2)
      ? '<label class="lf-h">Se guardan <select id="lf-horas" aria-label="Horas que se guardan las fotos">' + [12, 24, 36, 48].map((h) => '<option value="' + h + '"' + (h === horasFotos() ? ' selected' : '') + '>' + h + ' h</option>').join('') + '</select></label>'
      : '<span class="hint">Se guardan ' + horasFotos() + ' h</span>') +
    '</div>' +
    (regs.length
      ? Object.keys(porQuien)
          .sort((a, z) => a.localeCompare(z, 'es'))
          .map(
            (k) =>
              '<div class="lf-p"><h4>' + esc(k) + '</h4>' +
              porQuien[k]
                .map(
                  (a) =>
                    '<div class="lf-z"><p><b>' + esc(a.punto) + '</b> <span class="hint">' + esc((a.fecha !== hoy() ? fFecha(a.fecha) + ' ' : '') + a.hora + ' · ' + queda(a.fotos.filter(fotoViva)[0])) + '</span></p><div class="lf-fotos">' +
                    a.fotos
                      .filter(fotoViva)
                      .map((f) => '<button type="button" class="lf-f" data-act="lf-ver" data-ruta="' + esc(f.ruta) + '" aria-label="Ver foto de ' + esc(a.punto) + '"><img alt="" data-ruta="' + esc(f.ruta) + '">' + (f.pendiente ? '<span>sin subir</span>' : '') + '</button>')
                      .join('') +
                    '</div></div>',
                )
                .join('') +
              '</div>',
          )
          .join('')
      : '<p class="hint">Aún no hay fotos. Elige «Limpieza» arriba, escribe la zona y añade las fotos que quieras. Se borran solas a las ' + horasFotos() + ' h.</p>');
  el.querySelectorAll('img[data-ruta]').forEach(async (im) => {
    const r = im.dataset.ruta;
    try {
      let u = urlsLimp.get(r);
      if (!u) {
        const b = await blobLimp(r);
        if (!b) return;
        u = URL.createObjectURL(b);
        urlsLimp.set(r, u);
      }
      im.src = u;
    } catch (e) {
      im.closest('.lf-f').classList.add('rota');
    }
  });
}
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="lf-ver"]');
  if (!b) return;
  const u = urlsLimp.get(b.dataset.ruta);
  if (!u) return;
  capa(capaTop('Foto de limpieza', '') + '<div class="visor"><img src="' + u + '" alt="Foto de limpieza"></div>');
});
V.addEventListener('change', (e) => {
  if (e.target.id === 'lf-horas' && puede(2)) {
    S.ajustes.horasFotos = +e.target.value;
    guardar('ajustes', S.ajustes, true);
    toast('Las fotos de limpieza se guardarán ' + S.ajustes.horasFotos + ' horas.');
  }
});
