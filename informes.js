/* ---- Informes para exportar ---- */
const T = (v) => ({ t: String(v == null ? '' : v), v: String(v == null ? '' : v) });
const E = (v) => ({ t: fEur.format(v), v: Math.round(v * 100) / 100, k: 'e' });
const N = (v, d) => ({ t: fNum(v, d == null ? 3 : d), v: r3(v) });
const PC = (v) => (v == null ? T('—') : { t: fNum(v) + ' %', v: Math.round(v * 10) / 10, k: 'p' });
function infFicha(p) {
  const c = costePlato(p),
    cu = costeUd(p),
    fc = fcDe(p),
    iva = 1 + (p.iva || 0) / 100,
    ME = '/(1-MIN(MAX(E{R},0),95)/100)';
  const pie = [
    ['Coste de la receta', E(c), '{SUMA}'],
    [p.base ? 'Rinde (' + UDI[p.unidadBase] + ')' : 'Raciones', { t: rinde(p), v: p.raciones > 0 ? p.raciones : 1 }],
    [p.base ? 'Coste por ' + UDI[p.unidadBase] : 'Coste por ración', E(cu), '{P0}/{P1}'],
  ];
  if (!p.base && p.pvp > 0) {
    pie.push(
      ['Precio en carta', E(p.pvp)],
      ['Precio sin IVA', E(p.pvp / iva), '{P3}/' + iva],
      ['Food cost', PC(fc), '{P2}/{P4}*100'],
      ['Margen por ración', E(p.pvp / iva - cu), '{P4}-{P2}'],
    );
  }
  return {
    titulo: p.nombre || 'Ficha',
    sub: (p.base ? 'Elaboración de la casa' : 'Escandallo · ' + grupoDe(p)) + ' · ' + fFecha(hoy()),
    cols: [
      { t: 'Ingrediente', w: 3 },
      { t: 'Proveedor', w: 2 },
      { t: 'Cantidad', w: 1.2, r: 1 },
      { t: 'Ud.', w: 0.6 },
      { t: 'Merma %', w: 1, r: 1 },
      { t: 'Precio', w: 1.3, r: 1 },
      { t: 'Coste', w: 1.2, r: 1 },
    ],
    filas: p.ingredientes
      .filter((i) => nom(i))
      .map((i) => {
        const pr = pre(i),
          co = E(coste(i));
        co.f = (un(i) === 'ud' ? 'C{R}*F{R}' : 'C{R}/1000*F{R}') + ME;
        return [
          T(nom(i)),
          T(origen(i)),
          N(i.cantidad),
          T(UD[un(i)]),
          N(i.merma, 1),
          { t: fEur.format(pr), v: Math.round(pr * 1e4) / 1e4, k: 'e' },
          co,
        ];
      }),
    pie: pie,
  };
}
function infReceta(p, f) {
  f = f || 1;
  const q = p.raciones * f;
  return {
    titulo: p.nombre || 'Receta',
    sub: 'Receta · rinde ' + fNum(q, 2) + ' ' + (p.base ? UDI[p.unidadBase] : q === 1 ? 'ración' : 'raciones'),
    cols: [
      { t: 'Ingrediente', w: 4 },
      { t: 'Cantidad', w: 1.2, r: 1 },
      { t: 'Ud.', w: 0.8 },
    ],
    filas: p.ingredientes.filter((i) => nom(i)).map((i) => [T(nom(i)), N(i.cantidad * f), T(UD[un(i)])]),
    pie: [],
    texto: p.elaboracion.trim(),
    tituloTexto: 'Elaboración',
  };
}
function informe() {
  if (pant === 'consumo') return informeConsumo();
  const nu = informeNuevo();
  if (nu !== undefined) return nu;
  if (pant === 'carta' && abierta) return infFicha(plato());
  if (pant === 'carta') {
    const l = filtradosCarta();
    return {
      titulo: grp || 'Carta y costes',
      sub: l.length + ' fichas · ' + fFecha(hoy()),
      cols: [
        { t: 'Plato', w: 3.2 },
        { t: 'Carta o menú', w: 2.2 },
        { t: 'Coste', w: 1.2, r: 1 },
        { t: 'Precio carta', w: 1.3, r: 1 },
        { t: 'Food cost', w: 1.2, r: 1 },
      ],
      filas: l.map((p) => [
        T(p.nombre),
        T(grupoDe(p)),
        E(costeUd(p)),
        p.base ? T('por ' + UDI[p.unidadBase]) : p.pvp > 0 ? E(p.pvp) : T('—'),
        PC(fcDe(p)),
      ]),
      pie: [],
    };
  }
  if (pant === 'precios') {
    const l = filtradosProd('precios');
    return {
      titulo: prov ? 'Precios · ' + prov : 'Precios de proveedores',
      sub: l.length + ' productos · sin IVA · ' + fFecha(hoy()),
      cols: [
        { t: 'Producto', w: 3.4 },
        { t: 'Proveedor', w: 2.3 },
        { t: 'Precio', w: 1.2, r: 1 },
        { t: 'Unidad', w: 0.9 },
        { t: 'Actualizado', w: 1.5 },
      ],
      filas: l.map((p) => [
        T(p.nombre),
        T(p.proveedor),
        E(p.precio),
        T(UDP[p.unidad]),
        T(p.actualizado ? fFecha(p.actualizado) : ''),
      ]),
      pie: [],
    };
  }
  if (pant === 'recetas') {
    const p = plato(recetaId);
    return p ? infReceta(p, factor) : null;
  }
  if (pant === 'inventario') {
    if (invSub === 'hist') {
      const c = cerradosInv(),
        sel = invSel && c.find((x) => x.id === invSel);
      if (sel) return infInventario(sel);
      /* Sin ninguno abierto: el resumen y cada inventario en su hoja */
      return [{
        titulo: 'Historial de inventarios',
        sub: c.length + ' conteos',
        cols: [
          { t: 'Fecha', w: 2 },
          { t: 'Frecuencia', w: 2 },
          { t: 'Productos', w: 1.2, r: 1 },
          { t: 'Valor', w: 1.5, r: 1 },
        ],
        filas: c.map((x) => [T(fFecha(x.fecha)), T(PER[x.periodo]), N(x.lineas.length, 0), E(x.total)]),
        pie: [],
      }].concat(c.slice(0, 24).map(infInventario));
    }
    const v = abierto(false),
      l = v ? ordenados(S.productos).filter((p) => v.cantidades[p.id] > 0) : [];
    let tot = 0;
    const filas = l.map((p) => {
      const c = v.cantidades[p.id];
      tot += c * p.precio;
      return [T(p.nombre), T(p.proveedor), N(c), T(UDI[p.unidad]), E(p.precio), E(c * p.precio)];
    });
    return {
      titulo: 'Inventario',
      sub: 'Conteo del ' + fFecha(v ? v.fecha : hoy()) + ' · ' + PER[S.ajustes.periodo].toLowerCase(),
      cols: [
        { t: 'Producto', w: 3.2 },
        { t: 'Proveedor', w: 2.2 },
        { t: 'Cantidad', w: 1.2, r: 1 },
        { t: 'Ud.', w: 0.6 },
        { t: 'Precio', w: 1.2, r: 1 },
        { t: 'Valor', w: 1.3, r: 1 },
      ],
      filas: filas,
      pie: [['Valor del stock', E(tot)]],
    };
  }
  return infMermas();
}
