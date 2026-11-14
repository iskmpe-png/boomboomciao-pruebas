/* ---- Informes de las pantallas nuevas ---- */
function informeNuevo() {
  if (pant === 'panel') {
    const cr = costeRealMes(),
      f = [
        ['Compras del mes', E(suma(delMes(S.compras), (c) => c.importe))],
        ['Mermas del mes', E(suma(delMes(S.mermas), valM))],
      ],
      u = cerradosInv()[0];
    if (u) f.push(['Valor del stock (' + fFecha(u.fecha) + ')', E(u.total)]);
    if (cr.real != null) {
      f.push(['Consumo real', E(cr.real)]);
      if (cr.uds) f.push(['Coste teórico de lo vendido', E(cr.teo)], ['Diferencia', E(cr.real - cr.teo)]);
    }
    S.platos
      .filter((p) => !p.base)
      .map((p) => ({ p: p, fc: fcDe(p) }))
      .filter((x) => x.fc != null)
      .sort((a, z) => z.fc - a.fc)
      .slice(0, 5)
      .forEach((x) => f.push(['Food cost · ' + x.p.nombre, PC(x.fc)]));
    return {
      titulo: 'Panel del mes',
      sub: fMes(mesM),
      cols: [
        { t: 'Concepto', w: 4 },
        { t: 'Valor', w: 1.5, r: 1 },
      ],
      filas: f.map((x) => [T(x[0]), x[1]]),
      pie: [],
    };
  }
  if (pant === 'sala') {
    const f = norm(fil.sala),
      l = ordenados(S.platos).filter((p) => !p.base && (!f || norm(p.nombre).indexOf(f) >= 0));
    return {
      titulo: 'Carta de alérgenos',
      sub: l.length + ' platos · ' + fFecha(hoy()),
      cols: [
        { t: 'Plato', w: 2.2 },
        { t: 'Alérgenos', w: 3.6 },
        { t: 'Descripción', w: 3 },
        { t: 'Bebida', w: 1.4 },
      ],
      filas: l.map((p) => [T(p.nombre), T(algTxt(algDe(p)) || 'Ninguno marcado'), T(p.descripcion), T(p.vino)]),
      pie: [],
    };
  }
  if (pant === 'ingenieria') {
    const r = clasesIng();
    return {
      titulo: 'Ingeniería de menú',
      sub: fMes(mesM) + ' · ' + r.tot + ' platos vendidos',
      cols: [
        { t: 'Plato', w: 3 },
        { t: 'Ventas', w: 1, r: 1 },
        { t: 'Margen ud.', w: 1.2, r: 1 },
        { t: 'Margen total', w: 1.3, r: 1 },
        { t: 'Food cost', w: 1.1, r: 1 },
        { t: 'Clase', w: 2.4 },
      ],
      filas: r.d.map((x) => [T(x.p.nombre), N(x.n, 0), E(x.m), E(x.m * x.n), PC(fcDe(x.p)), T(x.c)]),
      pie: [['Margen del mes', E(r.margen)]],
    };
  }
  if (pant === 'eventos') {
    const e = evento();
    if (!e)
      return {
        titulo: 'Eventos',
        sub: S.eventos.length + ' eventos',
        cols: [
          { t: 'Evento', w: 3 },
          { t: 'Personas', w: 1, r: 1 },
          { t: 'Coste por persona', w: 1.6, r: 1 },
          { t: 'Precio', w: 1.2, r: 1 },
        ],
        filas: ordenados(S.eventos).map((x) => [
          T(x.nombre),
          N(x.pax, 0),
          E(costeEv(x)),
          x.precio > 0 ? E(x.precio) : T('—'),
        ]),
        pie: [],
      };
    const c = costeEv(e),
      pie = [
        ['Coste por persona', E(c)],
        ['Coste total', E(c * (e.pax || 0))],
      ];
    if (e.precio > 0) {
      pie.push(['Precio por persona', E(e.precio)], ['Food cost', PC(c > 0 ? (c / (e.precio / 1.1)) * 100 : null)]);
    }
    return {
      titulo: e.nombre || 'Evento',
      sub:
        (e.pax || 0) +
        ' personas · ' +
        e.platos
          .map((x) => {
            const p = idx().pl.get(x.id);
            return p ? p.nombre : '';
          })
          .filter(Boolean)
          .join(', '),
      cols: [
        { t: 'Producto', w: 3 },
        { t: 'Proveedor', w: 2.2 },
        { t: 'Cantidad', w: 1.2, r: 1 },
        { t: 'Ud.', w: 0.6 },
        { t: 'Coste', w: 1.2, r: 1 },
      ],
      filas: compraEv(e).map((o) => [T(o.n), T(o.prov), N(o.q, 2), T(UDI[o.u]), E(o.c)]),
      pie: pie,
    };
  }
  if (pant === 'comparar') {
    const f = [];
    comparables().forEach((c) =>
      c.otros.forEach((o) =>
        f.push([
          T(c.barato.nombre.replace(/\s*\(.*?\)/g, '')),
          T(c.barato.proveedor),
          E(c.barato.precio),
          T(o.proveedor),
          E(o.precio),
          E(o.precio - c.barato.precio),
          N(usos(o.id), 0),
        ]),
      ),
    );
    return {
      titulo: 'Comparativa de proveedores',
      sub: 'Sin IVA · ' + fFecha(hoy()),
      cols: [
        { t: 'Producto', w: 2.6 },
        { t: 'Más barato', w: 1.8 },
        { t: 'Precio', w: 1, r: 1 },
        { t: 'Otro', w: 1.8 },
        { t: 'Precio', w: 1, r: 1 },
        { t: 'Diferencia', w: 1.1, r: 1 },
        { t: 'Fichas', w: 0.8, r: 1 },
      ],
      filas: f,
      pie: [],
    };
  }
  if (pant === 'alertas') {
    return {
      titulo: 'Cambios de precio',
      sub: 'Últimos 90 días',
      cols: [
        { t: 'Producto', w: 2.6 },
        { t: 'Proveedor', w: 1.8 },
        { t: 'Antes', w: 1, r: 1 },
        { t: 'Ahora', w: 1, r: 1 },
        { t: 'Cambio', w: 1, r: 1 },
        { t: 'Platos afectados', w: 3 },
      ],
      filas: alertas().map((p) => [
        T(p.nombre),
        T(p.proveedor),
        E(p.anterior),
        E(p.precio),
        PC(((p.precio - p.anterior) / p.anterior) * 100),
        T(
          S.platos
            .filter((pl) => !pl.base && usaProd(pl, p.id))
            .map((pl) => pl.nombre)
            .join(', '),
        ),
      ]),
      pie: [],
    };
  }
  if (pant === 'produccion') {
    const v = plan(false),
      l = ordenados(S.platos.filter((p) => p.base && v && v.items[p.id] > 0));
    return {
      titulo: 'Producción del día',
      sub: fFecha(planF),
      cols: [
        { t: 'Elaboración', w: 3.5 },
        { t: 'Cantidad', w: 1.2, r: 1 },
        { t: 'Ud.', w: 0.7 },
        { t: 'Hecho', w: 1 },
      ],
      filas: l.map((b) => [T(b.nombre), N(v.items[b.id], 2), T(UDI[b.unidadBase]), T(v.hecho[b.id] ? 'Sí' : '')]),
      pie: [],
    };
  }
  if (pant === 'etiquetas') {
    const d = datosEt();
    if (!d) return null;
    return {
      titulo: 'Etiqueta ' + d.nombre,
      sub: 'Elaborado ' + fCorta(d.elab),
      etiqueta: d,
      cols: [
        { t: 'Dato', w: 2 },
        { t: 'Valor', w: 4 },
      ],
      filas: [
        [T('Producto'), T(d.nombre)],
        [T('Elaborado'), T(fCorta(d.elab))],
        [T('Caduca'), T(fCorta(d.cad))],
        [T('Alérgenos'), T(algTxt(d.alg))],
        [T('Responsable'), T(d.resp)],
      ],
      pie: [],
    };
  }
  if (pant === 'appcc') {
    const l = apLista();
    return {
      titulo: 'Registros APPCC',
      sub: (apPer === 'mes' ? fMes(apDia.slice(0, 7)) : fFecha(apDia)) + ' · ' + l.length + ' registros',
      cols: [
        { t: 'Fecha', w: 1.3 },
        { t: 'Hora', w: 0.8 },
        { t: 'Registro', w: 1.4 },
        { t: 'Punto', w: 1.8 },
        { t: 'Valor', w: 1, r: 1 },
        { t: 'Estado', w: 1.2 },
        { t: 'Quién', w: 1.2 },
        { t: 'Observaciones', w: 2.4 },
      ],
      filas: l.map((a) => [
        T(fFecha(a.fecha)),
        T(a.hora),
        T(APT[a.tipo]),
        T(a.punto),
        T(apValor(a)),
        T(a.ok ? 'Correcto' : 'Incidencia'),
        T(a.quien),
        T(a.nota),
      ]),
      pie: [],
    };
  }
  if (pant === 'pedidos') {
    const l = pedLineas().sort(
      (a, z) =>
        (a.p.proveedor || 'zzz').localeCompare(z.p.proveedor || 'zzz', 'es') ||
        a.p.nombre.localeCompare(z.p.nombre, 'es'),
    );
    return {
      titulo: 'Pedido',
      sub: fFecha(hoy()),
      cols: [
        { t: 'Proveedor', w: 2.2 },
        { t: 'Producto', w: 3.2 },
        { t: 'Pedir', w: 1, r: 1 },
        { t: 'Ud.', w: 0.6 },
      ],
      filas: l.map((x) => [T(x.p.proveedor), T(x.p.nombre), N(x.q, 2), T(UDI[x.p.unidad])]),
      pie: [],
    };
  }
  if (pant === 'grupo') {
    return {
      titulo: 'Grupo',
      sub: fMes(mesM) + ' · compras y mermas sin IVA',
      cols: [
        { t: 'Restaurante', w: 2.6 },
        { t: 'Platos', w: 0.9, r: 1 },
        { t: 'Food cost', w: 1.1, r: 1 },
        { t: 'Fuera obj.', w: 1, r: 1 },
        { t: 'Compras', w: 1.4, r: 1 },
        { t: 'Mermas', w: 1.3, r: 1 },
        { t: 'Merma %', w: 1, r: 1 },
      ],
      filas: filasGrupo().map((f) => [
        T(f.g.m.nombre),
        N(f.k.n, 0),
        PC(f.k.fc),
        N(f.k.fuera, 0),
        E(f.k.compras),
        E(f.k.mermas),
        PC(f.k.pm),
      ]),
      pie: [],
    };
  }
  if (pant === 'proveedores') {
    return {
      titulo: 'Proveedores',
      sub: fFecha(hoy()),
      cols: [
        { t: 'Proveedor', w: 2.4 },
        { t: 'WhatsApp', w: 1.6 },
        { t: 'Correo', w: 2.6 },
        { t: 'Nota', w: 2.4 },
      ],
      filas: nombresProv().map((n) => {
        const p = provDe(n) || {};
        return [T(n), T(p.whatsapp), T(p.email), T(p.nota)];
      }),
      pie: [],
    };
  }
  if (pant === 'compras') {
    const l = delMes(S.compras).sort((a, z) => a.fecha.localeCompare(z.fecha));
    return {
      titulo: 'Compras',
      sub: fMes(mesM) + ' · sin IVA',
      cols: [
        { t: 'Fecha', w: 1.4 },
        { t: 'Proveedor', w: 3 },
        { t: 'Albarán', w: 2 },
        { t: 'Importe', w: 1.4, r: 1 },
      ],
      filas: l.map((c) => [T(fFecha(c.fecha)), T(c.proveedor), T(c.albaran), E(c.importe)]),
      pie: [['Total de compras', E(suma(l, (c) => c.importe))]],
    };
  }
  return undefined;
}
