/* Adaptador: ofrece a la app la misma interfaz de documentos sobre la tabla docs */
function sbDb(r) {
  const st = {},
    sello = {},
    subs = {},
    dsubs = {};
  let ultMs = 0,
    tPed = null,
    ocupado = false,
    otra = false,
    cola = [],
    vivo = false,
    tCache = null,
    tRe = null;
  const T = () => sb.from('docs'),
    mapa = (c) => st[c] || (st[c] = new Map()),
    TODAS = () => COLS.concat(['ajustes']);
  const emitir = (c) => {
    if (c === 'ajustes') {
      const d = mapa(c).get('empresa');
      (dsubs['ajustes/empresa'] || []).forEach((f) => f({ exists: !!d, data: () => d }));
      return;
    }
    const docs = [];
    mapa(c).forEach((d, id) => docs.push({ id: id, data: () => d }));
    (subs[c] || []).forEach((f) => f[0]({ metadata: { fromCache: false }, docs: docs }));
  };
  const aplicar = (rows) => {
    const cs = {};
    rows.forEach((x) => {
      const k = x.col + '/' + x.id,
        ms = Date.parse(x.updated_at) || 0;
      if (ms > ultMs) ultMs = ms;
      if (sello[k] === x.updated_at) return;
      sello[k] = x.updated_at;
      const m = mapa(x.col);
      if (x.borrado) {
        if (m.delete(x.id)) cs[x.col] = 1;
      } else {
        const d = x.data || {};
        if (!m.has(x.id) || canon(m.get(x.id)) !== canon(d)) {
          m.set(x.id, d);
          cs[x.col] = 1;
        }
      }
    });
    return cs;
  };
  const fallo = (e) => {
    const er = new Error((e && e.message) || 'error');
    if (e && (e.code === '42501' || /row-level security|permission denied/i.test(e.message || '')))
      er.code = 'invalid_argument';
    return er;
  };
  const guardaCache = () => {
    clearTimeout(tCache);
    tCache = setTimeout(() => {
      const filas = [];
      Object.keys(st).forEach((c) => st[c].forEach((d, id) => filas.push([c, id, d])));
      idb.set('cache.' + r, { filas: filas, t: Date.now() });
    }, 1200);
  };
  const guardaCola = () => {
    idb.set('cola.' + r, cola);
    if (sinRed) conexion(false, cola.length);
  };
  async function todo() {
    let ini = 0,
      rows = [];
    for (;;) {
      const q = await T()
        .select('col,id,data,borrado,updated_at')
        .eq('restaurante_id', r)
        .eq('borrado', false)
        .order('col')
        .order('id')
        .range(ini, ini + 999);
      if (q.error) throw q.error;
      rows = rows.concat(q.data || []);
      if (!q.data || q.data.length < 1000) break;
      ini += 1000;
    }
    return rows;
  }
  const subir = (x) =>
    Promise.resolve(
      T().upsert(
        { restaurante_id: r, col: x[0], id: x[1], data: x[2], borrado: !!x[3] },
        { onConflict: 'restaurante_id,col,id' },
      ),
    ).then((q) => {
      if (q.error) throw q.error;
    });
  /* Sube, en orden, lo que se guardó sin conexión. Devuelve false si sigue sin haber red. */
  async function vaciarCola() {
    let perdidos = 0;
    while (cola.length) {
      try {
        await subir(cola[0]);
      } catch (e) {
        if (esRed(e)) return false;
        perdidos++;
      }
      cola.shift();
      idb.set('cola.' + r, cola);
    }
    if (perdidos)
      toast(
        perdidos +
          (perdidos === 1 ? ' cambio pendiente no se pudo subir' : ' cambios pendientes no se pudieron subir') +
          ' por falta de permiso.',
      );
    return true;
  }
  async function sincronizar() {
    if (!(await vaciarCola())) throw new Error('Failed to fetch');
    const rows = await todo();
    Object.keys(st).forEach((c) => st[c].clear());
    Object.keys(sello).forEach((k) => delete sello[k]);
    ultMs = Date.now() - 60000;
    aplicar(rows);
    TODAS().forEach(emitir);
    guardaCache();
    conexion(true);
  }
  async function cambios() {
    if (ocupado) {
      otra = true;
      return;
    }
    ocupado = true;
    try {
      if (sinRed || cola.length) await sincronizar();
      else {
        const q = await T()
          .select('col,id,data,borrado,updated_at')
          .eq('restaurante_id', r)
          .gt('updated_at', new Date(Math.max(0, ultMs - 20000)).toISOString())
          .order('updated_at')
          .limit(1000);
        if (q.error) {
          if (esRed(q.error)) conexion(false, cola.length);
        } else {
          const cs = Object.keys(aplicar(q.data || []));
          cs.forEach(emitir);
          if (cs.length) guardaCache();
        }
      }
    } catch (e) {
      if (esRed(e)) conexion(false, cola.length);
    }
    ocupado = false;
    if (otra) {
      otra = false;
      pedir();
    }
  }
  const pedir = () => {
    clearTimeout(tPed);
    tPed = setTimeout(cambios, 250);
  };
  const encolar = (x) => {
    cola = cola.filter((y) => !(y[0] === x[0] && y[1] === x[1]));
    cola.push(x);
    conexion(false, cola.length);
    guardaCola();
  };
  const local = (c, id, d, b) => {
    if (b) mapa(c).delete(id);
    else mapa(c).set(id, d);
    guardaCache();
  };
  const escribir = (c, id, d, b) => {
    const x = [c, id, d, !!b];
    if (sinRed || cola.length) {
      local(c, id, d, b);
      encolar(x);
      pedir();
      return Promise.resolve();
    }
    return subir(x).then(
      () => local(c, id, d, b),
      (e) => {
        if (esRed(e)) {
          local(c, id, d, b);
          encolar(x);
          return;
        }
        throw fallo(e);
      },
    );
  };
  const docRef = (c, id) => ({
    id: id,
    set: (d) => escribir(c, id, d, false),
    delete: () => escribir(c, id, {}, true),
    onSnapshot: (f) => {
      (dsubs[c + '/' + id] || (dsubs[c + '/' + id] = [])).push(f);
    },
  });
  const nid = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function arrancar() {
    if (vivo) return;
    vivo = true;
    try {
      sb.channel('docs-' + r)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'docs', filter: 'restaurante_id=eq.' + r },
          pedir,
        )
        .subscribe((s) => {
          if (s === 'SUBSCRIBED') pedir();
        });
    } catch (e) {}
    setInterval(
      () => {
        if (!document.hidden) pedir();
      },
      sinRed ? 15000 : 45000,
    );
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) pedir();
    });
    window.addEventListener('online', pedir);
    window.addEventListener('offline', () => conexion(false, cola.length));
  }
  return {
    nube: true,
    pend: () => cola.length,
    doc: (p) => {
      const a = p.split('/');
      return docRef(a[0], a[1]);
    },
    collection: (c) => ({
      doc: (id) => docRef(c, id || nid()),
      limit: () => ({
        onSnapshot: (f, e) => {
          (subs[c] || (subs[c] = [])).push([f, e]);
        },
      }),
    }),
    async lote(filas) {
      if (sinRed) throw new Error('Failed to fetch');
      for (let i = 0; i < filas.length; i += 200) {
        const q = await T().upsert(
          filas.slice(i, i + 200).map((x) => ({ restaurante_id: r, col: x[0], id: x[1], data: x[2], borrado: false })),
          { onConflict: 'restaurante_id,col,id' },
        );
        if (q.error) throw fallo(q.error);
      }
      filas.forEach((x) => mapa(x[0]).set(x[1], x[2]));
      TODAS().forEach(emitir);
      guardaCache();
    },
    async start() {
      cola = (await idb.get('cola.' + r)) || [];
      try {
        await sincronizar();
        arrancar();
      } catch (e) {
        const c = esRed(e) ? await idb.get('cache.' + r) : null;
        if (!c) {
          COLS.forEach((k) =>
            (subs[k] || []).forEach((f) => {
              if (f[1]) f[1]();
            }),
          );
          return;
        }
        c.filas.forEach((x) => mapa(x[0]).set(x[1], x[2]));
        cola.forEach((x) => {
          if (x[3]) mapa(x[0]).delete(x[1]);
          else mapa(x[0]).set(x[1], x[2]);
        });
        TODAS().forEach(emitir);
        conexion(false, cola.length);
        arrancar();
        tRe = setInterval(() => {
          if (sinRed) pedir();
          else clearInterval(tRe);
        }, 15000);
      }
    },
  };
}
