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
 *              Packages left on the belt when the timer ran out aren't
 *              correct, so running out of time costs points without the
 *              clock needing a share of its own.
 *   arranging  artefacts placed, out of drops onto a slot. Every artefact
 *              ends up placed, so this is what tells a careful player from
 *              one who tried every slot.
 *   quiz       questions answered correctly, out of every question.
 * Each is a 0 to 1 accuracy, weighted by WEIGHTS below. Restarting a phase
 * overwrites its entry, so only the run that was kept counts.
 */

import { DIFFICULTIES } from './state.js';

// Share of the final score each phase is worth. Adds up to 100.
const WEIGHTS = { sorting: 30, arranging: 20, quiz: 50 };

// Highest first. A title is earned at or above its cut off for the difficulty.
const TITLES = [
  {
    title: 'Master Historian',
    description: "You've mastered the exhibit and proven your knowledge of history!",
    cutoff: { [DIFFICULTIES.EASY]: 90, [DIFFICULTIES.HARD]: 85 },
  },
  {
    title: 'Museum Curator',
    description: 'You know how to build an exhibit worthy of a museum!',
    cutoff: { [DIFFICULTIES.EASY]: 75, [DIFFICULTIES.HARD]: 70 },
  },
  {
    title: 'Artefact Investigator',
    description: "You've developed a sharp eye for historical artefacts!",
    cutoff: { [DIFFICULTIES.EASY]: 55, [DIFFICULTIES.HARD]: 50 },
  },
  {
    title: 'History Explorer',
    description: "You're starting to uncover the stories of the past!",
    cutoff: { [DIFFICULTIES.EASY]: 35, [DIFFICULTIES.HARD]: 30 },
  },
  {
    title: 'Curious Visitor',
    description: 'Your journey into history has just begun!',
    cutoff: { [DIFFICULTIES.EASY]: 0, [DIFFICULTIES.HARD]: 0 },
  },
];

/**
 * The level's score as a whole number from 0 to 100.
 * @param {Record<string, { correct: number, total: number }>} results  ctx.results from js/game/level.js
 */
export function calculateScore(results) {
  let earned = 0;
  let possible = 0;
  Object.entries(WEIGHTS).forEach(([phase, weight]) => {
    const result = results[phase];
    // A phase with nothing to score (e.g. a level with no artefacts) is left out rather than counted as 0.
    if (!result || result.total <= 0) return;
    earned += weight * (result.correct / result.total);
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
