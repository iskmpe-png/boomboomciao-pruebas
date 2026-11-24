/* ---- Asistente como chat flotante ----
   Un botón redondo abajo a la derecha abre el asistente encima de cualquier pantalla,
   sin perder lo que se estaba haciendo. */
const ICO_CHAT =
  '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>';
(function montarChat() {
  const fab = document.createElement('button');
  fab.id = 'chat-fab';
  fab.type = 'button';
  fab.hidden = true;
  fab.setAttribute('aria-label', 'Abrir el asistente');
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'chat-panel');
  fab.innerHTML = ICO_CHAT;
  const pan = document.createElement('section');
  pan.id = 'chat-panel';
  pan.hidden = true;
  pan.setAttribute('role', 'dialog');
  pan.setAttribute('aria-label', 'Asistente');
  pan.innerHTML =
    '<div class="chat-top"><b>Asistente</b><button class="link" type="button" data-act="as-nuevo">Nueva conversación</button><button class="icon" type="button" id="chat-cerrar" aria-label="Cerrar el asistente">×</button></div>' +
    '<div id="as-msgs" class="msgs" aria-live="polite"></div>' +
    '<form id="form-as" class="as-form" novalidate><textarea id="as-input" rows="1" aria-label="Pregunta para el asistente" placeholder="Escribe o dicta tu pregunta"></textarea>' +
    '<button class="btn primary" type="submit" id="as-env">Enviar</button></form>' +
    '<p class="hint chat-pie">Lee los datos de la app y el manual de la casa, pero no cambia nada.</p>';
  document.body.appendChild(pan);
  document.body.appendChild(fab);
  fab.addEventListener('click', () => (pan.hidden ? abrirChat() : cerrarChat()));
  $('chat-cerrar').addEventListener('click', cerrarChat);
  pan.addEventListener('submit', (e) => {
    e.preventDefault();
    nuevoSubmit2(e.target);
  });
  pan.addEventListener('click', (e) => {
    const s = e.target.closest('[data-sug]');
    if (s) {
      preguntar(s.dataset.sug);
      return;
    }
    const b = e.target.closest('[data-act="as-nuevo"]');
    if (b) nuevoClick2(b, 'as-nuevo');
  });
  pan.addEventListener('keydown', (e) => {
    if (e.target.id === 'as-input' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      $('form-as').requestSubmit();
    }
    if (e.key === 'Escape') cerrarChat();
  });
  /* La caja de texto crece al escribir, hasta cuatro líneas */
  pan.addEventListener('input', (e) => {
    if (e.target.id !== 'as-input') return;
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  });
})();
let chatPend = false;
function abrirChat() {
  /* Si la app aún está entrando (por ejemplo, al abrir un enlace al asistente), se abre al terminar */
  if (!sAPI || !listo()) {
    chatPend = true;
    return;
  }
  chatPend = false;
  $('chat-panel').hidden = false;
  $('chat-fab').setAttribute('aria-expanded', 'true');
  $('chat-fab').classList.add('abierto');
  document.body.classList.add('chat-abierto');
  pintarChat();
  $('as-env').textContent = asCtl ? 'Detener' : 'Enviar';
  if (!matchMedia('(pointer: coarse)').matches) $('as-input').focus({ preventScroll: true });
}
function cerrarChat() {
  $('chat-panel').hidden = true;
  $('chat-fab').setAttribute('aria-expanded', 'false');
  $('chat-fab').classList.remove('abierto');
  document.body.classList.remove('chat-abierto');
}
/* El botón solo se ve con la IA disponible y la sesión abierta */
function chatFab() {
  const f = $('chat-fab');
  if (!f) return;
  const ac = $('acceso'),
    sesion = !!sAPI && (!ac || ac.hidden);
  f.hidden = !(sesion && listo());
  if (!sesion) {
    if (!$('chat-panel').hidden) cerrarChat();
  } else if (chatPend && listo()) setTimeout(abrirChat, 0);
}
/* En el teléfono el chat ocupa toda la pantalla: al cambiar de pantalla se cierra */
window.addEventListener('hashchange', () => {
  if (!$('chat-panel').hidden && matchMedia('(max-width: 560px)').matches && location.hash !== '#inicio-asistente') cerrarChat();
});
