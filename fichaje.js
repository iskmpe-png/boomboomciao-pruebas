/* ---- Fichaje: fichar, mis horas, jornadas, horarios y usuario maestro ----
   La hora la pone el servidor y nada se borra: las correcciones son apuntes nuevos que la otra parte
   acepta o discute. La base de datos comprueba cada permiso (script 010). */
const FI = {
  yo: null,
  plan: [],
  hoy: [],
  leido: 0,
  paso: '',
  msg: '',
  cam: null,
  mes: '',
  datos: null,
  persona: '',
  tablets: null,
};
const TIPO_F = { entrada: 'Entrada', pausa: 'Pausa', vuelta: 'Vuelta', salida: 'Salida', anula: 'Anulación' };
const MEDIO_F = { qr: 'QR', codigo: 'Código', pin: 'PIN en tablet', boton: 'A distancia', correccion: 'Corrección' };
const MODO_F = { presencial: 'Presencial', distancia: 'Teletrabajo' };
const AREA_F = { cocina: 'Cocina', barra: 'Barra', sala: 'Sala', todas: 'Dirección y varias áreas' };
const ZONA_H = 'Europe/Madrid';
const diaMad = (f) => new Date(f || Date.now()).toLocaleDateString('sv-SE', { timeZone: ZONA_H });
const horaMad = (f) => new Date(f).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: ZONA_H });
const diaTxt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const hm = (min) => {
  const s = min < 0 ? '-' : '',
    m = Math.round(Math.abs(min));
  return s + Math.floor(m / 60) + ' h ' + pad(m % 60);
};
const hayFichaje = () => typeof enNube === 'function' && enNube();
const errFi = (e) => (/does not exist|schema cache|PGRST202|42P01/i.test((e && (e.message || e.code)) || '') ? 'Falta instalar el script 010 en la base de datos.' : errTxt(e));

/* Pinta solo si algo cambió: así una sincronización de fondo no borra lo que se está escribiendo */
const ultimoPintado = {};
function ponPantalla(nombre, html) {
  const v = $('vista');
  if (v.querySelector('[data-pantalla="' + nombre + '"]') && ultimoPintado[nombre] === html) return false;
  ultimoPintado[nombre] = html;
  v.innerHTML = '<div class="fich" data-libre data-pantalla="' + nombre + '"' + (nombre === 'jornadas' || nombre === 'plan' ? ' style="max-width:none"' : '') + '>' + html + '</div>';
  return true;
}
const sinNube = (nombre) => ponPantalla(nombre, '<section class="card estado"><strong>El fichaje necesita usuario e internet</strong><span>Entra con tu cuenta del restaurante.</span></section>');

