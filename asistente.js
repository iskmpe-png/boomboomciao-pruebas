/* ---- Asistente ---- */
const chat = [];
let asCtl = null;
const SUGER = [
  '¿Qué hago si llega un pedido y falta producto o viene en mal estado?',
  '¿Cuánto dura abierta una salsa en cámara y cómo la etiqueto?',
  '¿Qué platos tienen peor margen y qué harías con cada uno?',
  'Enséñame a hacer un escandallo paso a paso con un plato de la carta',
  '¿Qué es el food cost y cómo lo bajo sin subir precios?',
  '¿Qué productos han subido de precio y a qué platos afectan?',
  '¿En qué se nos va la merma este mes y cómo la reduzco?',
  '¿Qué platos llevan gluten y lácteos?',
];
function contexto() {
  const L = [
    'Datos de la cocina de ' +
      negocio() +
      ' a ' +
      fFecha(hoy()) +
      '. Precios de compra sin IVA; precio de carta con IVA del ' +
      '10 %.',
    '',
  ];
  L.push(
    'PLATOS Y ELABORACIONES (nombre | grupo | coste por ración o unidad | precio carta | food cost | alérgenos | ingredientes):',
  );
  ordenados(S.platos).forEach((p) => {
    const fc = fcDe(p);
    L.push(
      '- ' +
        p.nombre +
        ' | ' +
        grupoDe(p) +
        ' | ' +
        fEur.format(costeUd(p)) +
        (p.base ? ' por ' + UDI[p.unidadBase] + ', rinde ' + rinde(p) : '') +
        ' | ' +
        (p.pvp > 0 ? fEur.format(p.pvp) : '—') +
        ' | ' +
        (fc != null ? fNum(fc) + ' %' : '—') +
        ' | ' +
        (algTxt(algDe(p)) || '—') +
        ' | ' +
        p.ingredientes
          .filter((i) => nom(i))
          .map(
            (i) =>
              nom(i) +
              ' ' +
              fNum(i.cantidad) +
              UD[un(i)] +
              (i.merma ? ' (merma ' + i.merma + '%)' : '') +
              ' ' +
              fEur.format(coste(i)),
          )
          .join('; '),
    );
  });
  L.push('', 'PRODUCTOS (nombre | proveedor | precio | stock mínimo | alérgenos):');
  ordenados(S.productos).forEach((p) =>
    L.push(
      '- ' +
        p.nombre +
        ' | ' +
        (p.proveedor || '—') +
        ' | ' +
        fEur.format(p.precio) +
        UDP[p.unidad].slice(1) +
        (p.minimo ? ' | mín ' + p.minimo + ' ' + UDI[p.unidad] : '') +
        (p.alergenos.length ? ' | ' + algTxt(p.alergenos) : ''),
    ),
  );
  const al = alertas();
  if (al.length) {
    L.push('', 'CAMBIOS DE PRECIO (90 días):');
    al.forEach((p) =>
      L.push(
        '- ' +
          p.nombre +
          ': ' +
          fEur.format(p.anterior) +
          ' → ' +
          fEur.format(p.precio) +
          ' (' +
          fFecha(p.actualizado) +
          ')',
      ),
    );
  }
  const mm = delMes(S.mermas);
  L.push('', 'MERMAS DE ' + fMes(mesM).toUpperCase() + ': total ' + fEur.format(suma(mm, valM)));
  mm.slice(0, 120).forEach((m) =>
    L.push(
      '- ' +
        m.fecha +
        ' ' +
        m.nombre +
        ' ' +
        fNum(m.cantidad, 3) +
        ' ' +
        UDI[m.unidad] +
        ' ' +
        fEur.format(valM(m)) +
        ' (' +
        m.motivo +
        ')',
    ),
  );
  const cc = delMes(S.compras);
  L.push('', 'COMPRAS DE ' + fMes(mesM).toUpperCase() + ': total ' + fEur.format(suma(cc, (c) => c.importe)));
  cc.slice(0, 80).forEach((c) =>
    L.push(
      '- ' +
        c.fecha +
        ' ' +
        c.proveedor +
        ' ' +
        fEur.format(c.importe) +
        (c.lineas.length ? ' (' + c.lineas.length + ' líneas)' : ''),
    ),
  );
  const u = cerradosInv()[0];
  if (u) L.push('', 'ÚLTIMO INVENTARIO: ' + fFecha(u.fecha) + ', valor ' + fEur.format(u.total));
  const pp = porPedir();
  if (pp.length)
    L.push('', 'POR PEDIR: ' + pp.map((x) => x.p.nombre + ' ' + fNum(x.pedir, 2) + ' ' + UDI[x.p.unidad]).join('; '));
  const v = ventasMes(false);
  if (v && Object.keys(v.unidades).length) {
    L.push('', 'VENTAS DE ' + fMes(mesM).toUpperCase() + ':');
    Object.keys(v.unidades).forEach((id) => {
      const p = idx().pl.get(id);
      if (p) L.push('- ' + p.nombre + ': ' + v.unidades[id] + ' ud');
    });
  }
  const sm = semanasVentas();
  if (sm.length) {
    L.push('', 'VENTAS POR SEMANA (platos):');
    sm.slice(-6).forEach((w) => L.push('- ' + w.k + ': ' + w.total + ' platos'));
  }
  const pv = S.proveedores.filter((p) => p.whatsapp || p.email || p.nota);
  if (pv.length) {
    L.push('', 'CONTACTO DE PROVEEDORES (nombre | WhatsApp | correo | nota):');
    pv.forEach((p) => L.push('- ' + p.nombre + ' | ' + (p.whatsapp || '—') + ' | ' + (p.email || '—') + ' | ' + (p.nota || '—')));
  }
  const rec = S.platos.filter((p) => p.elaboracion && p.elaboracion.trim());
  if (rec.length) {
    L.push('', 'ELABORACIÓN DE LAS RECETAS:');
    rec.forEach((p) => L.push('- ' + p.nombre + ': ' + p.elaboracion.trim().replace(/\s+/g, ' ').slice(0, 900)));
  }
  if (S.manual.length) {
    L.push('', 'MANUAL DE LA CASA (normas y procedimientos escritos por el encargado; mandan sobre cualquier criterio general):');
    let tope = 24000;
    ordenadosManual().forEach((m) => {
      const t = '## ' + m.titulo + '\n' + m.texto.trim();
      if (tope > 0) L.push(t.slice(0, tope));
      tope -= t.length;
    });
  }
  return L.join('\n');
}
const negocio = () => {
  const m = typeof mios !== 'undefined' && mios.find((x) => x.id === rid);
  return m ? m.nombre : 'Boom Boom Ciao (restaurante italiano en Madrid)';
};
const PENDIENTE = '[PENDIENTE]';
const instr = () =>
  'Eres el asistente de cocina de ' +
  negocio() +
  ': un chatbot didáctico y resolutivo. Cuando el encargado no está, el equipo te pregunta a ti. Te hablan personas con niveles de experiencia distintos. Responde en español de España, cercano y claro.\n' +
  'De dónde sacas las respuestas, por este orden:\n' +
  '1. El MANUAL DE LA CASA: son las normas del restaurante y mandan sobre todo lo demás.\n' +
  '2. Los datos de la app que tienes abajo: platos, recetas, costes, precios, proveedores, alérgenos, mermas, compras y ventas.\n' +
  '3. Tu conocimiento general de cocina, técnicas, conservación, seguridad alimentaria y gestión. Úsalo para resolver dudas del día a día, pero avisa de que es criterio general y no una norma de la casa.\n' +
  'Cómo responder:\n' +
  '- Empieza por la respuesta o la solución. Si hay que hacer algo, dilo en pasos cortos y en orden.\n' +
  '- Explica el porqué en pocas líneas. Cuando haya números, enseña el cálculo paso a paso con las cifras del restaurante.\n' +
  '- La primera vez que uses un término técnico (food cost, merma, escandallo, rendimiento, APPCC), explícalo en una frase sencilla.\n' +
  '- Termina con el siguiente paso y, si aplica, en qué apartado de la app se hace.\n' +
  '- Si la pregunta es ambigua, haz una sola pregunta para aclararla.\n' +
  '- Si te piden aprender algo, enséñalo con un ejemplo real de su carta y propón un ejercicio corto.\n' +
  'Seguridad: en alergias, intolerancias, temperaturas, caducidades o producto en mal estado, ante la duda elige siempre lo prudente (no servir, apartar, etiquetar y avisar al encargado). Nunca asegures que un plato no lleva un alérgeno si los datos no lo confirman.\n' +
  'No inventes datos del restaurante: precios, proveedores, ventas, horarios ni normas internas. Si la respuesta depende de una decisión de la casa que no está en el manual ni en los datos (por ejemplo, a quién llamar, qué hacer con un cliente, horarios o turnos), da la mejor orientación general que puedas, di con claridad que falta la norma de la casa y termina tu mensaje con una última línea que diga exactamente ' +
  PENDIENTE +
  ' para que el encargado la añada al manual.\n' +
  'Sé breve y sin relleno. Formato: texto sencillo, negrita con **así** y listas con guiones; sin títulos, tablas ni bloques de código.\n' +
  'No puedes cambiar datos de la app: explica dónde hacerlo. Apartados: Inicio (Panel, Asistente, Manual); Carta (Platos, Sala y alérgenos, Ingeniería, Eventos); Precios (Productos, Comparar, Alertas); Cocina (Recetas, Producción, Etiquetas, APPCC); Almacén (Inventario, Pedidos, Compras, Proveedores, Mermas).';
