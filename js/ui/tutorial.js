/**
 * tutorial.js
 *
 * First-time "how to play" cards for each scene. A scene builds itself,
 * then calls showTutorialOnce() before starting anything that moves (belt,
 * timer). The card shows only the first time its id comes up this session
 * (state.js), so restarting or replaying a scene goes straight in.
 *
 * While the card is up, pausing and dragging are blocked.
 */

import { hasSeenTutorial, markTutorialSeen } from '../game/state.js';
import { setDragSuspended } from '../game/drag.js';
import { setPauseBlocked } from './pause-menu.js';

/**
 * @param {string} id          what counts as "seen", e.g. 'sorting'
 * @param {HTMLElement} card   the scene's .tutorial-card, hidden by default
 * @param {() => void} onDone  starts the scene - called right away if already seen
 */
export function showTutorialOnce(id, card, onDone) {
  if (hasSeenTutorial(id)) {
    onDone();
    return;
  }

  setPauseBlocked(true);
  setDragSuspended(true);
  card.classList.remove('hidden');
  const button = card.querySelector('button');
  button.focus();
  button.addEventListener('click', () => {
    card.classList.add('hidden');
    setPauseBlocked(false);
    setDragSuspended(false);
    markTutorialSeen(id);
    onDone();
  }, { once: true });
}
