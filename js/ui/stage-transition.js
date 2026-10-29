/**
 * stage-transition.js
 *
 * The "stage complete" popup shown between stages: Restart / Leave / Next
 * stage. Styled like the pause menu (same backplate and button art).
 * Leave reloads the page, same as the pause menu's Quit, so the next
 * visitor starts from a clean slate. Restart and Leave both ask for
 * confirmation first (js/ui/confirm-dialog.js).
 *
 * Like pause-menu.js, this file knows nothing about any particular scene.
 * The scene that just finished opens it and says what each choice does:
 *
 *   showStageTransition({
 *     title,     // heading on the title card (default "Well Done!")
 *     message,   // line under it, e.g. a score summary
 *     onNext,    // go to the next stage - the Next button is hidden if omitted
 *     onRestart, // start this stage over - the Restart button is hidden if omitted
 *     nextLabel, // what the Next arrow says to screen readers (default "Next stage")
 *     canLeave,  // false hides Leave, for a popup that only moves on (default true)
 *     confirmRestart, // false makes Restart act at once, for a popup where the stage
 *                     // has already failed so there's nothing to lose (default true)
 *   });
 */

import { setPauseBlocked } from './pause-menu.js';
import { confirmAction } from './confirm-dialog.js';

let current = null;

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

async function restart() {
  if (!isOpen()) return;
  const popup = current;
  if (popup.confirmRestart && !(await confirmAction('restart-stage'))) return;
  // The popup went away while the question was open (e.g. the inactivity reset).
  if (current !== popup) return;
  close().onRestart?.();
}

async function exit() {
  if (!isOpen()) return;
  const popup = current;
  if (!(await confirmAction('leave'))) return;
  if (current !== popup) return;
  window.location.reload();
}

export function showStageTransition({
  title = 'Well Done!',
  message = '',
  onNext,
  onRestart,
  nextLabel = 'Next stage',
  canLeave = true,
  confirmRestart = true,
} = {}) {
  current = { onNext, onRestart, confirmRestart };
  document.getElementById('stage-transition-title').textContent = title;
  document.getElementById('stage-transition-text').textContent = message;
  document.getElementById('btn-stage-next').classList.toggle('hidden', !onNext);
  document.getElementById('btn-stage-next').setAttribute('aria-label', nextLabel);
  document.getElementById('btn-stage-restart').classList.toggle('hidden', !onRestart);
  document.getElementById('btn-stage-exit').classList.toggle('hidden', !canLeave);
  // The stage is over, so there's nothing left to pause.
  setPauseBlocked(true);
  document.getElementById('stage-transition').classList.remove('hidden');
  document.getElementById(onNext ? 'btn-stage-next' : 'btn-stage-exit').focus();
}

export function initStageTransition() {
  document.getElementById('btn-stage-next').addEventListener('click', next);
  document.getElementById('btn-stage-restart').addEventListener('click', restart);
  document.getElementById('btn-stage-exit').addEventListener('click', exit);
  // Leaving the screen by any other route (e.g. the inactivity reset) drops the popup.
  document.addEventListener('screenchange', () => {
    if (isOpen()) close();
  });
}
