/* ---- Papeles: documentos que envía dirección y firma cada persona ----
   Firma simple con evidencias: se guarda la huella del archivo, cuándo se abrió, el nombre, el trazo,
   la hora del servidor y un sello. Nada se puede cambiar después (script 011).
   Para contratos y anexos hace falta además un proveedor de firma avanzada. */
const PA = { mios: null, enviados: null, leido: 0, leidoE: 0, abierto: null, urls: [] };
const RES_P = { firmado: 'Firmado', leido: 'Leído', no_conforme: 'No conforme' };
const errPa = (e) => (/does not exist|schema cache|PGRST20|Bucket not found|42P01/i.test((e && (e.message || e.code)) || '') ? 'Falta instalar el script 011 en la base de datos.' : errTxt(e));
const cuandoTxt = (f) => (f ? diaTxt(diaMad(f)) + ' ' + horaMad(f) : '');
async function huellaDe(blob) {
  const h = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function leerMisPapeles() {
  const r = await sb.from('papeles_envios').select('papel_id,visto,resultado,respondido,sello,comentario,papel:papeles!inner(id,titulo,requiere,archivo,nombre_archivo,huella,limite,creado,restaurante_id)').eq('user_id', miId).eq('papel.restaurante_id', rid);
  if (r.error) throw r.error;
  PA.mios = (r.data || []).sort((a, z) => !!a.resultado - !!z.resultado || z.papel.creado.localeCompare(a.papel.creado));
  PA.leido = Date.now();
}
const pendientesP = () => (PA.mios || []).filter((e) => !e.resultado);

/* Aviso en la portada «Hoy» */
let leyendoP = false;
function avisoPapelesInterior() {
  const n = pendientesP().length;
  return n ? '<a class="loseta oro" style="margin-bottom:0" href="#papeles-firmar"><span>' + (n === 1 ? 'documento pendiente de tu respuesta' : 'documentos pendientes de tu respuesta') + '</span><b>' + n + '</b></a>' : '';
}
function avisoPapelesHTML() {
  if (hayFichaje() && Date.now() - PA.leido > 120000 && !leyendoP) {
    leyendoP = true;
    leerMisPapeles()
      .then(() => {
        if ($('hoy-papeles')) $('hoy-papeles').innerHTML = avisoPapelesInterior();
      })
      .catch(() => {
        PA.leido = Date.now();
      })
      .finally(() => {
        leyendoP = false;
      });
  }
  return '<div id="hoy-papeles" class="col">' + avisoPapelesInterior() + '</div>';
}

/* ======== Mis papeles ======== */
function misPapelesHTML() {
  if (!PA.mios) return '<section class="card estado"><strong>Cargando tus papeles…</strong></section>';
  if (!PA.mios.length) return '<section class="card estado"><strong>No tienes documentos</strong><span>Cuando dirección te envíe uno, aparecerá aquí.</span></section>';
  return PA.mios
    .map((e) => {
      const d = e.papel;
      return (
        '<section class="card doc-f"><span class="grow"><b>' + esc(d.titulo) + '</b><small>' +
        (e.resultado ? RES_P[e.resultado] + ' · ' + cuandoTxt(e.respondido) : 'Enviado ' + cuandoTxt(d.creado) + (d.limite ? ' · responder antes del ' + diaTxt(d.limite) : '')) +
        '</small></span>' +
        (e.resultado ? '<span class="est ' + (e.resultado === 'no_conforme' ? 'mal' : 'ok') + '">' + RES_P[e.resultado] + '</span><button class="btn small" type="button" data-pa="abrir" data-id="' + d.id + '">Ver</button>' : '<button class="btn oro" type="button" data-pa="abrir" data-id="' + d.id + '">' + (d.requiere === 'firma' ? 'Leer y firmar' : 'Leer') + '</button>') +
        '</section>'
      );
    })
    .join('');
}
function vPapeles() {
  if (!hayFichaje()) return sinNube('firmar');
  ponPantalla('firmar', misPapelesHTML() + '<p class="hint">Cada persona ve solo sus documentos. Puedes pedir copia en papel a dirección.</p>');
  if (Date.now() - PA.leido < 15000 && PA.mios) return;
  leerMisPapeles()
    .then(() => {
      if (pant === 'firmar') ponPantalla('firmar', misPapelesHTML() + '<p class="hint">Cada persona ve solo sus documentos. Puedes pedir copia en papel a dirección.</p>');
    })
    .catch((e) => ponPantalla('firmar', '<section class="card estado"><strong>No se pudieron cargar</strong><span>' + esc(errPa(e)) + '</span></section>'));
}

/* ======== Leer y responder ======== */
const soltarUrls = () => {
  PA.urls.forEach((u) => URL.revokeObjectURL(u));
  PA.urls = [];
};
async function bajar(ruta) {
  const r = await sb.storage.from('papeles').download(ruta);
  if (r.error) throw r.error;
  return r.data;
}
async function pintaDocumento(blob, nombre, destino) {
  soltarUrls();
  const url = URL.createObjectURL(blob);
  PA.urls.push(url);
  destino.innerHTML = '<a class="btn small" href="' + url + '" download="' + esc(nombre || 'documento') + '">Descargar copia</a><div class="col" id="pa-hojas"></div>';
  const hojas = $('pa-hojas');
  if (blob.type !== 'application/pdf' && !/\.pdf$/i.test(nombre)) {
    hojas.innerHTML = '<img src="' + url + '" alt="Documento" style="width:100%;border-radius:12px">';
    return;
  }
  await libPdf();
  const pdf = await window.pdfjsLib.getDocument({ data: await blob.arrayBuffer(), isEvalSupported: false }).promise;
  for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
    if (!hojas.isConnected) return;
    const pg = await pdf.getPage(i),
      vp = pg.getViewport({ scale: 1.6 }),
      c = document.createElement('canvas');
    c.width = vp.width;
    c.height = vp.height;
    c.style.cssText = 'width:100%;background:#fff;border-radius:10px';
    hojas.appendChild(c);
    await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  }
  if (pdf.numPages > 30) hojas.insertAdjacentHTML('beforeend', '<p class="hint">Se muestran 30 páginas. Descarga la copia para ver el resto.</p>');
}
async function abrirPapel(id) {
  const e = (PA.mios || []).find((x) => x.papel.id === id);
  if (!e) return;
  const d = e.papel;
  PA.abierto = { id: id, huella: '', trazos: 0 };
  capa(
    capaTop(d.titulo, e.resultado ? RES_P[e.resultado] + ' · ' + cuandoTxt(e.respondido) : d.requiere === 'firma' ? 'Léelo entero antes de firmar' : 'Léelo y confirma') +
      '<div class="col" style="max-width:720px;margin:0 auto"><section class="card col" id="pa-doc"><p class="hint">Abriendo el documento…</p></section><div id="pa-resp" class="col"></div></div>',
  );
  try {
    const blob = await bajar(d.archivo),
      h = await huellaDe(blob);
    if (!$('pa-doc') || PA.abierto.id !== id) return;
    PA.abierto.huella = h;
    await pintaDocumento(blob, d.nombre_archivo, $('pa-doc'));
    if (!$('pa-resp')) return;
    if (h !== d.huella) {
      $('pa-resp').innerHTML = '<p class="est mal">El archivo no coincide con el que se envió. No lo firmes y avisa a dirección.</p>';
      return;
    }
    if (e.resultado) {
      $('pa-resp').innerHTML = '<section class="card"><h3>Tu respuesta</h3><p>' + RES_P[e.resultado] + ' · ' + cuandoTxt(e.respondido) + '</p>' + (e.comentario ? '<p>' + esc(e.comentario) + '</p>' : '') + '<p class="hint">Sello: ' + esc(e.sello || '') + '</p></section>';
      return;
    }
    const r = await sb.rpc('abrir_papel', { p_id: id });
    if (r.error) throw r.error;
    $('pa-resp').innerHTML =
      '<form id="pa-form" class="card col" novalidate><label class="check ac-legal"><input type="checkbox" id="pa-leido"> He leído el documento completo.</label>' +
      (d.requiere === 'firma'
        ? '<label for="pa-nombre">Nombre y apellidos</label><input id="pa-nombre" type="text" autocomplete="name" maxlength="120"><label>Firma con el dedo</label><canvas id="pa-firma" class="firma-lienzo" width="640" height="200" aria-label="Recuadro para firmar"></canvas><button type="button" class="link" data-pa="limpiar">Borrar la firma</button><button class="btn grande primary" type="submit" value="firmado">Firmar documento</button>'
        : '<button class="btn grande primary" type="submit" value="leido">Confirmar lectura</button>') +
      '<details><summary>No estoy conforme</summary><div class="col"><label for="pa-motivo">Explica por qué</label><textarea id="pa-motivo" rows="3" maxlength="600"></textarea><button class="btn danger" type="submit" value="no_conforme">Registrar que no estoy conforme</button></div></details>' +
      '<p class="hint">Se guardan tu nombre, tu firma, la fecha y hora, la huella del archivo y el navegador usado. Es una firma electrónica simple.</p><p class="hint" id="pa-msg" role="status"></p></form>';
    if ($('pa-firma')) prepararLienzo($('pa-firma'));
  } catch (err) {
    if ($('pa-doc')) $('pa-doc').innerHTML = '<p class="est mal">' + esc(errPa(err)) + '</p>';
  }
}
function prepararLienzo(c) {
  const x = c.getContext('2d');
  const limpia = () => {
    x.fillStyle = '#fff';
    x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = '#1f2a5a';
    x.lineWidth = 3.5;
    x.lineCap = x.lineJoin = 'round';
    if (PA.abierto) PA.abierto.trazos = 0;
  };
  limpia();
  c.limpiar = limpia;
  let pulsado = false;
  const pos = (e) => {
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height];
  };
  c.addEventListener('pointerdown', (e) => {
    pulsado = true;
    c.setPointerCapture(e.pointerId);
    x.beginPath();
    x.moveTo(...pos(e));
  });
  c.addEventListener('pointermove', (e) => {
    if (!pulsado) return;
    x.lineTo(...pos(e));
    x.stroke();
    PA.abierto.trazos++;
  });
  ['pointerup', 'pointercancel'].forEach((n) => c.addEventListener(n, () => (pulsado = false)));
}

