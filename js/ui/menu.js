/**
 * menu.js
 *
 * Development Team task D6: main menu + difficulty mode functionality.
 * Flow: Main Menu -> Level Select -> Difficulty Select -> Tutorial
 * (first time only) -> Stage 1 (currently a placeholder screen for D1/D8
 * to replace).
 *
 * FR01 (Main Menu): start and instructions are covered here. No "Exit"
 * button - as a museum kiosk game, returning to idle/main menu after a
 * period of inactivity (FR10/FR11 in the SRS) matters more than letting a
 * visitor close the game outright, so that's the pattern to build instead
 * once idle-detection is implemented, rather than adding a manual exit.
 */

import { showScreen, wireBackButtons } from './screens.js';

//remove or rename the imports to the true game once the real Stage 1 (D1) exists
import { initSortingDemo } from '../game/prototypes/sorting-demo.js';
import { initArrangingDemo } from '../game/prototypes/arranging-demo.js';
import {
  DIFFICULTIES,
  setLevel,
  getLevel,
  setDifficulty,
  getDifficulty,
  getDifficultyConfig,
  hasSeenTutorial,
  markTutorialSeen,
  resetSession,
} from '../game/state.js';

const LEVELS_URL = 'data/levels/index.json';

async function loadLevels() {
  const response = await fetch(LEVELS_URL);
  if (!response.ok) {
    throw new Error(`Failed to load levels.json: ${response.status}`);
  }
  return response.json();
}

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
    enterStage1();
  } else {
    showScreen('screen-tutorial');
  }
}

function onTutorialComplete() {
  markTutorialSeen();
  enterStage1();
}

/**
 * Stage 1 entry point. Gold Rush + Easy routes to the TEMPORARY sorting
 * demo (see the imports above); every other level/difficulty
 * combination still falls back to the plain summary stub until the real
 * Stage 1 (D1) exists.
 */
function enterStage1() {
  const level = getLevel();
  const difficulty = getDifficulty();

  if (level === 'gold-rush' && difficulty === DIFFICULTIES.EASY) {
    showScreen('screen-stage1-prototype');
    // After showScreen so the stage has a width to lay the packages out in.
    initSortingDemo();
    return;
  }

  const config = getDifficultyConfig();
  document.getElementById('summary-level').textContent = level;
  document.getElementById('summary-difficulty').textContent = config.label;
  document.getElementById('summary-timer').textContent = `${config.stage1TimerSeconds}s`;
  document.getElementById('summary-hint-type').textContent = config.arrangementHintType;
  showScreen('screen-game-stub');
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
  // TEMPORARY - delete together with screen-arranging-prototype and
  // js/game/prototypes/arranging-demo.js when the real arranging scene
  // (D2) is built. One button per hint type (state.js's
  // arrangementHintType), skipping the full menu -> sorting flow.
  document.getElementById('btn-dev-arranging-demo').addEventListener('click', () => {
    setLevel('gold-rush');
    setDifficulty(DIFFICULTIES.EASY);
    showScreen('screen-arranging-prototype');
    // After showScreen so the stage has a width to lay artefacts out in.
    initArrangingDemo();
  });
  document.getElementById('btn-dev-arranging-hard-demo').addEventListener('click', () => {
    setLevel('gold-rush');
    setDifficulty(DIFFICULTIES.HARD);
    showScreen('screen-arranging-prototype');
    initArrangingDemo();
  });
}

function wireTutorialAndStub() {
  document.getElementById('btn-tutorial-done').addEventListener('click', onTutorialComplete);
  document.getElementById('btn-stub-main-menu').addEventListener('click', onReturnToMainMenu);
  document.getElementById('btn-stage1-main-menu').addEventListener('click', onReturnToMainMenu);
  document.getElementById('btn-dev-arranging-main-menu').addEventListener('click', onReturnToMainMenu);
}

export async function initMenu() {
  wireBackButtons();
  wireMainMenu();
  wireDifficultyCards();
  wireTutorialAndStub();

  try {
    const levels = await loadLevels();
    renderLevelCards(levels);
  } catch (err) {
    console.error(err);
    const list = document.getElementById('level-list');
    list.textContent = 'Levels could not be loaded. Check the console for details.';
  }

  showScreen('screen-main-menu');
}

export { DIFFICULTIES };
