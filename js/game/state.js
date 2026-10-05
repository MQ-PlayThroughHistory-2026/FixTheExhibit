/**
 * state.js
 *
 * Holds the current session's game state (selected level, difficulty,
 * whether the tutorial has been shown) as plain JS variables.
 *
 * Deliberately in-memory only, per NFR08 (progress/settings retained only
 * for the duration of a level). Reloading the page
 * resets everything, which matches the game's kiosk-style reset-on-idle
 * behaviour.
 *
 * Difficulty settings come in two layers (task D6):
 *   - DIFFICULTY_CONFIG below: what a difficulty means everywhere (label,
 *     description, arrangement hint type) plus default tuning numbers.
 *   - data/levels/<level-id>/config.json: per-level overrides of the tuning
 *     numbers (sorting timer, belt speed) for each difficulty.
 * getLevelSettings() merges the two. Phases should read their numbers from
 * there rather than hardcoding them.
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
    // Defaults, used when a level's config.json leaves a value out.
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
  tutorialSeen: false,
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

/**
 * The difficulty's settings with the level's config.json overrides applied.
 *
 * @param {object} levelConfig  parsed config.json, keyed by difficulty
 * @param {string} [difficulty]
 */
export function getLevelSettings(levelConfig, difficulty = state.difficulty) {
  const base = getDifficultyConfig(difficulty);
  if (!base) return null;
  return { ...base, ...levelConfig?.[difficulty] };
}

export function hasSeenTutorial() {
  return state.tutorialSeen;
}

export function markTutorialSeen() {
  state.tutorialSeen = true;
}

/** Resets all session state - used when returning to the main menu. */
export function resetSession() {
  state.levelId = null;
  state.difficulty = null;
  // Tutorial completion intentionally persists for the rest of the
  // session once seen once, so it isn't reset here.
}
