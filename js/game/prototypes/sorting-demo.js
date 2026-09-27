/**
 * sorting-demo.js
 *
 * TEMPORARY. Loads the selected level's packages from data/levels/<id>/
 * artefacts.json and fillers.json, puts them on the conveyor belt
 * (js/game/belt.js) on the Stage 1 prototype screen and wires them to
 * js/game/sorting.js, so sorting can be tried from the menu flow before the
 * real Stage 1 (js/game/stage1.js) exists.
 *
 * When someone starts building the real sorting scene:
 *   1. Delete this file and styles/prototypes/sorting-demo.css (plus their
 *      folders if empty afterwards, and the stylesheet <link> in index.html).
 *   2. Remove the `screen-stage1-prototype` section from index.html.
 *   3. In js/ui/menu.js, remove the import of initSortingDemo and the
 *      gold-rush/easy special case in enterStage1(). The real scene
 *      registers its own pause handlers (js/ui/pause-menu.js) the way
 *      this file does.
 *   4. Build the real scene in js/game/stage1.js instead - that file is
 *      intentionally untouched by this prototype.
 *
 * js/game/drag.js, sorting.js and belt.js are NOT part of this cleanup -
 * they are generic, reusable helpers the real scene will use.
 */

import { createSorter } from '../sorting.js';
import { createBelt } from '../belt.js';
import { getLevel, getDifficultyConfig } from '../state.js';
import { setDragSuspended } from '../drag.js';
import { registerPauseHandlers } from '../../ui/pause-menu.js';
import { playSfx } from '../../ui/audio.js';

//const BASE_BELT_SPEED_PX_PER_SEC = 60; // scaled by the difficulty's beltSpeedMultiplier
const BASE_BELT_SPEED_PX_PER_SEC = 120; // *TEMP ADJUSTED FOR DEMO
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
    
    if (item.image) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.name;
      img.onerror = () => {
        img.remove();
        el.textContent = item.name;
      };
      el.appendChild(img);
    } else {
      el.textContent = item.name;
    }

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
  // Without this, a package already off the belt (mid-drag when this
  // package's own drop triggered the card) could still be dropped into a
  // bin underneath the card while it covers the drop zones.
  setDragSuspended(true);
}

function isCardOpen() {
  return !document.getElementById('sorting-feedback').classList.contains('hidden');
}

// Hides the feedback card and lets the belt move again.
function hideCard() {
  document.getElementById('sorting-feedback').classList.add('hidden');
  belt?.resume();
  setDragSuspended(false);
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
    registerPauseHandlers('screen-stage1-prototype', {
      onPause() {
        belt?.pause();
        setDragSuspended(true);
      },
      // The feedback card holds the belt and drag itself, so leave them held if it's still open.
      onResume() {
        if (isCardOpen()) return;
        belt?.resume();
        setDragSuspended(false);
      },
      onRestart: initSortingDemo,
      onQuit: () => belt?.stop(),
    });
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
      playSfx(result.correct ? 'correct' : 'incorrect');
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
