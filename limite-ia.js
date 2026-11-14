/* ---- Límite de uso de la IA por restaurante (lo cuenta el servidor) ---- */
let usoIA = null;
function cargarUsoIA() {
  usoIA = null;
  return sb.rpc('uso_ia_resumen', { p_rid: rid }).then(
    (q) => {
      usoIA = q.error ? { error: true } : q.data;
    },
    () => {
      usoIA = { error: true };
    },
  );
}
function usoIAHTML() {
  if (!usoIA) return '<p class="hint">Consultando el uso de la IA…</p>';
  if (usoIA.error) return '<p class="hint">Para ver y limitar el uso de la IA, ejecuta en Supabase el cuarto script de la base de datos.</p>';
  return (
    '<div class="us-ia"><p><b>Uso de la IA</b> · hoy ' + usoIA.hoy + ' de ' + usoIA.limite + ' consultas · este mes ' + usoIA.mes + '</p>' +
    (esPlat
      ? '<form id="form-ia" class="mx-fil" novalidate><div class="field"><label for="ia-lim">Consultas al día para este restaurante</label><input id="ia-lim" class="num" type="text" inputmode="numeric" value="' + usoIA.limite + '"></div><button class="btn" type="submit">Guardar límite</button></form>'
      : '') +
    '</div>'
  );
}
$('usuarios').addEventListener('submit', (e) => {
  if (e.target.id !== 'form-ia') return;
  e.preventDefault();
  const n = Math.round(parse($('ia-lim').value));
  if (!(n >= 0 && n <= 5000)) {
    $('us-msg').textContent = 'Escribe un número entre 0 y 5000.';
    return;
  }
  sb.rpc('poner_limite_ia', { p_rid: rid, p_limite: n }).then((q) => {
    if (q.error) {
      $('us-msg').textContent = errTxt(q.error);
      return;
    }
    cargarUsoIA().then(() => pintarUsuarios('Límite de IA guardado: ' + n + ' consultas al día.'));
  });
});