/* ======== Enviar (usuario maestro) ======== */
async function leerEnviados() {
  const r = await sb.from('papeles').select('id,titulo,requiere,creado,limite,huella,archivo,nombre_archivo,envios:papeles_envios(user_id,nombre,area,visto,resultado,respondido,comentario)').eq('restaurante_id', rid).order('creado', { ascending: false }).limit(60);
  if (r.error) throw r.error;
  PA.enviados = r.data || [];
  PA.leidoE = Date.now();
}
function enviadosHTML() {
  if (!PA.enviados) return '<p class="hint">Cargando…</p>';
  if (!PA.enviados.length) return '<p class="hint">Aún no has enviado ningún documento.</p>';
  return PA.enviados
    .map((d) => {
      const ok = d.envios.filter((e) => e.resultado).length;
      return (
        '<details class="card"><summary><b>' + esc(d.titulo) + '</b> <span class="est ' + (ok === d.envios.length ? 'ok' : 'aviso') + '">' + ok + ' de ' + d.envios.length + ' respondidos</span></summary><ul class="fich-lista">' +
        d.envios
          .slice()
          .sort((a, z) => a.nombre.localeCompare(z.nombre, 'es'))
          .map((e) => '<li><span><b>' + esc(e.nombre) + '</b><small>' + AREA_F[e.area] + ' · ' + (e.resultado ? RES_P[e.resultado] + ' ' + cuandoTxt(e.respondido) + (e.comentario ? ' — ' + esc(e.comentario) : '') : e.visto ? 'Abierto ' + cuandoTxt(e.visto) : 'Sin abrir') + '</small></span>' + (e.resultado ? '<button class="btn small" type="button" data-pa="prueba" data-id="' + d.id + '" data-u="' + esc(e.user_id) + '">Justificante</button>' : '') + '</li>')
          .join('') +
        '</ul><p class="hint">Enviado ' + cuandoTxt(d.creado) + ' · huella ' + d.huella.slice(0, 16) + '…</p></details>'
      );
    })
    .join('');
}
function enviarHTML() {
  return (
    '<section class="card"><h3>Enviar un documento</h3><form id="pa-enviar" class="col" novalidate>' +
    '<label for="pa-tit">Título</label><input id="pa-tit" type="text" maxlength="140" placeholder="Entrega de uniforme y EPIs">' +
    '<label for="pa-file">Archivo (PDF o imagen, hasta 10 MB)</label><input id="pa-file" type="file" accept="application/pdf,image/jpeg,image/png" data-libre>' +
    '<div class="acciones"><label class="check"><input type="radio" name="pa-req" value="firma" checked> Pide firma</label><label class="check"><input type="radio" name="pa-req" value="lectura"> Solo confirmar lectura</label></div>' +
    '<label for="pa-lim">Fecha límite (opcional)</label><input id="pa-lim" type="date">' +
    '<fieldset class="col"><legend>Para quién</legend><div class="acciones">' + ['cocina', 'barra', 'sala'].map((a) => '<button type="button" class="btn small" data-pa="area" data-a="' + a + '">Toda ' + (a === 'barra' ? 'la barra' : a === 'sala' ? 'la sala' : 'la cocina') + '</button>').join('') + '</div>' + personasMarcables('pa-p') + '</fieldset>' +
    '<button class="btn grande primary" type="submit">Enviar</button><p class="hint" id="pa-emsg" role="status"></p></form></section>' +
    '<p class="est aviso">Firma simple: úsala para entregas, políticas y acuses. Contratos, anexos y finiquitos necesitan firma avanzada de un proveedor (pendiente de contratar). Las nóminas pagadas por banco no necesitan firma.</p>' +
    '<h3>Enviados</h3><div class="col" id="pa-lista">' + enviadosHTML() + '</div>'
  );
}
function vEnviar() {
  if (!hayFichaje()) return sinNube('enviar');
  if (!esMaestro()) return ponPantalla('enviar', '<section class="card estado"><strong>Solo el usuario maestro envía documentos</strong></section>');
  if (!$('pa-enviar')) ponPantalla('enviar', enviarHTML());
  if (Date.now() - PA.leidoE < 15000 && PA.enviados) return;
  leerEnviados()
    .then(() => {
      if ($('pa-lista')) $('pa-lista').innerHTML = enviadosHTML();
    })
    .catch((e) => {
      if ($('pa-lista')) $('pa-lista').innerHTML = '<p class="est mal">' + esc(errPa(e)) + '</p>';
    });
}
async function justificante(id, user) {
  const d = (PA.enviados || []).find((x) => x.id === id);
  if (!d) return;
  const r = await sb.from('papeles_envios').select('nombre,area,visto,resultado,respondido,firma_nombre,firma_trazo,comentario,agente,sello').eq('papel_id', id).eq('user_id', user).single();
  if (r.error) return toast(errPa(r.error));
  const e = r.data,
    fila = (t, v) => '<tr><th>' + t + '</th><td style="white-space:normal;word-break:break-all">' + esc(v || '—') + '</td></tr>';
  capa(
    capaTop('Justificante', d.titulo) +
      '<div class="col" style="max-width:720px;margin:0 auto"><section class="card"><table class="tj">' +
      fila('Persona', e.nombre) + fila('Nombre escrito', e.firma_nombre) + fila('Respuesta', RES_P[e.resultado]) + fila('Abierto', e.visto && new Date(e.visto).toLocaleString('es-ES', { timeZone: ZONA_H })) + fila('Respondido (hora del servidor)', e.respondido && new Date(e.respondido).toLocaleString('es-ES', { timeZone: ZONA_H })) + fila('Comentario', e.comentario) + fila('Archivo', d.nombre_archivo) + fila('Huella SHA-256 del archivo', d.huella) + fila('Sello de la respuesta', e.sello) + fila('Navegador', e.agente) +
      '</table>' + (/^data:image\/png;base64,/.test(e.firma_trazo || '') ? '<p><img class="firma-img" src="' + esc(e.firma_trazo) + '" alt="Firma"></p>' : '') +
      '<div class="acciones"><button class="btn primary" type="button" data-pa="imprimir">Imprimir o guardar en PDF</button><button class="btn" type="button" data-pa="original" data-id="' + d.id + '">Descargar el documento</button></div></section></div>',
  );
}

