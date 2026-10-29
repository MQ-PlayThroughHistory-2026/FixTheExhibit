/**
 * score.js
 *
 * Turns a level's results into one score out of 100 and the player title
 * that goes with it, for the certificate (js/ui/certificate.js). Knows
 * nothing about the page.
 *
 * Each phase writes its own entry into ctx.results (js/game/level.js) when
 * it finishes, as { correct, total }:
 *   sorting    packages sorted into the right zone, out of every package.
 *              Running out of time forces a restart of the stage, so every
 *              package is always sorted by the end; instead, each time-out
 *              (ctx.results.sortingTimeouts, counted by sorting-scene.js)
 *              scales this part of the score down, see
 *              sortingTimeoutFactor() below.
 *   arranging  artefacts placed, out of drops onto a slot. Every artefact
 *              ends up placed, so this is what tells a careful player from
 *              one who tried every slot.
 *   quiz       questions answered correctly, out of every question.
 * Each is a 0 to 1 accuracy, weighted by WEIGHTS below. Restarting a phase
 * overwrites its entry, so only the run that was kept counts. The time-out
 * count is the exception: it is kept across restarts of the sorting stage,
 * and only starts again from 0 when the whole level is replayed.
 */

import { DIFFICULTIES } from './state.js';

// Share of the final score each phase is worth. Adds up to 100.
const WEIGHTS = { sorting: 30, arranging: 20, quiz: 50 };

// Each time the sorting timer runs out takes this share off the sorting
// score (0.2 = 20%), but never below SORTING_TIMEOUT_FLOOR of it, so a
// player who struggles keeps some of that part of the score. Tune both
// when balancing the title cut-offs below.
const SORTING_TIMEOUT_PENALTY = 0.2;
const SORTING_TIMEOUT_FLOOR = 0.4;

// Highest first. A title is earned at or above its cut off for the difficulty.
const TITLES = [
  {
    title: 'Master Historian',
    description: "You've mastered the exhibit and proven your knowledge of history!",
    cutoff: { [DIFFICULTIES.EASY]: 85, [DIFFICULTIES.HARD]: 90 },
  },
  {
    title: 'Museum Curator',
    description: 'You know how to build an exhibit worthy of a museum!',
    cutoff: { [DIFFICULTIES.EASY]: 70, [DIFFICULTIES.HARD]: 75 },
  },
  {
    title: 'Artefact Investigator',
    description: "You've developed a sharp eye for historical artefacts!",
    cutoff: { [DIFFICULTIES.EASY]: 50, [DIFFICULTIES.HARD]: 55 },
  },
  {
    title: 'History Explorer',
    description: "You're starting to uncover the stories of the past!",
    cutoff: { [DIFFICULTIES.EASY]: 30, [DIFFICULTIES.HARD]: 35 },
  },
  {
    title: 'Curious Visitor',
    description: 'Your journey into history has just begun!',
    cutoff: { [DIFFICULTIES.EASY]: 0, [DIFFICULTIES.HARD]: 0 },
  },
];

/**
 * What share of the sorting score is kept after the given number of time-outs:
 * 1 with none, then 0.8, 0.6, 0.4 and 0.4 from there on.
 * @param {number} [timeouts]  how many times the sorting timer ran out
 */
export function sortingTimeoutFactor(timeouts = 0) {
  return Math.max(SORTING_TIMEOUT_FLOOR, 1 - SORTING_TIMEOUT_PENALTY * Math.max(0, timeouts));
}

/**
 * The level's score as a whole number from 0 to 100.
 * @param {Record<string, { correct: number, total: number }> & { sortingTimeouts?: number }} results  ctx.results from js/game/level.js
 */
export function calculateScore(results) {
  let earned = 0;
  let possible = 0;
  Object.entries(WEIGHTS).forEach(([phase, weight]) => {
    const result = results[phase];
    // A phase with nothing to score (e.g. a level with no artefacts) is left out rather than counted as 0.
    if (!result || result.total <= 0) return;
    const keep = phase === 'sorting' ? sortingTimeoutFactor(results.sortingTimeouts) : 1;
    earned += weight * (result.correct / result.total) * keep;
    possible += weight;
  });
  return possible === 0 ? 0 : Math.round((earned / possible) * 100);
}

/**
 * The title earned by a score on the given difficulty.
 * @param {number} score  from calculateScore()
 * @param {'easy'|'hard'} difficulty
 * @returns {{ title: string, description: string }}
 */
export function getTitle(score, difficulty) {
  const { title, description } =
    TITLES.find((entry) => score >= entry.cutoff[difficulty]) ?? TITLES[TITLES.length - 1];
  return { title, description };
}
