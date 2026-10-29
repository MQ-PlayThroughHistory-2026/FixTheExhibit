/**
 * level.js
 *
 * Runs one level from start to finish: loads its data once, then plays the
 * phases in order (sorting -> arranging -> quiz) with the chosen
 * difficulty's settings. Level-agnostic - every level runs through the
 * same phases, only the data changes.
 *
 * Each phase is a function start(ctx) that builds its scene on an
 * already-shown screen. ctx is:
 *   level     { id, name, artefacts, fillers } from level-data.js
 *   settings  state.js's getDifficultyConfig() for the chosen difficulty
 *   onNext    call to move on to the next phase; undefined on the last one
 *   onRestartLevel  call to play the whole level again from its first phase
 *   results   each phase leaves its { correct, total } here under its own
 *             name when it finishes, for the final score (score.js). The
 *             sorting stage also keeps a running sortingTimeouts count here.
 * A phase that restarts itself should call start again with the same ctx.
 */

import { getLevel, getDifficultyConfig } from './state.js';
import { loadLevelData } from './level-data.js';
import { showScreen } from '../ui/screens.js';
import { initSortingScene } from './sorting-scene.js';
import { initArrangingScene } from './arranging-scene.js';
import { initQuizScene } from '../quiz/quiz-scene.js';

const PHASES = [
  { screen: 'screen-sorting', start: initSortingScene },
  { screen: 'screen-arranging', start: initArrangingScene },
  { screen: 'screen-quiz', start: initQuizScene },
];

let level = null;
let settings = null;
// This playthrough's results so far, see ctx.results above.
let results = {};

function runPhase(index) {
  const phase = PHASES[index];
  const hasNext = index + 1 < PHASES.length;
  if (index === 0) results = {};
  showScreen(phase.screen);
  // After showScreen so the phase's stage has a size to lay things out in.
  phase.start({
    level,
    settings,
    results,
    onNext: hasNext ? () => runPhase(index + 1) : undefined,
    // Used by the certificate's Restart to replay from sorting.
    onRestartLevel: () => runPhase(0),
  });
}

/**
 * Loads the selected level and starts its first phase. Throws if the
 * level's data can't be loaded.
 */
export async function startLevel() {
  level = await loadLevelData(getLevel());
  settings = getDifficultyConfig();
  runPhase(0);
}
