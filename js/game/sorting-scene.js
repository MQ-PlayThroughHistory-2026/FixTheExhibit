/**
 * sorting-scene.js
 *
 * The sorting phase (D1) for js/game/level.js. Puts the level's artefacts
 * and fillers on the conveyor belt (belt.js) and wires them to sorting.js.
 * The first time this session it opens on the how-to-play card
 * (#sorting-tutorial, js/ui/tutorial.js), and nothing moves until it's
 * closed. Each drop opens the information card (#sorting-feedback) with
 * the item's fun fact, holding the belt until it's closed.
 *
 * The countdown (D8, timer.js) runs for settings.sortingTimerSeconds. It
 * holds whenever the belt does - pause menu or an open information card -
 * so reading a fun fact never costs time. When it runs out the belt stops,
 * dragging is blocked and the transition offers moving on with whatever
 * was sorted.
 *
 * The stage fills the viewport (stage-size.js) and the packages, drop
 * zones and labels scale with it in CSS (sorting-scene.css). The belt
 * speed scales with the stage width too, so a package takes the same time
 * to cross on any screen and the difficulty doesn't change with it.
 */

import { createSorter } from './sorting.js';
import { createBelt } from './belt.js';
import { setDragSuspended } from './drag.js';
import { CountdownTimer } from './timer.js';
import { sizeStageToViewport, watchViewport } from './stage-size.js';
import { registerPauseHandlers } from '../ui/pause-menu.js';
import { playSfx } from '../ui/audio.js';
import { showStageTransition } from '../ui/stage-transition.js';
import { setProgress } from '../ui/progress-bar.js';
import { showTutorialOnce } from '../ui/tutorial.js';

// Space between the belt line and the bottom of the stage, as a share of the stage height.
const BELT_BOTTOM_GAP = 0.08;
// Stage width that settings.beltSpeedPxPerSec is tuned for; other widths scale the speed.
const REFERENCE_STAGE_WIDTH_PX = 640;
const LOW_TIME_SECONDS = 10; // the countdown turns red from here

let wired = false;
let belt = null;
let timer = null;
// Stops the current run's viewport listener (stage-size.js).
let unwatchViewport = null;
// The ctx from level.js for the current run, kept so restarting reuses it.
let ctx = null;
// Set once every package is sorted; the transition opens when the last card closes.
let completedSummary = null;
// Set when the countdown runs out; later drops (one mid-drag at 0) are ignored.
let timeUp = false;

