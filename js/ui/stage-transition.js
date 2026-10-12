/**
 * stage-transition.js
 *
 * The "stage complete" popup shown between stages: Restart / Leave / Next
 * stage. Styled like the pause menu (same backplate and button art).
 * Leave goes back to the main menu, same as the pause menu's Quit, without
 * reloading so kiosk fullscreen stays on.
 *
 * Like pause-menu.js, this file knows nothing about any particular scene.
 * The scene that just finished opens it and says what each choice does:
 *
 *   showStageTransition({
 *     title,     // heading on the title card (default "Well Done!")
 *     message,   // line under it, e.g. a score summary
 *     onNext,    // go to the next stage - the Next button is hidden if omitted
 *     onRestart, // start this stage over
 *   });
 */

import { setPauseBlocked } from './pause-menu.js';

let current = null;
let exitToMainMenu = () => {};

function isOpen() {
  return current !== null;
}

// Hides the popup and hands back whatever the scene passed in.
function close() {
  const handlers = current;
  current = null;
  document.getElementById('stage-transition').classList.add('hidden');
  setPauseBlocked(false);
  return handlers ?? {};
}

function next() {
  if (!isOpen()) return;
  close().onNext?.();
}

function restart() {
  if (!isOpen()) return;
  close().onRestart?.();
}

function exit() {
  if (!isOpen()) return;
  close();
  exitToMainMenu();
}

export function showStageTransition({ title = 'Well Done!', message = '', onNext, onRestart } = {}) {
  current = { onNext, onRestart };
  document.getElementById('stage-transition-title').textContent = title;
  document.getElementById('stage-transition-text').textContent = message;
  document.getElementById('btn-stage-next').classList.toggle('hidden', !onNext);
  document.getElementById('btn-stage-restart').classList.toggle('hidden', !onRestart);
  // The stage is over, so there's nothing left to pause.
  setPauseBlocked(true);
  document.getElementById('stage-transition').classList.remove('hidden');
  document.getElementById(onNext ? 'btn-stage-next' : 'btn-stage-exit').focus();
}

/**
 * @param {object} options
 * @param {() => void} options.onExit  returns to the main menu (menu.js)
 */
export function initStageTransition({ onExit }) {
  exitToMainMenu = onExit;
  document.getElementById('btn-stage-next').addEventListener('click', next);
  document.getElementById('btn-stage-restart').addEventListener('click', restart);
  document.getElementById('btn-stage-exit').addEventListener('click', exit);
  // Leaving the screen by any other route (e.g. the inactivity reset) drops the popup.
  document.addEventListener('screenchange', () => {
    if (isOpen()) close();
  });
}