function fmt(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .split('\n')
    .map((l) => (/^\s*[-•]\s+/.test(l) ? '<li>' + l.replace(/^\s*[-•]\s+/, '') + '</li>' : l))
    .join('\n')
    .replace(/(<li>.*?<\/li>\n?)+/g, (m) => '<ul>' + m.replace(/\n/g, '') + '</ul>')
    .replace(/\n/g, '<br>');
}
function pintarChat() {
  const o = $('as-msgs');
  if (!o) return;
  o.innerHTML = chat.length
    ? chat
        .map(
          (m, k) =>
            '<div class="msg-' +
            (m.role === 'user' ? 'yo' : 'ia') +
            '" data-k="' +
            k +
            '">' +
            (m.role === 'user' ? esc(m.content).replace(/\n/g, '<br>') : fmt(m.content)) +
            (m.error ? '<p class="hint">' + esc(m.error) + '</p>' : '') +
            '</div>',
        )
        .join('')
    : '<p class="hint">Pregúntame lo que necesites cuando el encargado no esté: recetas, alérgenos, proveedores, conservación, costes, mermas o cómo hacer algo paso a paso. Leo los datos de la app y el manual de la casa.</p><div class="togs">' +
      SUGER.map((x) => '<button class="tog" type="button" data-sug="' + esc(x) + '">' + esc(x) + '</button>').join('') +
      '</div>';
  o.scrollTop = o.scrollHeight;
}
function vAsistente() {
  if (!sAPI) {
    $('vista').innerHTML = sinIA();
    return;
  }
  $('vista').innerHTML =
    '<section class="card chat"><div class="acciones" style="justify-content:space-between"><h2>Asistente</h2><button class="link" type="button" data-act="as-nuevo">Nueva conversación</button></div>' +
    '<div id="as-msgs" class="msgs" aria-live="polite"></div><form id="form-as" class="as-form" novalidate><textarea id="as-input" rows="2" aria-label="Pregunta para el asistente" placeholder="Escribe o dicta tu pregunta"></textarea>' +
    '<button class="btn primary" type="submit" id="as-env">' +
    (asCtl ? 'Detener' : 'Enviar') +
    '</button></form><p class="hint">' +
    (sb ? '' : 'Usa tu cuenta de Claude. ') +
    'Lee los datos de la app y el manual de la casa, pero no cambia nada. Si no sabe una norma del restaurante, apunta la pregunta para el encargado.</p></section>';
  pintarChat();
}
function preguntar(q) {
  q = q.trim();
  if (!q || asCtl) return;
  chat.push({ role: 'user', content: q });
  const r = { role: 'assistant', content: '' };
  chat.push(r);
  pintarChat();
  let turnos = chat
    .slice(0, -1)
    .filter((m) => m.content)
    .slice(-10);
  while (turnos.length && turnos[0].role !== 'user') turnos.shift();
  turnos = turnos.map((m, k) => ({
    role: m.role,
    content: k === 0 ? instr() + '\n\n' + contexto() + '\n\nPREGUNTA: ' + m.content : m.content,
  }));
  asCtl = new AbortController();
  const env = $('as-env');
  if (env) env.textContent = 'Detener';
  let t0 = 0;
  sAPI(turnos, {
    signal: asCtl.signal,
    cache: false,
    onText: (x) => {
      r.content = x.text;
      const now = Date.now();
      if (now - t0 > 80) {
        t0 = now;
        const el = $('as-msgs');
        if (el) {
          const d = el.querySelector('[data-k="' + (chat.length - 1) + '"]');
          if (d) {
            d.innerHTML = fmt(r.content);
            el.scrollTop = el.scrollHeight;
          }
        }
      }
    },
  })
    .then(
      (x) => {
        r.content = x.text;
        apuntarDuda(q, r);
      },
      (e) => {
        if (e && e.code === 'cancelled') {
          if (!r.content) r.content = '(detenido)';
        } else {
          if (e && e.text) r.content = e.text;
          r.error = errIA(e);
        }
      },
    )
    .then(() => {
      asCtl = null;
      if (!r.content && !r.error) r.error = 'Sin respuesta.';
      if (pant === 'asistente') {
        pintarChat();
        const b = $('as-env');
        if (b) b.textContent = 'Enviar';
      }
    });
}