// Returns a shuffled copy of the list.
function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Where the belt runs and how fast, for the stage's current size: the band
// runs a little above the bottom of the stage, under the drop zones along
// the top, and the speed keeps the crossing time the same as on the
// reference width.
function beltGeometry(stage) {
  return {
    laneTop: stage.clientHeight * (1 - BELT_BOTTOM_GAP),
    speedPxPerSec: ctx.settings.beltSpeedPxPerSec * (stage.clientWidth / REFERENCE_STAGE_WIDTH_PX),
  };
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
      // No box behind an image; it comes back with the name if the image fails.
      el.classList.add('has-image');
      img.onerror = () => {
        img.remove();
        el.classList.remove('has-image');
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

// Shows the feedback card and holds the belt and countdown while it is open.
function showCard(title, text, correct) {
  const card = document.getElementById('sorting-feedback');
  document.getElementById('sorting-feedback-title').textContent = title;
  document.getElementById('sorting-feedback-text').textContent = text;
  card.classList.toggle('is-correct', correct);
  card.classList.toggle('is-incorrect', !correct);
  card.classList.remove('hidden');
  belt?.pause();
  timer?.pause();
  // Without this, a package already off the belt (mid-drag when this
  // package's own drop triggered the card) could still be dropped into a
  // bin underneath the card while it covers the drop zones.
  setDragSuspended(true);
}

function isCardOpen() {
  return !document.getElementById('sorting-feedback').classList.contains('hidden');
}

// Hides the feedback card and lets the belt and countdown move again.
// Both ignore resume() once stopped, so this is safe after the last package.
function hideCard() {
  document.getElementById('sorting-feedback').classList.add('hidden');
  belt?.resume();
  timer?.resume();
  setDragSuspended(false);
  if (completedSummary) showSortingComplete(completedSummary);
}

// Stops the belt and countdown for good, e.g. once every package is sorted.
function stopScene() {
  belt?.stop();
  timer?.stop();
}

// Stops everything including resize handling, before going back to the main menu.
function leaveScene() {
  stopScene();
  unwatchViewport?.();
}

// Offers moving on to the next phase, sorting again, or leaving (reloads the page).
function showSortingComplete(summary) {
  showStageTransition({
    title: 'Well Done!',
    message: `You sorted ${summary.correct} of ${summary.total} packages correctly. Next up: arranging the display case.`,
    onNext: ctx.onNext,
    onRestart: restart,
  });
}

// Countdown hit 0: freeze the scene and offer the same choices as finishing.
function onTimeUp(sorter) {
  timeUp = true;
  belt?.stop();
  setDragSuspended(true);
  playSfx('incorrect');
  const summary = sorter.getSummary();
  showStageTransition({
    title: "Time's Up!",
    message: `You sorted ${summary.sorted} of ${summary.total} packages, ${summary.correct} correctly. Next up: arranging the display case.`,
    onNext: ctx.onNext,
    onRestart: restart,
  });
}

// Shows the time left as m:ss, red for the last few seconds.
function renderTimer(secondsRemaining) {
  const el = document.getElementById('sorting-timer');
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = String(secondsRemaining % 60).padStart(2, '0');
  el.textContent = `${minutes}:${seconds}`;
  el.classList.toggle('is-low', secondsRemaining <= LOW_TIME_SECONDS);
}

// Fills the progress bar by how many packages have been sorted.
function renderProgress(summary) {
  setProgress(document.getElementById('sorting-progress'), summary.sorted, summary.total);
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

  if (!wired) {
    document.getElementById('btn-sorting-feedback-close').addEventListener('click', hideCard);
    registerPauseHandlers('screen-sorting', {
      onPause() {
        belt?.pause();
        timer?.pause();
        setDragSuspended(true);
      },
      // The feedback card holds the belt, countdown and drag itself, so leave them held if it's still open.
      onResume() {
        if (isCardOpen()) return;
        belt?.resume();
        timer?.resume();
        setDragSuspended(false);
      },
      onRestart: restart,
    });
    wired = true;
  }

  // Stop the previous run first, so hideCard() below has nothing to resume.
  leaveScene();
  completedSummary = null;
  timeUp = false;
  hideCard();
  // Everything above the stage is filled in before sizing it to what's left of the viewport.
  document.getElementById('sorting-heading').textContent = level.name;
  renderTimer(settings.sortingTimerSeconds);
  sizeStageToViewport(stage);

  const items = [...level.artefacts, ...level.fillers];
  const runBelt = createBelt({ stage, ...beltGeometry(stage) });
  belt = runBelt;

  const sorter = createSorter({
    stage,
    onReturn: (el) => runBelt.putBack(el),
    onSorted(result) {
      if (timeUp) return;
      playSfx(result.correct ? 'correct' : 'incorrect');
      renderProgress(sorter.getSummary());
      showCard(
        result.correct ? `Correct, ${result.item.name} sorted` : `Not quite, ${result.item.name}`,
        result.funFact ?? '',
        result.correct,
      );
    },
    onComplete(summary) {
      if (timeUp) return;
      stopScene();
      // onSorted has just opened this package's card; the transition waits for it to close.
      completedSummary = summary;
    },
  });

  timer = new CountdownTimer(settings.sortingTimerSeconds, {
    onTick: renderTimer,
    onExpire: () => onTimeUp(sorter),
  });

  spawnPackages(stage, shuffle(items), sorter, runBelt);
  renderProgress(sorter.getSummary());

  // Re-fits the stage on viewport change; CSS rescales the packages and
  // zones, so the belt only needs its lane and speed re-measured.
  unwatchViewport = watchViewport(() => {
    if (stage.offsetParent === null) return; // screen hidden, nothing to measure
    sizeStageToViewport(stage);
    runBelt.resize(beltGeometry(stage));
  });

  // The belt and countdown wait for the first-time tutorial to be closed.
  showTutorialOnce('sorting', document.getElementById('sorting-tutorial'), () => {
    runBelt.start();
    timer.start();
  });
}
