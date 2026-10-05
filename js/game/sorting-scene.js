/**
 * sorting-scene.js
 *
 * The sorting phase (D1) for js/game/level.js. Puts the level's artefacts
 * and fillers on the conveyor belt (belt.js) and wires them to sorting.js.
 * Each drop opens the information card (#sorting-feedback) with the item's
 * fun fact, holding the belt until it's closed.
 */

import { createSorter } from './sorting.js';
import { createBelt } from './belt.js';
import { setDragSuspended } from './drag.js';
import { registerPauseHandlers } from '../ui/pause-menu.js';
import { playSfx } from '../ui/audio.js';
import { showStageTransition } from '../ui/stage-transition.js';

const BELT_TO_ZONES_GAP_PX = 40; // space between the belt line and the top of the drop zones

let wired = false;
let belt = null;
// The ctx from level.js for the current run, kept so restarting reuses it.
let ctx = null;
// Set once every package is sorted; the transition opens when the last card closes.
let completedSummary = null;

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
function createStageBelt(stage, speedPxPerSec) {
  const laneTop = stage.querySelector('.drop-zones').offsetTop - BELT_TO_ZONES_GAP_PX;
  return createBelt({ stage, laneTop, speedPxPerSec });
}

function restart() {
  initSortingScene(ctx);
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
  if (completedSummary) showSortingComplete(completedSummary);
}

// Offers moving on to the next phase, sorting again, or going back to the main menu.
function showSortingComplete(summary) {
  showStageTransition({
    title: 'Well Done!',
    message: `You sorted ${summary.correct} of ${summary.total} packages correctly. Next up: arranging the display case.`,
    onNext: ctx.onNext,
    onRestart: restart,
    onExit: () => belt?.stop(),
  });
}

// Writes the running tally line.
function renderTally(summary) {
  document.getElementById('sorting-tally').textContent =
    `Sorted ${summary.sorted} / ${summary.total} · Correct ${summary.correct} · Incorrect ${summary.incorrect}`;
}

/**
 * Builds the belt, the packages and a new sorter. Safe to call again, it starts over.
 *
 * @param {object} runCtx  { level, settings, onNext } from js/game/level.js
 */
export function initSortingScene(runCtx) {
  ctx = runCtx;
  const { level, settings } = ctx;
  const stage = document.getElementById('stage-area');
  const tally = document.getElementById('sorting-tally');

  if (!wired) {
    document.getElementById('btn-sorting-feedback-close').addEventListener('click', hideCard);
    registerPauseHandlers('screen-sorting', {
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
      onRestart: restart,
      onQuit: () => belt?.stop(),
    });
    wired = true;
  }

  belt?.stop();
  completedSummary = null;
  hideCard();
  document.getElementById('sorting-heading').textContent = level.name;

  const items = [...level.artefacts, ...level.fillers];
  const runBelt = createStageBelt(stage, settings.beltSpeedPxPerSec);
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
      // onSorted has just opened this package's card; the transition waits for it to close.
      completedSummary = summary;
      tally.textContent =
        `All ${summary.total} packages sorted, ${summary.correct} correct and ${summary.incorrect} incorrect.`;
    },
  });

  spawnPackages(stage, shuffle(items), sorter, runBelt);
  runBelt.start();
  renderTally(sorter.getSummary());
}
