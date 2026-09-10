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
 * Difficulty adjusts gameplay variables - currently just the Stage 1
 * (sorting) timer, per Development Team task D6. D8 (sorting-scene timer)
 * should read stage1TimerSeconds from getDifficultyConfig() rather than
 * hardcoding a duration.
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
    stage1TimerSeconds: 90,
    beltSpeedMultiplier: 0.75,
    arrangementHintType: 'silhouette',
  },
  [DIFFICULTIES.HARD]: {
    label: 'Hard',
    description:
      'A shorter timer and a faster conveyor belt. Riddles and clues guide artefact placement.',
    stage1TimerSeconds: 45,
    beltSpeedMultiplier: 1.25,
    arrangementHintType: 'riddle',
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

export function getStage1TimerSeconds() {
  return getDifficultyConfig()?.stage1TimerSeconds ?? null;
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
