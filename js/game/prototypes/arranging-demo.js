/**
 * arranging-demo.js
 *
 * TEMPORARY. Loads the current level's real artefacts.json - fillers never
 * reach the arranging stage, they're rejected during sorting, so this only
 * reads artefacts.json, not fillers.json - and wires them to
 * js/game/arranging.js. Reachable directly from a temporary main-menu
 * button so arranging can be tried without going through the full
 * level -> difficulty -> tutorial -> sorting flow first.
 *
 * Renders each artefact's real `image` if the field is present, falling
 * back to a plain labelled box if it's missing OR the image fails to load.
 * There are no real image assets yet, so every artefact currently falls
 * back to a box - that fallback is what makes this safe to run today.
 *
 * Silhouette slots are plain labelled boxes ("Spot 1", "Spot 2"...), not
 * real silhouette artwork - that's a Visual Arts task (VA10). The slot
 * label never reveals which artefact belongs there.
 *
 * The feedback panel on correct placement is a stand-in for the D4
 * information card, same as sorting-feedback stands in for D3. It shows
 * item.blurb, so this only looks fully populated once Research has
 * written that field in.
 *
 * Goes together with: the temporary menu button in index.html, the
 * screen-arranging-prototype section, and this file's import in menu.js.
 * Delete all of it together when the real arranging scene (D2) is built.
 */

import { createArranger } from '../arranging.js';
import { getLevel } from '../state.js';

const SLOT_STEP_PX = 120; // 96px slot plus 24px gap
const SLOT_ROW_PX = 48;
const ITEM_STEP_PX = 100; // 88px item plus 12px gap
const ITEM_ROW_PX = 220;

let wired = false;

// Returns a shuffled copy of the list, so items don't start lined up
// left-to-right in their correct slot order.
function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function loadArtefacts() {
  const level = getLevel() ?? 'gold-rush';
  const response = await fetch(`data/levels/${level}/artefacts.json`);
  if (!response.ok) {
    throw new Error(`Failed to load artefacts.json for "${level}": ${response.status}`);
  }
  return response.json();
}

// One labelled slot per artefact, in data order (not shuffled) so the
// display case layout stays stable across restarts.
function buildSlots(stage, artefacts) {
  artefacts.forEach((item, i) => {
    const slot = document.createElement('div');
    slot.className = 'silhouette-slot';
    slot.dataset.slot = item.id;
    slot.textContent = `Spot ${i + 1}`;
    slot.style.left = `${i * SLOT_STEP_PX}px`;
    slot.style.top = `${SLOT_ROW_PX}px`;
    stage.appendChild(slot);
  });
}

// One draggable box per artefact - a real image if the data has one and
// it actually loads, otherwise a plain box with its name.
function buildItems(stage, artefacts, arranger) {
  shuffle(artefacts).forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'draggable-box arranging-item';
    el.style.left = `${i * ITEM_STEP_PX}px`;
    el.style.top = `${ITEM_ROW_PX}px`;

    if (item.image) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.name;
      img.onerror = () => {
        // Missing/broken image path - fall back to a text box instead of
        // showing a broken-image icon.
        img.remove();
        el.textContent = item.name;
      };
      el.appendChild(img);
    } else {
      el.textContent = item.name;
    }

    stage.appendChild(el);
    arranger.addItem(el, item);
  });
}

function showFeedback(item) {
  const card = document.getElementById('arranging-feedback');
  document.getElementById('arranging-feedback-title').textContent = item.name;
  document.getElementById('arranging-feedback-text').textContent =
    item.blurb ?? '[No blurb written yet for this artefact]';
  card.classList.remove('hidden');
}

function hideFeedback() {
  document.getElementById('arranging-feedback').classList.add('hidden');
}

function renderTally(summary) {
  document.getElementById('arranging-tally').textContent =
    `Placed ${summary.placed} / ${summary.total}`;
}

/** Builds a fresh arranging stage. Safe to call again, it starts over. */
export async function initArrangingDemo() {
  const stage = document.getElementById('arranging-stage');
  // Only remove the previous run's slots/items - #arranging-feedback lives
  // in this same container and must survive a restart.
  stage.querySelectorAll('.silhouette-slot, .arranging-item').forEach((el) => el.remove());
  hideFeedback();

  if (!wired) {
    document.getElementById('btn-arranging-feedback-close').addEventListener('click', hideFeedback);
    document.getElementById('btn-arranging-restart').addEventListener('click', initArrangingDemo);
    wired = true;
  }

  let artefacts;
  try {
    artefacts = await loadArtefacts();
  } catch (err) {
    console.error(err);
    const errorEl = document.createElement('p');
    errorEl.textContent = 'Artefacts could not be loaded. Check the console for details.';
    stage.appendChild(errorEl);
    return;
  }

  buildSlots(stage, artefacts);

  const arranger = createArranger({
    stage,
    onPlaced({ item }) {
      renderTally(arranger.getSummary());
      showFeedback(item);
    },
    onComplete(summary) {
      document.getElementById('arranging-tally').textContent =
        `All ${summary.total} artefacts placed!`;
    },
  });

  buildItems(stage, artefacts, arranger);
  renderTally(arranger.getSummary());
}
