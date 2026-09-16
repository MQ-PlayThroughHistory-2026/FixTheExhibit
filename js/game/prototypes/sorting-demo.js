/**
 * sorting-demo.js
 *
 * TEMPORARY. Loads the selected level's packages from data/levels/<id>/
 * artefacts.json and fillers.json, puts them on the conveyor belt
 * (js/game/belt.js) on the Stage 1 prototype screen and wires them to
 * js/game/sorting.js, so sorting can be tried from the menu flow before the
 * real Stage 1 (js/game/stage1.js) exists. Sits alongside drag-demo.js and
 * goes when that does.
 */

import { createSorter } from '../sorting.js';
import { createBelt } from '../belt.js';
import { getLevel, getDifficultyConfig } from '../state.js';

const BASE_BELT_SPEED_PX_PER_SEC = 60; // scaled by the difficulty's beltSpeedMultiplier
const BELT_TO_ZONES_GAP_PX = 40; // space between the belt line and the top of the drop zones

let wired = false;
let belt = null;

// Fetches one JSON file, throwing on a non-OK response.
async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json();
}

// Loads the level's artefacts and fillers as one list of package items.
async function loadLevelItems(levelId) {
  const [artefacts, fillers] = await Promise.all([
    loadJson(`data/levels/${levelId}/artefacts.json`),
    loadJson(`data/levels/${levelId}/fillers.json`),
  ]);
  return [...artefacts, ...fillers];
}

// Returns a shuffled copy of the list.
function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Creates the belt for this run, its band sitting a little above the drop zones.
function createStageBelt(stage) {
  const laneTop = stage.querySelector('.drop-zones').offsetTop - BELT_TO_ZONES_GAP_PX;
  return createBelt({
    stage,
    laneTop,
    speedPxPerSec: BASE_BELT_SPEED_PX_PER_SEC * (getDifficultyConfig()?.beltSpeedMultiplier ?? 1),
  });
}

// Creates one element per item, puts it on the belt and registers it with the sorter.
function spawnPackages(stage, items, sorter, runBelt) {
  stage.querySelectorAll('.package').forEach((el) => el.remove());

  items.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'draggable-box package';
    el.textContent = item.name;
    stage.appendChild(el);
    runBelt.add(el);
    sorter.addPackage(el, item);
  });
}

// Shows the feedback card and holds the belt while it is open.
function showCard(title, text, correct) {
  const card = document.getElementById('sorting-feedback');
  document.getElementById('sorting-feedback-title').textContent = title;
  document.getElementById('sorting-feedback-text').textContent = text;
  card.classList.toggle('is-correct', correct);
  card.classList.toggle('is-incorrect', !correct);
  card.classList.remove('hidden');
  belt?.pause();
}

// Hides the feedback card and lets the belt move again.
function hideCard() {
  document.getElementById('sorting-feedback').classList.add('hidden');
  belt?.resume();
}

// Writes the running tally line.
function renderTally(summary) {
  document.getElementById('sorting-tally').textContent =
    `Sorted ${summary.sorted} / ${summary.total} · Correct ${summary.correct} · Incorrect ${summary.incorrect}`;
}

// Loads the level data, then builds the belt, the packages and a new sorter. Safe to call again, it starts over.
export async function initSortingDemo() {
  const stage = document.getElementById('stage-area');
  const tally = document.getElementById('sorting-tally');

  if (!wired) {
    document.getElementById('btn-sorting-feedback-close').addEventListener('click', hideCard);
    document.getElementById('btn-stage1-restart').addEventListener('click', initSortingDemo);
    document.getElementById('btn-stage1-main-menu').addEventListener('click', () => belt?.stop());
    wired = true;
  }

  belt?.stop();
  hideCard();
  stage.querySelectorAll('.package').forEach((el) => el.remove());
  tally.textContent = 'Loading packages…';

  let items;
  try {
    items = await loadLevelItems(getLevel());
  } catch (err) {
    console.error(err);
    tally.textContent = 'Packages could not be loaded. Check the console for details.';
    return;
  }

  const runBelt = createStageBelt(stage);
  belt = runBelt;

  const sorter = createSorter({
    stage,
    onReturn: (el) => runBelt.putBack(el),
    onSorted(result) {
      renderTally(sorter.getSummary());
      showCard(
        result.correct ? `Correct, ${result.item.name} sorted` : `Not quite, ${result.item.name}`,
        result.funFact ?? '',
        result.correct,
      );
    },
    onComplete(summary) {
      runBelt.stop();
      tally.textContent =
        `All ${summary.total} packages sorted, ${summary.correct} correct and ${summary.incorrect} incorrect.`;
    },
  });

  spawnPackages(stage, shuffle(items), sorter, runBelt);
  runBelt.start();
  renderTally(sorter.getSummary());
}
