/**
 * certificate.js
 *
 * The end of level certificate (task D10): congratulates the player, shows
 * their score and the title it earned (js/game/score.js), and is where the
 * level ends, with Restart (the whole level again) and Leave. Leave
 * reloads the page, same as the stage transition's. Both ask for
 * confirmation first (js/ui/confirm-dialog.js).
 *
 * Like stage-transition.js, this file knows nothing about any particular
 * scene. The scene that ends the level opens it:
 *
 *   showCertificate({
 *     levelName,   // e.g. "Ancient Egypt"
 *     score,       // 0 to 100
 *     title,       // e.g. "Museum Curator"
 *     description, // line under the title
 *     onRestart,   // play the whole level again
 *   });
 */

import { setPauseBlocked } from './pause-menu.js';
import { confirmAction } from './confirm-dialog.js';

let current = null;

function isOpen() {
  return current !== null;
}

// Hides the certificate and hands back whatever the scene passed in.
function close() {
  const handlers = current;
  current = null;
  document.getElementById('certificate').classList.add('hidden');
  setPauseBlocked(false);
  return handlers ?? {};
}

async function restart() {
  if (!isOpen()) return;
  const shown = current;
  if (!(await confirmAction('restart-level'))) return;
  if (current !== shown) return;
  close().onRestart?.();
}

// The score and title aren't stored anywhere, so leaving is the one place
// they're lost for good - the wording says so.
async function exit() {
  if (!isOpen()) return;
  const shown = current;
  if (!(await confirmAction('leave-results'))) return;
  if (current !== shown) return;
  window.location.reload();
}

export function showCertificate({ levelName, score, title, description, onRestart } = {}) {
  current = { onRestart };
  document.getElementById('certificate-level').textContent =
    `For fixing the ${levelName} exhibit, you have earned the title of`;
  document.getElementById('certificate-title').textContent = title;
  document.getElementById('certificate-description').textContent = description;
  document.getElementById('certificate-score').textContent = `Score: ${score} / 100`;
  // The level is over, so there's nothing left to pause.
  setPauseBlocked(true);
  document.getElementById('certificate').classList.remove('hidden');
  document.getElementById('btn-certificate-restart').focus();
}

export function initCertificate() {
  document.getElementById('btn-certificate-restart').addEventListener('click', restart);
  document.getElementById('btn-certificate-exit').addEventListener('click', exit);
  // Leaving the screen by any other route (e.g. the inactivity reset) drops the certificate.
  document.addEventListener('screenchange', () => {
    if (isOpen()) close();
  });
}
