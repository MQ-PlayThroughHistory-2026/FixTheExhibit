/**
 * certificate.js
 *
 * The end of level certificate (task D10): congratulates the player, shows
 * their score and the title it earned (js/game/score.js), and is where the
 * level ends, with Restart (the whole level again) and Leave. Leave
 * reloads the page, same as the stage transition's.
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

function restart() {
  if (!isOpen()) return;
  close().onRestart?.();
}

function exit() {
  if (!isOpen()) return;
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
