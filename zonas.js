/* ---- Zona de trabajo: Cocina o Barra ----
   Cada persona elige arriba con qué zona trabaja. Las listas de platos, elaboraciones,
   productos, inventario, sala, ingeniería y comparar enseñan solo esa zona; «Todo» lo junta. */
const ZONATXT = { cocina: 'Cocina', barra: 'Barra', '': 'Todo' };
$('area-sel').value = area;
$('area-sel').addEventListener('change', (e) => {
  area = e.target.value;
  mem('bbc.area', area);
  selFin();
  grp = '';
  fil.carta = fil.precios = '';
  Object.keys(lim).forEach((k) => (lim[k] = Math.min(lim[k], 50)));
  if (abierta) abierta = false;
  pintar();
  toast('Zona: ' + ZONATXT[area] + (area ? '. Lo nuevo que crees irá a ' + ZONATXT[area] + '.' : '.'));
});
