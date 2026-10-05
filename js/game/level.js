/**
 * level.js
 *
 * Runs one level from start to finish: loads its data once, works out the
 * settings for the chosen difficulty, then plays the phases in order
 * (sorting -> arranging -> quiz). Level-agnostic - every level runs through
 * the same phases, only the data and numbers change.
 *
 * Each phase is a function start(ctx) that builds its scene on an
 * already-shown screen. ctx is:
 *   level     { id, name, artefacts, fillers, config } from level-data.js
 *   settings  state.js's getLevelSettings() for this level + difficulty
 *   onNext    call to move on to the next phase; undefined on the last one
 * A phase that restarts itself should call start again with the same ctx.
 */

import { getLevel, getLevelSettings } from './state.js';
import { loadLevelData } from './level-data.js';
import { showScreen } from '../ui/screens.js';
import { initSortingScene } from './sorting-scene.js';
import { initArrangingScene } from './arranging-scene.js';

const PHASES = [
  { screen: 'screen-sorting', start: initSortingScene },
  { screen: 'screen-arranging', start: initArrangingScene },
  // { screen: 'screen-quiz', start: initQuizScene },
];

let level = null;
let settings = null;

function runPhase(index) {
  const phase = PHASES[index];
  const hasNext = index + 1 < PHASES.length;
  showScreen(phase.screen);
  // After showScreen so the phase's stage has a size to lay things out in.
  phase.start({
    level,
    settings,
    onNext: hasNext ? () => runPhase(index + 1) : undefined,
  });
}

/**
 * Loads the selected level and starts its first phase. Throws if the
 * level's data can't be loaded.
 */
export async function startLevel() {
  level = await loadLevelData(getLevel());
  settings = getLevelSettings(level.config);
  runPhase(0);
}
