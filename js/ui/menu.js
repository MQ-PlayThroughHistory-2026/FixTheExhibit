/**
 * menu.js
 *
 * Development Team task D6: main menu + difficulty mode functionality.
 * Flow: Main Menu -> Level Select -> Difficulty Select -> Tutorial
 * (first time only) -> the level itself (js/game/level.js).
 *
 * FR01 (Main Menu): start and instructions are covered here. No "Exit"
 * button - as a museum kiosk game, returning to idle/main menu after a
 * period of inactivity (FR10/FR11 in the SRS) matters more than letting a
 * visitor close the game outright, so that's the pattern to build instead
 * once idle-detection is implemented, rather than adding a manual exit.
 */

import { showScreen, wireBackButtons } from './screens.js';
import { initPauseMenu } from './pause-menu.js';
import { initStageTransition } from './stage-transition.js';
import { startLevel } from '../game/level.js';
import { loadLevelIndex } from '../game/level-data.js';
import {
  setLevel,
  setDifficulty,
  hasSeenTutorial,
  markTutorialSeen,
  resetSession,
} from '../game/state.js';

function renderLevelCards(levels) {
  const list = document.getElementById('level-list');
  list.innerHTML = '';
  levels.forEach((level) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'level-card';
    card.dataset.levelId = level.id;
    card.innerHTML = `<h3>${level.name}</h3><p>${level.description}</p>`;
    card.addEventListener('click', () => onLevelChosen(level.id));
    list.appendChild(card);
  });
}

function onLevelChosen(levelId) {
  setLevel(levelId);
  showScreen('screen-difficulty-select');
}

function onDifficultyChosen(difficulty) {
  setDifficulty(difficulty);
  if (hasSeenTutorial()) {
    enterLevel();
  } else {
    showScreen('screen-tutorial');
  }
}

function onTutorialComplete() {
  markTutorialSeen();
  enterLevel();
}

// Starts the selected level. If its data can't be loaded there's nothing to
// play, so it goes back to the main menu.
async function enterLevel() {
  try {
    await startLevel();
  } catch (err) {
    console.error(err);
    onReturnToMainMenu();
  }
}

function onReturnToMainMenu() {
  resetSession();
  showScreen('screen-main-menu');
}

function wireDifficultyCards() {
  document.querySelectorAll('.difficulty-card').forEach((card) => {
    card.addEventListener('click', () => onDifficultyChosen(card.dataset.difficulty));
  });
}

function wireMainMenu() {
  document.getElementById('btn-start').addEventListener('click', () => {
    showScreen('screen-level-select');
  });
  document.getElementById('btn-instructions').addEventListener('click', () => {
    showScreen('screen-instructions');
  });
}

function wireTutorial() {
  document.getElementById('btn-tutorial-done').addEventListener('click', onTutorialComplete);
}

export async function initMenu() {
  wireBackButtons();
  wireMainMenu();
  wireDifficultyCards();
  wireTutorial();
  // The pause menu's Quit button is the way back from any game screen.
  initPauseMenu({ onQuit: onReturnToMainMenu });
  initStageTransition({ onExit: onReturnToMainMenu });

  try {
    const levels = await loadLevelIndex();
    renderLevelCards(levels);
  } catch (err) {
    console.error(err);
    const list = document.getElementById('level-list');
    list.textContent = 'Levels could not be loaded. Check the console for details.';
  }

  showScreen('screen-main-menu');
}
