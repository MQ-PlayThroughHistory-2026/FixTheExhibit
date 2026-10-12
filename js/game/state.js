/**
 * state.js
 *
 * Holds the current session's game state (selected level, difficulty,
 * which scene tutorials have been shown) as plain JS variables.
 *
 * Deliberately in-memory only, per NFR08 (progress/settings retained only
 * for the duration of a level). Reloading the page
 * resets everything, which matches the game's kiosk-style reset-on-idle
 * behaviour.
 *
 * Difficulty adjusts gameplay variables (task D6) - the sorting timer,
 * belt speed and arrangement hint type in DIFFICULTY_CONFIG below. Phases
 * get the chosen difficulty's config as ctx.settings (js/game/level.js)
 * rather than hardcoding these numbers.
 */

export const DIFFICULTIES = Object.freeze({
  EASY: 'easy',
  HARD: 'hard',
});

const DIFFICULTY_CONFIG = {
  [DIFFICULTIES.EASY]: {
    label: 'Easy',
    description:
      'A longer timer and a slower conveyor belt. Silhouettes guide artefact placement.',
    arrangementHintType: 'silhouette',
    sortingTimerSeconds: 90,
    beltSpeedPxPerSec: 90,
  },
  [DIFFICULTIES.HARD]: {
    label: 'Hard',
    description:
      'A shorter timer and a faster conveyor belt. Riddles and clues guide artefact placement.',
    arrangementHintType: 'riddle',
    sortingTimerSeconds: 45,
    beltSpeedPxPerSec: 150,
  },
};

const state = {
  levelId: null,
  difficulty: null,
  tutorialsSeen: new Set(), // tutorial ids, see js/ui/tutorial.js
};

export function setLevel(levelId) {
  state.levelId = levelId;
}

export function getLevel() {
  return state.levelId;
}

export function setDifficulty(difficulty) {
  if (!DIFFICULTY_CONFIG[difficulty]) {
    throw new Error(`Unknown difficulty: ${difficulty}`);
  }
  state.difficulty = difficulty;
}

export function getDifficulty() {
  return state.difficulty;
}

export function getDifficultyConfig(difficulty = state.difficulty) {
  return DIFFICULTY_CONFIG[difficulty] ?? null;
}

export function hasSeenTutorial(id) {
  return state.tutorialsSeen.has(id);
}

export function markTutorialSeen(id) {
  state.tutorialsSeen.add(id);
}

/** Resets all session state - used when returning to the main menu. */
export function resetSession() {
  state.levelId = null;
  state.difficulty = null;
  // Tutorials intentionally stay seen for the rest of the session (until
  // the page reloads), so they aren't reset here.
}