/* ======== Pulsaciones y formularios ======== */
async function pulsaPapel(e) {
  const b = e.target.closest('[data-pa]');
  if (!b) return;
  const a = b.dataset.pa;
  if (a === 'abrir') abrirPapel(b.dataset.id);
  else if (a === 'limpiar') $('pa-firma').limpiar();
  else if (a === 'area') {
    const marcas = [...document.querySelectorAll('[name="pa-p"]')].filter((c) => (miembros.find((m) => m.user_id === c.value) || {}).area === b.dataset.a);
    const todas_ = marcas.every((c) => c.checked);
    marcas.forEach((c) => (c.checked = !todas_));
    if (!marcas.length) toast('No hay nadie en esa área.');
  } else if (a === 'prueba') justificante(b.dataset.id, b.dataset.u);
  else if (a === 'imprimir') window.print();
  else if (a === 'original') {
    const d = (PA.enviados || []).find((x) => x.id === b.dataset.id);
    if (!d) return;
    try {
      const url = URL.createObjectURL(await bajar(d.archivo)),
        l = document.createElement('a');
      l.href = url;
      l.download = d.nombre_archivo || 'documento';
      document.body.appendChild(l);
      l.click();
      l.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      toast(errPa(err));
    }
  }
}
$('vista').addEventListener('click', pulsaPapel);
$('capa').addEventListener('click', pulsaPapel);
$('capa').addEventListener('submit', async (e) => {
  if (e.target.id !== 'pa-form') return;
  e.preventDefault();
  const que = e.submitter && e.submitter.value,
    dice = (t) => {
      if ($('pa-msg')) $('pa-msg').textContent = t;
    };
  if (!que || !PA.abierto) return;
  if (que !== 'no_conforme' && !$('pa-leido').checked) return dice('Marca que lo has leído.');
  if (que === 'firmado' && (!$('pa-nombre').value.trim() || PA.abierto.trazos < 8)) return dice('Escribe tu nombre y firma en el recuadro.');
  if (que === 'no_conforme' && $('pa-motivo').value.trim().length < 5) return dice('Explica por qué no estás conforme.');
  e.submitter.disabled = true;
  dice('Guardando…');
  const r = await sb.rpc('responder_papel', {
    p_id: PA.abierto.id,
    p_resultado: que,
    p_nombre: $('pa-nombre') ? $('pa-nombre').value : null,
    p_trazo: que === 'firmado' ? $('pa-firma').toDataURL('image/png') : null,
    p_comentario: que === 'no_conforme' ? $('pa-motivo').value : null,
    p_huella: PA.abierto.huella,
    p_agente: navigator.userAgent,
  });
  if (r.error) {
    e.submitter.disabled = false;
    return dice(errPa(r.error));
  }
  cerrarCapa();
  soltarUrls();
  toast('✓ ' + RES_P[que] + '. Queda guardado.');
  PA.leido = 0;
  pintar();
});
$('vista').addEventListener('submit', async (e) => {
  if (e.target.id !== 'pa-enviar') return;
  e.preventDefault();
  const dice = (t) => {
      if ($('pa-emsg')) $('pa-emsg').textContent = t;
    },
    f = $('pa-file').files[0],
    quien = [...e.target.querySelectorAll('[name="pa-p"]:checked')].map((x) => x.value),
    titulo = $('pa-tit').value.trim(),
    boton = e.target.querySelector('[type="submit"]');
  if (titulo.length < 3) return dice('Ponle un título.');
  if (!f) return dice('Elige el archivo.');
  if (!/^(application\/pdf|image\/(jpeg|png))$/.test(f.type)) return dice('Solo PDF, JPG o PNG.');
  if (f.size > 10485760) return dice('El archivo pasa de 10 MB.');
  if (!quien.length) return dice('Elige para quién es.');
  if (!window.confirm('Se enviará a ' + quien.length + (quien.length === 1 ? ' persona' : ' personas') + '. Después no se puede cambiar ni borrar. ¿Enviar?')) return;
  boton.disabled = true;
  dice('Subiendo el archivo…');
  try {
    const id = crypto.randomUUID(),
      ext = f.type === 'application/pdf' ? 'pdf' : f.type === 'image/png' ? 'png' : 'jpg',
      ruta = rid + '/' + id + '/documento.' + ext,
      h = await huellaDe(f);
    const s = await sb.storage.from('papeles').upload(ruta, f, { contentType: f.type, upsert: false });
    if (s.error) throw s.error;
    const r = await sb.rpc('enviar_papel', { p_rid: rid, p_id: id, p_titulo: titulo, p_requiere: e.target.querySelector('[name="pa-req"]:checked').value, p_archivo: ruta, p_nombre_archivo: f.name, p_huella: h, p_limite: $('pa-lim').value || null, p_personas: quien });
    if (r.error) throw r.error;
    toast('Documento enviado a ' + r.data + (r.data === 1 ? ' persona.' : ' personas.'));
    document.activeElement.blur();
    PA.leidoE = 0;
    PA.leido = 0;
    $('vista').innerHTML = '';
    pintar();
  } catch (err) {
    boton.disabled = false;
    dice(errPa(err));
  }
});