/* ======== Cuentas de horas ======== */
/* Apuntes que cuentan: los normales y las correcciones aceptadas, sin los sustituidos o anulados */
function efectivos(l) {
  const ok = (f) => f.medio !== 'correccion' || (f.resp && f.resp.acepta);
  const fuera = new Set(l.filter((f) => f.corrige && ok(f)).map((f) => f.corrige));
  return l.filter((f) => f.tipo !== 'anula' && ok(f) && !fuera.has(f.id)).sort((a, z) => a.momento.localeCompare(z.momento) || a.id - z.id);
}
/* Minutos entre las 22:00 y las 06:00 de un tramo */
function nocturnos(a, z) {
  let n = 0;
  for (let t = a; t < z; t += 60000) {
    const h = Number(new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', hourCycle: 'h23', timeZone: ZONA_H }));
    if (h >= 22 || h < 6) n++;
  }
  return n;
}
/* De una lista de apuntes de UNA persona a sus jornadas */
function jornadas(l, conNoche) {
  const r = [];
  let j = null,
    desde = 0,
    enPausa = 0;
  const cierra = () => {
    if (j) r.push(j);
    j = null;
  };
  efectivos(l).forEach((f) => {
    const t = Date.parse(f.momento);
    if (j && t - j.ini > 16 * 36e5) {
      j.falta = true;
      cierra();
    }
    if (f.tipo === 'entrada') {
      if (j) {
        j.falta = true;
        cierra();
      }
      j = { dia: diaMad(f.momento), ini: t, fin: 0, modo: f.modo, trab: 0, pausa: 0, noche: 0, falta: false };
      desde = t;
      enPausa = 0;
    } else if (!j) return;
    else if (f.tipo === 'pausa' || (f.tipo === 'salida' && !enPausa)) {
      j.trab += (t - desde) / 60000;
      if (conNoche) j.noche += nocturnos(desde, t);
      if (f.tipo === 'pausa') enPausa = t;
    } else if (f.tipo === 'vuelta' && enPausa) {
      j.pausa += (t - enPausa) / 60000;
      desde = t;
      enPausa = 0;
    }
    if (j && f.tipo === 'salida') {
      if (enPausa) j.pausa += (t - enPausa) / 60000;
      j.fin = t;
      cierra();
    }
  });
  if (j) {
    if (Date.now() - j.ini > 16 * 36e5) j.falta = true;
    else if (!enPausa) j.trab += (Date.now() - desde) / 60000;
    j.abierta = !j.falta;
    cierra();
  }
  return r;
}
const minPlan = (p) => {
  const m = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  let d = m(p.fin) - m(p.inicio);
  if (d <= 0) d += 1440;
  return d;
};

/* ======== Lectura de datos ======== */
async function todas(consulta) {
  const r = [];
  for (let i = 0; i < 40; i++) {
    const q = await consulta().range(i * 1000, i * 1000 + 999);
    if (q.error) throw q.error;
    r.push(...q.data);
    if (q.data.length < 1000) break;
  }
  return r;
}
async function leerApuntes(desde, hasta, persona) {
  const l = await todas(() => {
    let c = sb.from('fichajes').select('id,user_id,nombre,area,tipo,momento,registrado,modo,medio,corrige,motivo,autor,huella,resp:fichajes_respuestas(acepta,comentario,momento)').eq('restaurante_id', rid).gte('momento', desde).lt('momento', hasta).order('id');
    if (persona) c = c.eq('user_id', persona);
    return c;
  });
  l.forEach((f) => {
    if (Array.isArray(f.resp)) f.resp = f.resp[0] || null;
  });
  return l;
}
const leerPlan = (desde, hasta, persona) =>
  todas(() => {
    let c = sb.from('jornadas_plan').select('id,user_id,fecha,inicio,fin,modo,nota').eq('restaurante_id', rid).gte('fecha', desde).lte('fecha', hasta).order('fecha').order('inicio').order('id');
    if (persona) c = c.eq('user_id', persona);
    return c;
  });
const sumaDias = (d, n) => {
  const x = new Date(d + 'T12:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
async function cargaFichaje() {
  if (!hayFichaje()) return;
  const h = diaMad();
  const [e, plan, ap] = await Promise.all([
    sb.rpc('mi_fichaje', { p_rid: rid }),
    leerPlan(h, sumaDias(h, 7), miId),
    leerApuntes(new Date(Date.now() - 40 * 36e5).toISOString(), new Date(Date.now() + 864e5).toISOString(), miId),
  ]);
  if (e.error) throw e.error;
  FI.yo = e.data;
  FI.plan = plan;
  FI.hoy = ap;
  FI.leido = Date.now();
}

/* ======== Portada «Hoy»: mi turno ======== */
let leyendoTurno = false;
function turnoHoyInterior() {
  if (!hayFichaje()) return '<div><span class="rotulo">Tu turno</span><span class="cifra">Sin conexión</span></div>';
  const h = diaMad(),
    mios_ = FI.plan.filter((p) => p.fecha === h),
    e = FI.yo && FI.yo.estado;
  const turno = mios_.length ? mios_.map((p) => p.inicio.slice(0, 5) + ' – ' + p.fin.slice(0, 5)).join(' · ') : FI.leido ? 'Sin horario' : '…';
  const chip = !e ? '' : e === 'dentro' ? '<span class="est ok">Dentro desde las ' + horaMad(FI.yo.desde) + '</span>' : e === 'pausa' ? '<span class="est aviso">En pausa</span>' : '<span class="est aviso">Sin fichar</span>';
  return (
    '<div><span class="rotulo">Tu turno de hoy' + (mios_.some((p) => p.modo === 'distancia') ? ' · teletrabajo' : '') + '</span><span class="cifra">' + turno + '</span>' + chip + '</div>' +
    '<a class="btn oro" href="#fichar-marcar">' + (e === 'dentro' || e === 'pausa' ? 'Pausa o salida' : 'Fichar') + '</a>'
  );
}
function turnoHoyHTML() {
  if (hayFichaje() && Date.now() - FI.leido > 60000 && !leyendoTurno) {
    leyendoTurno = true;
    cargaFichaje()
      .then(() => {
        if ($('hoy-turno')) $('hoy-turno').innerHTML = turnoHoyInterior();
      })
      .catch(() => {})
      .finally(() => {
        leyendoTurno = false;
      });
  }
  return '<section class="card hoy-turno" id="hoy-turno">' + turnoHoyInterior() + '</section>';
}

/* ======== Fichar ======== */
function pararCamara() {
  if (FI.cam) FI.cam.getTracks().forEach((t) => t.stop());
  FI.cam = null;
}
function marcarHTML() {
  const y = FI.yo,
    h = diaMad(),
    plan = FI.plan.filter((p) => p.fecha === h),
    js = jornadas(FI.hoy).filter((j) => j.dia === h || j.abierta),
    trab = js.reduce((a, j) => a + j.trab, 0),
    previsto = plan.reduce((a, p) => a + minPlan(p), 0) || 480,
    aDistancia = y.estado === 'fuera' ? plan.some((p) => p.modo === 'distancia') : y.modo === 'distancia';
  const pasos = y.estado === 'fuera' ? [['entrada', 'Fichar entrada', 'oro']] : y.estado === 'dentro' ? [['pausa', 'Empezar pausa', 'primary'], ['salida', 'Terminar jornada', 'oro']] : [['vuelta', 'Volver de la pausa', 'oro'], ['salida', 'Terminar jornada', '']];
  return (
    '<div class="fich-aro" style="--p:' + Math.min(100, Math.round((trab / previsto) * 100)) + '" role="img" aria-label="Trabajado hoy ' + hm(trab) + '"><div><span class="cifra">' + Math.floor(trab / 60) + ':' + pad(Math.floor(trab % 60)) + '</span><span class="hint">de ' + hm(previsto) + '</span>' +
    '<span class="est ' + (y.estado === 'dentro' ? 'ok">Dentro' : y.estado === 'pausa' ? 'aviso">En pausa' : 'aviso">Fuera') + '</span></div></div>' +
    (aDistancia ? '<p class="hint" style="text-align:center">Hoy tienes teletrabajo: se ficha sin código.</p>' : '') +
    pasos.map((p) => '<button type="button" class="btn grande ' + p[2] + '" data-fi="paso" data-t="' + p[0] + '"' + (aDistancia ? ' data-dist="1"' : '') + '>' + p[1] + '</button>').join('') +
    (aDistancia && y.estado === 'fuera' ? '<button type="button" class="link" data-fi="paso" data-t="entrada">Estoy en el local: escanear el código</button>' : '') +
    '<p class="hint" id="fi-msg" role="status">' + esc(FI.msg) + '</p>' +
    '<section class="card"><h3>Hoy</h3><ul class="fich-lista">' +
    (efectivos(FI.hoy).filter((f) => diaMad(f.momento) === h).map((f) => '<li><span>' + TIPO_F[f.tipo] + '<small>' + MEDIO_F[f.medio] + '</small></span><b>' + horaMad(f.momento) + '</b></li>').join('') || '<li><span class="hint">Aún no has fichado hoy.</span></li>') +
    '</ul></section>' +
    '<section class="card"><h3>Fichar sin móvil</h3><p class="hint">En la tablet de la entrada puedes fichar con un PIN personal. ' + (y.pin ? 'Ya tienes PIN.' : 'Aún no lo tienes.') + '</p>' +
    '<form id="fi-pin" class="acciones" novalidate><input id="fi-pin-v" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" placeholder="4 a 8 números" aria-label="PIN nuevo"><button class="btn small" type="submit">' + (y.pin ? 'Cambiar PIN' : 'Crear PIN') + '</button></form></section>' +
    '<p class="hint">El registro de jornada es obligatorio (art. 34.9 del Estatuto de los Trabajadores). Se guarda 4 años y puedes verlo y descargarlo en «Mis horas». No se usa tu ubicación ni tu huella.</p>'
  );
}
function escanerHTML() {
  return (
    '<h3 style="text-align:center">' + TIPO_F[FI.paso] + ': apunta al código de la tablet</h3>' +
    '<div class="fich-cam"><video id="fi-video" playsinline muted></video></div>' +
    '<p class="hint" id="fi-msg" role="status">Abriendo la cámara…</p>' +
    '<form id="fi-cod" class="card col" novalidate><label for="fi-cod-v">¿No lee el código? Escribe los 6 números de la tablet</label><input id="fi-cod-v" class="fich-cod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000000"><button class="btn primary" type="submit">Confirmar con los números</button></form>' +
    '<button type="button" class="btn" data-fi="cancelar">Cancelar</button>'
  );
}
function vMarcar() {
  if (!hayFichaje()) return sinNube('marcar');
  if (FI.paso && $('fi-video')) return;
  if (FI.paso) FI.paso = '';
  pararCamara();
  if (FI.yo) ponPantalla('marcar', marcarHTML());
  else ponPantalla('marcar', '<section class="card estado"><strong>Mirando tu jornada…</strong></section>');
  if (Date.now() - FI.leido > 15000)
    cargaFichaje()
      .then(() => {
        if (pant === 'marcar' && !FI.paso) ponPantalla('marcar', marcarHTML());
      })
      .catch((e) => ponPantalla('marcar', '<section class="card estado"><strong>No se pudo cargar el fichaje</strong><span>' + esc(errFi(e)) + '</span></section>'));
}
function cargarLib(src, nombre) {
  if (window[nombre]) return Promise.resolve();
  return new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = ok;
    s.onerror = () => mal(new Error('No se pudo cargar ' + src));
    document.head.appendChild(s);
  });
}
async function abrirEscaner(paso) {
  FI.paso = paso;
  ponPantalla('marcar', escanerHTML());
  const dice = (t) => {
    if ($('fi-msg')) $('fi-msg').textContent = t;
  };
  try {
    const cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const v = $('fi-video');
    if (!v || FI.paso !== paso) return cam.getTracks().forEach((t) => t.stop());
    FI.cam = cam;
    v.srcObject = cam;
    await v.play();
    let lector = null;
    if ('BarcodeDetector' in window) {
      try {
        lector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {}
    }
    if (!lector) await cargarLib('jsqr.js?v=40', 'jsQR');
    const lienzo = document.createElement('canvas'),
      cx = lienzo.getContext('2d', { willReadFrequently: true });
    dice('Buscando el código…');
    const mira = async () => {
      if (!v.isConnected || FI.paso !== paso) return pararCamara();
      let texto = '';
      try {
        if (v.videoWidth) {
          if (lector) {
            const r = await lector.detect(v);
            texto = r.length ? r[0].rawValue : '';
          } else {
            const e = Math.min(1, 640 / v.videoWidth);
            lienzo.width = Math.round(v.videoWidth * e);
            lienzo.height = Math.round(v.videoHeight * e);
            cx.drawImage(v, 0, 0, lienzo.width, lienzo.height);
            const r = window.jsQR(cx.getImageData(0, 0, lienzo.width, lienzo.height).data, lienzo.width, lienzo.height);
            texto = r ? r.data : '';
          }
        }
      } catch (e) {
        lector = null;
        await cargarLib('jsqr.js?v=40', 'jsQR').catch(() => {});
      }
      if (/^BBC1\./.test(texto)) return enviarFichaje(paso, texto);
      setTimeout(mira, 220);
    };
    mira();
  } catch (e) {
    dice('No hay acceso a la cámara. Escribe los 6 números que enseña la tablet.');
  }
}
let fichando = false;
async function enviarFichaje(paso, codigo) {
  if (fichando) return;
  fichando = true;
  const dice = (t) => {
    FI.msg = t;
    if ($('fi-msg')) $('fi-msg').textContent = t;
  };
  dice('Fichando…');
  try {
    const r = await sb.rpc('fichar', { p_rid: rid, p_tipo: paso, p_codigo: codigo || null });
    if (r.error) throw r.error;
    if (!r.data.ok) {
      dice(r.data.error);
      /* Con la cámara abierta se vuelve a intentar con el siguiente código */
      if (FI.paso && FI.cam) {
        FI.paso = '';
        pararCamara();
        $('vista').innerHTML = '';
        await cargaFichaje();
        ponPantalla('marcar', marcarHTML());
      }
      return;
    }
    FI.paso = '';
    pararCamara();
    if (navigator.vibrate) navigator.vibrate(120);
    FI.msg = '✓ ' + TIPO_F[paso] + ' registrada a las ' + horaMad(Date.now()) + '.';
    toast(FI.msg);
    $('vista').innerHTML = '';
    await cargaFichaje();
    if (pant === 'marcar') ponPantalla('marcar', marcarHTML());
  } catch (e) {
    dice(esRed(e) ? 'Sin conexión: no se ha fichado. Inténtalo de nuevo o usa la hoja de emergencia.' : errFi(e));
  } finally {
    fichando = false;
  }
}

/* ======== Correcciones ======== */
const quienEsId = (id) => {
  const m = miembros.find((x) => x.user_id === id);
  return m ? m.nombre : id === miId && yo ? yo.nombre : 'Otra persona';
};
/* Quién puede responder: la parte que no la propuso */
const puedoResponder = (f) => !f.resp && (f.autor === f.user_id ? f.user_id !== miId && (esMaestro() || puede(2)) : f.user_id === miId);
function correccionesHTML(l) {
  const c = l.filter((f) => f.medio === 'correccion').sort((a, z) => z.id - a.id);
  if (!c.length) return '';
  return (
    '<section class="card"><h3>Correcciones</h3><ul class="fich-lista">' +
    c
      .map(
        (f) =>
          '<li><span><b>' + TIPO_F[f.tipo] + '</b> · ' + diaTxt(diaMad(f.momento)) + ' ' + horaMad(f.momento) + (f.user_id !== miId ? ' · ' + esc(f.nombre) : '') +
          '<small>' + esc(f.motivo || '') + ' — propuesta por ' + esc(quienEsId(f.autor)) + (f.resp && f.resp.comentario ? ' · Respuesta: ' + esc(f.resp.comentario) : '') + '</small></span><span class="acciones">' +
          (f.resp ? '<span class="est ' + (f.resp.acepta ? 'ok">Aceptada' : 'mal">En desacuerdo') + '</span>' : puedoResponder(f) ? '<button class="btn small primary" type="button" data-fi="acepta" data-id="' + f.id + '">Aceptar</button><button class="btn small" type="button" data-fi="discute" data-id="' + f.id + '">No estoy de acuerdo</button>' : '<span class="est aviso">Pendiente</span>') +
          '</span></li>',
      )
      .join('') +
    '</ul></section>'
  );
}
function formCorreccion(l, persona) {
  const ops = efectivos(l)
    .slice(-60)
    .reverse()
    .map((f) => '<option value="' + f.id + '">' + TIPO_F[f.tipo] + ' · ' + diaTxt(diaMad(f.momento)) + ' ' + horaMad(f.momento) + '</option>')
    .join('');
  return (
    '<details class="card"><summary><b>Proponer una corrección</b></summary><form id="fi-corr" class="col" data-p="' + esc(persona) + '" novalidate>' +
    '<p class="hint">No cambia ni borra nada: añade un apunte que ' + (persona === miId ? 'dirección o tu encargado' : 'la persona') + ' tiene que aceptar.</p>' +
    '<label>Qué falta o está mal<select id="fi-c-tipo"><option value="entrada">Entrada</option><option value="pausa">Pausa</option><option value="vuelta">Vuelta</option><option value="salida">Salida</option><option value="anula">Un apunte sobra (anular)</option></select></label>' +
    '<label>Apunte que se sustituye o anula (si hay)<select id="fi-c-ref"><option value="">Ninguno: es un apunte que faltaba</option>' + ops + '</select></label>' +
    '<label>Día y hora correctos<input id="fi-c-cuando" type="datetime-local"></label>' +
    '<label>Motivo<input id="fi-c-motivo" type="text" maxlength="300" placeholder="Me olvidé de fichar la salida"></label>' +
    '<button class="btn primary" type="submit">Enviar corrección</button><span class="hint" id="fi-c-msg" role="status"></span></form></details>'
  );
}

/* ======== Mis horas y el detalle de una persona ======== */
const mesActual = () => FI.mes || diaMad().slice(0, 7);
const limitesMes = (m) => {
  const ini = m + '-01',
    sig = sumaDias(ini, 32).slice(0, 7) + '-01';
  return { ini: ini, fin: sumaDias(sig, -1), desde: sumaDias(ini, -2) + 'T00:00:00Z', hasta: sumaDias(sig, 2) + 'T00:00:00Z' };
};
const selMes = () => '<div class="field"><label for="fi-mes">Mes</label><input id="fi-mes" type="month" value="' + mesActual() + '"></div>';
function detalleHTML(d, persona) {
  const mes = mesActual(),
    l = d.apuntes.filter((f) => f.user_id === persona),
    js = jornadas(l, true).filter((j) => j.dia.slice(0, 7) === mes),
    t = js.reduce((a, j) => ({ trab: a.trab + j.trab, noche: a.noche + j.noche, dist: a.dist + (j.modo === 'distancia' ? j.trab : 0) }), { trab: 0, noche: 0, dist: 0 });
  return (
    '<div class="hoy-dos"><div class="loseta marino"><span>Trabajado en el mes</span><b>' + hm(t.trab) + '</b></div><div class="loseta oro"><span>Nocturnas (22-06)</span><b>' + hm(t.noche) + '</b></div></div>' +
    '<section class="card"><div class="tabla-x"><table class="tj"><thead><tr><th>Día</th><th>Entrada</th><th>Salida</th><th>Pausas</th><th>Trabajado</th><th>Tipo</th></tr></thead><tbody>' +
    (js
      .slice()
      .reverse()
      .map((j) => '<tr><td>' + diaTxt(j.dia) + '</td><td>' + horaMad(j.ini) + '</td><td>' + (j.fin ? horaMad(j.fin) : j.falta ? '<span class="est mal">Falta</span>' : '<span class="est ok">Dentro</span>') + '</td><td>' + hm(j.pausa) + '</td><td><b>' + hm(j.trab) + '</b></td><td>' + MODO_F[j.modo] + '</td></tr>')
      .join('') || '<tr><td colspan="6">Sin jornadas este mes.</td></tr>') +
    '</tbody></table></div></section>' +
    correccionesHTML(l) +
    formCorreccion(l, persona) +
    '<div class="acciones no-imp"><button class="btn" type="button" data-fi="csv" data-p="' + esc(persona) + '">Descargar registro (Excel)</button></div>'
  );
}
async function cargaMes(persona, meses) {
  const m = mesActual(),
    L = limitesMes(m),
    desde = meses ? sumaDias(L.ini, -62).slice(0, 7) + '-01T00:00:00Z' : L.desde;
  const [apuntes, plan] = await Promise.all([leerApuntes(desde, L.hasta, persona), leerPlan(L.ini, L.fin, persona)]);
  return { mes: m, apuntes: apuntes, plan: plan, de: persona || '' };
}
function vMisHoras() {
  if (!hayFichaje()) return sinNube('mishoras');
  const pinta = () => {
    const d = FI.datos;
    ponPantalla('mishoras', selMes() + (d && d.mes === mesActual() && d.de === miId ? detalleHTML(d, miId) : '<section class="card estado"><strong>Cargando tus horas…</strong></section>'));
  };
  pinta();
  if (FI.datos && FI.datos.de === miId && FI.datos.mes === mesActual() && Date.now() - FI.datos.t < 20000) return;
  cargaMes(miId)
    .then((d) => {
      d.t = Date.now();
      FI.datos = d;
      if (pant === 'mishoras') pinta();
    })
    .catch((e) => ponPantalla('mishoras', '<section class="card estado"><strong>No se pudieron cargar</strong><span>' + esc(errFi(e)) + '</span></section>'));
}

/* ======== Jornadas del equipo, por áreas ======== */
function resumenEquipo(d) {
  const mes = d.mes;
  const personas = new Map();
  miembros.forEach((m) => personas.set(m.user_id, { id: m.user_id, nombre: m.nombre, area: m.area || 'todas' }));
  d.apuntes.forEach((f) => {
    if (!personas.has(f.user_id)) personas.set(f.user_id, { id: f.user_id, nombre: f.nombre + ' (ya no está)', area: f.area });
  });
  return [...personas.values()]
    .filter((p) => miArea() === 'todas' || esMaestro() || p.area === miArea())
    .map((p) => {
      const l = d.apuntes.filter((f) => f.user_id === p.id),
        todo = jornadas(l, true),
        js = todo.filter((j) => j.dia.slice(0, 7) === mes),
        suma_ = (f) => js.reduce((a, j) => a + f(j), 0),
        plan = d.plan.filter((x) => x.user_id === p.id),
        hastaHoy = plan.filter((x) => x.fecha <= diaMad()).reduce((a, x) => a + minPlan(x), 0),
        t3 = todo.reduce((a, j) => a + j.trab, 0),
        d3 = todo.reduce((a, j) => a + (j.modo === 'distancia' ? j.trab : 0), 0);
      return Object.assign(p, {
        pres: suma_((j) => (j.modo === 'presencial' ? j.trab : 0)),
        dist: suma_((j) => (j.modo === 'distancia' ? j.trab : 0)),
        pausa: suma_((j) => j.pausa),
        noche: suma_((j) => j.noche),
        previsto: plan.reduce((a, x) => a + minPlan(x), 0),
        hastaHoy: hastaHoy,
        falta: js.filter((j) => j.falta).length,
        pend: l.filter((f) => f.medio === 'correccion' && !f.resp).length,
        tele: t3 ? d3 / t3 : 0,
      });
    })
    .filter((p) => p.pres || p.dist || p.previsto || p.falta || p.pend || miembros.some((m) => m.user_id === p.id));
}
function jornadasHTML(d) {
  const l = resumenEquipo(d),
    fila = (p) => {
      const saldo = p.pres + p.dist - p.hastaHoy;
      const est = p.falta ? '<span class="est mal">Falta ' + (p.falta === 1 ? 'una salida' : p.falta + ' salidas') + '</span>' : p.pend ? '<span class="est aviso">Corrección pendiente</span>' : p.tele >= 0.3 ? '<span class="est mal">Teletrabajo ' + Math.round(p.tele * 100) + ' %: exige acuerdo firmado</span>' : p.tele >= 0.25 ? '<span class="est aviso">Teletrabajo ' + Math.round(p.tele * 100) + ' %</span>' : '<span class="est ok">Correcto</span>';
      return '<tr><td><button class="link" type="button" data-fi="persona" data-p="' + esc(p.id) + '">' + esc(p.nombre) + '</button></td><td>' + hm(p.pres) + '</td><td>' + (p.dist ? hm(p.dist) : '—') + '</td><td>' + hm(p.pausa) + '</td><td>' + hm(p.noche) + '</td><td>' + (p.previsto ? hm(p.previsto) : '—') + '</td><td>' + (p.hastaHoy ? (saldo > 0 ? '+' : '') + hm(saldo) : '—') + '</td><td>' + est + '</td></tr>';
    };
  const dentro = l.filter((p) => jornadas(d.apuntes.filter((f) => f.user_id === p.id)).some((j) => j.abierta)).length;
  return (
    '<div class="hoy-dos no-imp"><div class="loseta marino"><span>Dentro ahora</span><b>' + dentro + '</b></div><div class="loseta oro"><span>Salidas sin fichar</span><b>' + l.reduce((a, p) => a + p.falta, 0) + '</b></div></div>' +
    '<section class="card"><h3>Registro de jornada · ' + esc(fMes(d.mes)) + ' · ' + esc(nombreLocal()) + '</h3><div class="tabla-x"><table class="tj"><thead><tr><th>Persona</th><th>Presencial</th><th>Teletrabajo</th><th>Pausas</th><th>Nocturnas</th><th>Previstas mes</th><th>Saldo a hoy</th><th>Estado</th></tr></thead><tbody>' +
    ['cocina', 'barra', 'sala', 'todas']
      .map((a) => {
        const g = l.filter((p) => p.area === a);
        return g.length ? '<tr class="grupo" data-a="' + a + '"><td colspan="8">' + AREA_F[a].toUpperCase() + '</td></tr>' + g.map(fila).join('') : a === 'todas' ? '' : '<tr class="grupo" data-a="' + a + '"><td colspan="8">' + AREA_F[a].toUpperCase() + '</td></tr><tr><td colspan="8" class="hint">Sin personas en esta área.</td></tr>';
      })
      .join('') +
    '</tbody></table></div></section>' +
    '<div class="acciones no-imp"><button class="btn primary" type="button" data-fi="csv">Descargar informe (Excel)</button><button class="btn" type="button" data-fi="imprimir">Imprimir o guardar en PDF</button>' +
    (esMaestro() ? '<button class="btn" type="button" data-fi="comprobar">Comprobar que nadie ha tocado el registro</button>' : '') +
    '</div><p class="hint" id="fi-msg" role="status"></p><p class="hint no-imp">Toca un nombre para ver su detalle, sus correcciones y proponer una.</p>'
  );
}
function vJornadas() {
  if (!hayFichaje()) return sinNube('jornadas');
  if (!esMaestro() && !puede(2)) return ponPantalla('jornadas', '<section class="card estado"><strong>Solo para dirección y encargados</strong></section>');
  const pinta = () => {
    const d = FI.datos;
    if (!d || d.mes !== mesActual() || d.de) return ponPantalla('jornadas', selMes() + '<section class="card estado"><strong>Cargando las jornadas…</strong></section>');
    if (FI.persona) return ponPantalla('jornadas', '<div class="acciones no-imp"><button class="btn" type="button" data-fi="volver">← Todo el equipo</button></div>' + selMes() + '<h2>' + esc(quienEsId(FI.persona)) + '</h2>' + detalleHTML(d, FI.persona));
    ponPantalla('jornadas', '<div class="no-imp">' + selMes() + '</div>' + jornadasHTML(d));
  };
  pinta();
  if (FI.datos && !FI.datos.de && FI.datos.mes === mesActual() && Date.now() - FI.datos.t < 20000) return;
  cargaMes('', true)
    .then((d) => {
      d.t = Date.now();
      FI.datos = d;
      if (pant === 'jornadas') pinta();
    })
    .catch((e) => ponPantalla('jornadas', '<section class="card estado"><strong>No se pudieron cargar</strong><span>' + esc(errFi(e)) + '</span></section>'));
}
function descargarCSV(persona) {
  const d = FI.datos;
  if (!d) return;
  const c = (v) => {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const filas = [['Local', 'Persona', 'Área', 'Día', 'Hora', 'Apunte', 'Tipo', 'Medio', 'Motivo de la corrección', 'Autor', 'Estado', 'Registrado en servidor', 'Huella']];
  d.apuntes
    .filter((f) => (!persona || f.user_id === persona) && diaMad(f.momento).slice(0, 7) === d.mes)
    .sort((a, z) => a.nombre.localeCompare(z.nombre, 'es') || a.momento.localeCompare(z.momento))
    .forEach((f) => filas.push([nombreLocal(), f.nombre, AREA_F[f.area] || f.area, diaMad(f.momento), horaMad(f.momento), TIPO_F[f.tipo], MODO_F[f.modo], MEDIO_F[f.medio], f.motivo || '', f.autor === f.user_id ? f.nombre : quienEsId(f.autor), f.medio !== 'correccion' ? 'Registrado' : !f.resp ? 'Pendiente' : f.resp.acepta ? 'Aceptada' : 'En desacuerdo', f.registrado, f.huella]));
  const url = URL.createObjectURL(new Blob(['﻿' + filas.map((f) => f.map(c).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })),
    a = document.createElement('a');
  a.href = url;
  a.download = 'registro-jornada-' + d.mes + (persona ? '-' + norm(quienEsId(persona)).replace(/ /g, '-') : '') + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ======== Horarios: presencial o teletrabajo (solo el usuario maestro) ======== */
const DIAS_PL = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
function personasMarcables(prefijo) {
  return ['cocina', 'barra', 'sala', 'todas']
    .map((a) => {
      const g = miembros.filter((m) => (m.area || 'todas') === a);
      return g.length ? '<div><span class="area-chip" data-a="' + a + '">' + AREA_F[a] + '</span><div class="acciones">' + g.map((m) => '<label class="check"><input type="checkbox" name="' + prefijo + '" value="' + esc(m.user_id) + '"> ' + esc(m.nombre) + '</label>').join('') + '</div></div>' : '';
    })
    .join('');
}
function planHTML() {
  const h = diaMad();
  const l = FI.datos && FI.datos.de === 'plan' ? FI.datos.plan : null;
  return (
    '<section class="card"><h3>Añadir horas</h3><form id="fi-plan" class="col" novalidate>' +
    '<div class="seg" role="radiogroup" aria-label="Tipo de horas"><label class="check"><input type="radio" name="pl-modo" value="presencial" checked> Presenciales (obligatorio QR en el local)</label><label class="check"><input type="radio" name="pl-modo" value="distancia"> Teletrabajo (sin QR)</label></div>' +
    '<fieldset class="col"><legend>Quién</legend>' + personasMarcables('pl-p') + '</fieldset>' +
    '<div class="acciones"><label>Desde<input id="pl-desde" type="date" value="' + h + '"></label><label>Hasta<input id="pl-hasta" type="date" value="' + h + '"></label><label>Entrada<input id="pl-ini" type="time" value="09:00"></label><label>Salida<input id="pl-fin" type="time" value="17:00"></label></div>' +
    '<div class="acciones" role="group" aria-label="Días de la semana">' + DIAS_PL.map((n, i) => '<label class="check"><input type="checkbox" name="pl-d" value="' + ((i + 1) % 7) + '" checked> ' + n + '</label>').join('') + '</div>' +
    '<label>Nota (opcional)<input id="pl-nota" type="text" maxlength="120"></label>' +
    '<button class="btn primary" type="submit">Guardar horario</button><span class="hint" id="fi-msg" role="status"></span></form></section>' +
    '<section class="card"><h3>Próximos 14 días</h3>' +
    (l
      ? l.length
        ? '<ul class="fich-lista">' + l.map((p) => '<li><span><b>' + esc(quienEsId(p.user_id)) + '</b> · ' + diaTxt(p.fecha) + ' · ' + p.inicio.slice(0, 5) + '-' + p.fin.slice(0, 5) + '<small>' + MODO_F[p.modo] + (p.nota ? ' · ' + esc(p.nota) : '') + '</small></span><button class="btn small" type="button" data-fi="pl-quitar" data-id="' + esc(p.id) + '">Quitar</button></li>').join('') + '</ul>'
        : '<p class="hint">Aún no hay horarios.</p>'
      : '<p class="hint">Cargando…</p>') +
    '</section><p class="hint">Si el teletrabajo llega al 30 % de la jornada en tres meses, la ley pide un acuerdo escrito y firmado antes de empezar (Ley 10/2021). Jornadas avisa a partir del 25 %.</p>'
  );
}
function vPlan() {
  if (!hayFichaje()) return sinNube('plan');
  if (!esMaestro()) return ponPantalla('plan', '<section class="card estado"><strong>Solo el usuario maestro asigna horas</strong></section>');
  ponPantalla('plan', planHTML());
  if (FI.datos && FI.datos.de === 'plan' && Date.now() - FI.datos.t < 20000) return;
  const h = diaMad();
  leerPlan(h, sumaDias(h, 14))
    .then((plan) => {
      FI.datos = { de: 'plan', plan: plan, t: Date.now() };
      if (pant === 'plan') ponPantalla('plan', planHTML());
    })
    .catch((e) => ponPantalla('plan', '<section class="card estado"><strong>No se pudieron cargar los horarios</strong><span>' + esc(errFi(e)) + '</span></section>'));
}

/* ======== Usuario maestro y tablets ======== */
function tabletsHTML() {
  const mio = mios.find((x) => x.id === rid),
    soyD = mio && mio.rol === 'dueno',
    t = FI.tablets;
  return (
    '<section class="card"><h3>Convertir este dispositivo en la tablet de fichaje</h3><p class="hint">Hazlo en la tablet que se queda en la entrada. La app cerrará tu sesión y dejará solo la pantalla del código: no da acceso a ningún dato del restaurante.</p>' +
    '<form id="fi-tablet" class="acciones" novalidate><input id="fi-tablet-n" type="text" maxlength="40" placeholder="Entrada de personal" aria-label="Nombre de la tablet"><button class="btn primary" type="submit">Usar como tablet de fichaje</button></form><p class="hint" id="fi-msg" role="status"></p></section>' +
    '<section class="card"><h3>Tablets autorizadas</h3>' +
    (t
      ? t.length
        ? '<ul class="fich-lista">' + t.map((q) => '<li><span><b>' + esc(q.nombre) + '</b><small>' + (q.visto ? 'Última señal ' + diaTxt(diaMad(q.visto)) + ' ' + horaMad(q.visto) : 'Sin señal todavía') + '</small></span><button class="btn small danger" type="button" data-fi="q-quitar" data-id="' + esc(q.id) + '">Quitar</button></li>').join('') + '</ul>'
        : '<p class="hint">Ninguna todavía.</p>'
      : '<p class="hint">Cargando…</p>') +
    '</section><section class="card"><h3>Usuarios maestros</h3><p class="hint">Asignan horas presenciales y de teletrabajo, envían documentos y preparan tablets. Conviene que haya dos. Tampoco ellos pueden borrar fichajes.</p><ul class="fich-lista">' +
    miembros
      .map((m) => {
        const es = m.rol === 'dueno' || m.maestro;
        return '<li><span><b>' + esc(m.nombre) + '</b><small>' + esc(rolTxt(m.rol, m.area)) + '</small></span><span class="acciones">' + (es ? '<span class="est ok">Maestro</span>' : '') + (soyD && m.rol !== 'dueno' ? '<button class="btn small" type="button" data-fi="maestro" data-id="' + esc(m.user_id) + '" data-v="' + (m.maestro ? '0' : '1') + '">' + (m.maestro ? 'Quitar permiso' : 'Hacer maestro') + '</button>' : '') + '<button class="btn small" type="button" data-fi="pin-de" data-id="' + esc(m.user_id) + '">Poner PIN</button></span></li>';
      })
      .join('') +
    '</ul></section>'
  );
}
function vTablets() {
  if (!hayFichaje()) return sinNube('tablets');
  if (!esMaestro()) return ponPantalla('tablets', '<section class="card estado"><strong>Solo el usuario maestro</strong></section>');
  ponPantalla('tablets', tabletsHTML());
  if (FI.tablets && Date.now() - FI.tablets.t < 15000) return;
  sb.rpc('quioscos_lista', { p_rid: rid }).then((r) => {
    if (r.error) return ponPantalla('tablets', '<section class="card estado"><strong>No se pudo cargar</strong><span>' + esc(errFi(r.error)) + '</span></section>');
    FI.tablets = r.data || [];
    FI.tablets.t = Date.now();
    if (pant === 'tablets') ponPantalla('tablets', tabletsHTML());
  });
}

/* ======== Pulsaciones y formularios ======== */
const diFi = (t) => {
  if ($('fi-msg')) $('fi-msg').textContent = t;
};
const releer = () => {
  FI.datos = null;
  FI.leido = 0;
  FI.tablets = null;
  pintar();
};
$('vista').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-fi]');
  if (!b) return;
  const a = b.dataset.fi;
  if (a === 'paso') {
    FI.msg = '';
    if (b.dataset.dist) {
      FI.paso = '';
      enviarFichaje(b.dataset.t, '');
    } else abrirEscaner(b.dataset.t);
  } else if (a === 'cancelar') {
    FI.paso = '';
    pararCamara();
    $('vista').innerHTML = '';
    vMarcar();
  } else if (a === 'acepta' || a === 'discute') {
    let com = '';
    if (a === 'discute') {
      com = window.prompt('¿Por qué no estás de acuerdo?') || '';
      if (!com.trim()) return;
    }
    b.disabled = true;
    const r = await sb.rpc('responder_correccion', { p_id: Number(b.dataset.id), p_acepta: a === 'acepta', p_comentario: com || null });
    if (r.error) toast(errFi(r.error));
    releer();
  } else if (a === 'persona') {
    FI.persona = b.dataset.p;
    vJornadas();
    window.scrollTo(0, 0);
  } else if (a === 'volver') {
    FI.persona = '';
    vJornadas();
  } else if (a === 'csv') descargarCSV(b.dataset.p || '');
  else if (a === 'imprimir') {
    document.body.classList.add('imp-jornadas');
    window.print();
    setTimeout(() => document.body.classList.remove('imp-jornadas'), 800);
  } else if (a === 'comprobar') {
    diFi('Comprobando…');
    const r = await sb.rpc('fichajes_comprobar', { p_rid: rid });
    diFi(r.error ? errFi(r.error) : r.data.ok ? '✓ Los ' + r.data.total + ' apuntes encajan: nadie ha modificado ni borrado nada.' : '⚠ El apunte ' + r.data.apunte + ' no encaja. Guarda una copia y avisa a quien administra la base de datos.');
  } else if (a === 'pl-quitar') {
    if (!confirmar(b, '¿Quitar este horario?')) return;
    const r = await sb.from('jornadas_plan').delete().eq('id', b.dataset.id);
    if (r.error) toast(errFi(r.error));
    releer();
  } else if (a === 'q-quitar') {
    if (!confirmar(b, '¿Quitar la tablet?')) return;
    const r = await sb.rpc('quiosco_quitar', { p_id: b.dataset.id });
    if (r.error) toast(errFi(r.error));
    releer();
  } else if (a === 'maestro') {
    const r = await sb.rpc('poner_maestro', { p_rid: rid, p_user: b.dataset.id, p_valor: b.dataset.v === '1' });
    if (r.error) return toast(errFi(r.error));
    await cargarMiembros();
    releer();
  } else if (a === 'pin-de') {
    const pin = window.prompt('PIN para ' + quienEsId(b.dataset.id) + ' (4 a 8 números). Díselo en persona.');
    if (!pin) return;
    const r = await sb.rpc('poner_pin', { p_rid: rid, p_user: b.dataset.id, p_pin: pin.trim() });
    toast(r.error ? errFi(r.error) : 'PIN guardado.');
  }
});
$('vista').addEventListener('change', (e) => {
  if (e.target.id !== 'fi-mes' || !/^\d{4}-\d{2}$/.test(e.target.value)) return;
  FI.mes = e.target.value;
  FI.datos = null;
  e.target.blur();
  pintar();
});
$('vista').addEventListener('submit', async (e) => {
  const id = e.target.id;
  if (!/^fi-/.test(id)) return;
  e.preventDefault();
  if (id === 'fi-cod') {
    const c = $('fi-cod-v').value.replace(/\D/g, '');
    if (c.length !== 6) return diFi('Son 6 números.');
    enviarFichaje(FI.paso, c);
  } else if (id === 'fi-pin') {
    const r = await sb.rpc('poner_pin', { p_rid: rid, p_user: miId, p_pin: $('fi-pin-v').value.trim() });
    if (r.error) return toast(errFi(r.error));
    toast('PIN guardado.');
    document.activeElement.blur();
    releer();
  } else if (id === 'fi-corr') {
    const tipo = $('fi-c-tipo').value,
      cuando = $('fi-c-cuando').value,
      ref = $('fi-c-ref').value,
      dice = (t) => ($('fi-c-msg').textContent = t);
    if (tipo !== 'anula' && !cuando) return dice('Pon el día y la hora.');
    if (tipo === 'anula' && !ref) return dice('Elige el apunte que sobra.');
    const r = await sb.rpc('proponer_correccion', { p_rid: rid, p_user: e.target.dataset.p, p_tipo: tipo, p_momento: cuando ? new Date(cuando).toISOString() : null, p_motivo: $('fi-c-motivo').value, p_corrige: ref ? Number(ref) : null });
    if (r.error) return dice(errFi(r.error));
    toast('Corrección enviada. Cuenta cuando la acepten.');
    document.activeElement.blur();
    releer();
  } else if (id === 'fi-plan') {
    const f = e.target,
      quien = [...f.querySelectorAll('[name="pl-p"]:checked')].map((x) => x.value),
      dias = [...f.querySelectorAll('[name="pl-d"]:checked')].map((x) => Number(x.value)),
      desde = $('pl-desde').value,
      hasta = $('pl-hasta').value || desde,
      ini = $('pl-ini').value,
      fin = $('pl-fin').value,
      modo = f.querySelector('[name="pl-modo"]:checked').value;
    if (!quien.length) return diFi('Elige al menos una persona.');
    if (!desde || !ini || !fin || ini === fin) return diFi('Revisa las fechas y las horas.');
    if (hasta < desde || hasta > sumaDias(desde, 62)) return diFi('El periodo no puede pasar de dos meses.');
    const filas = [];
    for (let d = desde; d <= hasta; d = sumaDias(d, 1))
      if (dias.indexOf(new Date(d + 'T12:00:00Z').getUTCDay()) >= 0) quien.forEach((u) => filas.push({ restaurante_id: rid, user_id: u, fecha: d, inicio: ini, fin: fin, modo: modo, nota: $('pl-nota').value.trim() || null }));
    if (!filas.length) return diFi('Ese periodo no incluye ningún día marcado.');
    diFi('Guardando…');
    const r = await sb.from('jornadas_plan').upsert(filas, { onConflict: 'restaurante_id,user_id,fecha,inicio', ignoreDuplicates: true });
    if (r.error) return diFi(errFi(r.error));
    toast('Horario guardado: ' + filas.length + (filas.length === 1 ? ' turno.' : ' turnos.') + ' Los que ya existían no se cambian.');
    document.activeElement.blur();
    releer();
  } else if (id === 'fi-tablet') {
    if (!window.confirm('Se cerrará tu sesión en este dispositivo y quedará como tablet de fichaje. ¿Seguir?')) return;
    const r = await sb.rpc('quiosco_crear', { p_rid: rid, p_nombre: $('fi-tablet-n').value });
    if (r.error) return diFi(errFi(r.error));
    mem('bbc.quiosco', r.data);
    if (mem('bbc.quiosco') !== r.data) return diFi('Este navegador no puede guardar la tablet (¿modo privado?).');
    /* Fuera la copia local de los datos: la tablet no debe guardar nada del restaurante */
    try {
      const u = cacheYo();
      localStorage.removeItem(PFX + 'bbc.yo');
      if (u) localStorage.removeItem(PFX + 'bbc.mios.' + u.id);
      await Promise.all(mios.map((m) => idb.del('cache.' + m.id)));
    } catch (err) {}
    /* Solo esta sesión: el móvil del maestro sigue dentro */
    await sb.auth.signOut({ scope: 'local' }).catch(() => {});
    location.reload();
  }
});
window.addEventListener('hashchange', () => {
  if (location.hash !== '#fichar-marcar') {
    FI.paso = '';
    FI.msg = '';
    pararCamara();
  }
  FI.persona = '';
});
