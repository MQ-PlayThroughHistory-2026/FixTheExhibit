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

// Absolute ceiling on columns, independent of screen width - a future
// level with far more artefacts shouldn't produce one endless row. In
// practice the width/size bounds below already land around this number
// for the current 10-artefact levels on the widest kiosk display.
const MAX_COLS_ABSOLUTE = 12;
// Item size scales between these bounds instead of staying fixed at one
// pixel value - MIN keeps boxes touch-friendly (UR06) on narrow screens,
// MAX stops them ballooning past a comfortable size on very wide kiosk
// displays. Slots are drawn 8px larger than items, same ratio as the
// original fixed 96px/88px pair, so items sit with a visible dashed
// border once placed.
const ITEM_SIZE_MIN_PX = 64;
const ITEM_SIZE_MAX_PX = 160;
const SLOT_ITEM_SIZE_DIFF_PX = 8;
const SLOT_GAP_PX = 24;
const ITEM_GAP_PX = 32;
const SECTION_GAP_PX = 32;
const STAGE_PADDING_PX = 24;

let wired = false;
let currentResizeHandler = null;

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

function rowsNeeded(count, cols) {
  return Math.ceil(count / cols);
}

// Position for item `index` in a left-to-right, top-to-bottom grid that
// wraps after `cols` columns, starting `topPx` down from the stage top.
function gridPosition(index, cols, sizePx, gapPx, topPx) {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    left: col * (sizePx + gapPx) + STAGE_PADDING_PX,
    top: topPx + row * (sizePx + gapPx),
  };
}

async function loadArtefacts() {
  const level = getLevel() ?? 'gold-rush';
  const response = await fetch(`data/levels/${level}/artefacts.json`);
  if (!response.ok) {
    throw new Error(`Failed to load artefacts.json for "${level}": ${response.status}`);
  }
  return response.json();
}

// Picks a column count and an item size for the current stage width.
// Previously this stayed pinned at a fixed column count with items
// growing up to their cap, which meant any width beyond "cols * max
// item size" just sat empty (the bug on wide landscape screens). Instead,
// this picks the SMALLEST column count whose row still fits within
// ITEM_SIZE_MAX_PX - i.e. it only adds columns once the current column
// count would otherwise force items bigger than the cap - so the grid
// keeps growing (more columns, not wasted margin) as the stage widens,
// and settles back to fewer/bigger columns as it narrows.
function getDynamicLayout(stageWidth, artefactCount) {
  const availableWidth = stageWidth - (STAGE_PADDING_PX * 2);
  const maxCols = Math.max(1, Math.min(MAX_COLS_ABSOLUTE, artefactCount));

  const colsForMaxSize = Math.ceil((availableWidth + ITEM_GAP_PX) / (ITEM_SIZE_MAX_PX + ITEM_GAP_PX));
  const cols = Math.max(1, Math.min(maxCols, colsForMaxSize));

  const rawSize = (availableWidth - ITEM_GAP_PX * (cols - 1)) / cols;
  const itemSize = Math.max(ITEM_SIZE_MIN_PX, Math.min(ITEM_SIZE_MAX_PX, rawSize));
  const slotSize = itemSize + SLOT_ITEM_SIZE_DIFF_PX;

  return { cols, itemSize, slotSize };
}

// Publishes the current box sizes as CSS custom properties so
// arranging.css can size .silhouette-slot / .arranging-item without the
// pixel values being duplicated (and getting out of sync) between here
// and the stylesheet.
function applySizeVars(stage, itemSize, slotSize) {
  stage.style.setProperty('--arranging-item-size', `${itemSize}px`);
  stage.style.setProperty('--arranging-slot-size', `${slotSize}px`);
}

// One labelled slot per artefact, in data order (not shuffled) so the
// display case layout stays stable across restarts.
function buildSlots(stage, artefacts, cols, slotSize) {
  artefacts.forEach((item, i) => {
    let slot = stage.querySelector(`[data-slot="${item.id}"]`);
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'silhouette-slot';
      slot.dataset.slot = item.id;
      slot.textContent = `Spot ${i + 1}`;
      stage.appendChild(slot);
    }
    const { left, top } = gridPosition(i, cols, slotSize, SLOT_GAP_PX, STAGE_PADDING_PX);
    slot.style.left = `${left}px`;
    slot.style.top = `${top}px`;
  });
}

// Repositions each entry (in current array order) into a packed grid
// starting at topPx.
function layoutItems(entries, cols, topPx, itemSize) {
  entries.forEach(({ el }, i) => {
    const { left, top } = gridPosition(i, cols, itemSize, ITEM_GAP_PX, topPx);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  });
}

// Creates one draggable box per artefact
function buildItems(stage, artefacts, arranger) {
  return shuffle(artefacts).map((item) => {
    const el = document.createElement('div');
    el.className = 'draggable-box arranging-item';

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
    arranger.addItem(el, item);
    return { el, item };
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

  // Clean up previous event listeners on re-init
  if (currentResizeHandler) {
    window.removeEventListener('resize', currentResizeHandler);
  }

  // Only remove the previous run's slots/items
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

  let { cols, itemSize, slotSize } = getDynamicLayout(stage.clientWidth, artefacts.length);
  applySizeVars(stage, itemSize, slotSize);
  buildSlots(stage, artefacts, cols, slotSize);

  let slotRows = rowsNeeded(artefacts.length, cols);
  let itemsTopPx = STAGE_PADDING_PX + slotRows * (slotSize + SLOT_GAP_PX) + SECTION_GAP_PX;

  let itemEntries;

  const arranger = createArranger({
    stage,
    onPlaced({ item }) {
      itemEntries = itemEntries.filter((entry) => entry.item.id !== item.id);
      layoutItems(itemEntries, cols, itemsTopPx, itemSize);
      renderTally(arranger.getSummary());
      showFeedback(item);
    },
    onComplete(summary) {
      document.getElementById('arranging-tally').textContent =
        `All ${summary.total} artefacts placed!`;
    },
  });

  itemEntries = buildItems(stage, artefacts, arranger);
  layoutItems(itemEntries, cols, itemsTopPx, itemSize);
  renderTally(arranger.getSummary());

  const itemRows = rowsNeeded(artefacts.length, cols);
  const neededHeight = itemsTopPx + itemRows * (itemSize + ITEM_GAP_PX) + STAGE_PADDING_PX;
  stage.style.minHeight = `${neededHeight}px`;

  // Dynamic reflow on viewport change - recalculates both the column
  // count and the box sizes, so the grid keeps using the available
  // space rather than just staying small with extra margin.
  currentResizeHandler = () => {
    ({ cols, itemSize, slotSize } = getDynamicLayout(stage.clientWidth, artefacts.length));
    applySizeVars(stage, itemSize, slotSize);
    slotRows = rowsNeeded(artefacts.length, cols);
    itemsTopPx = STAGE_PADDING_PX + slotRows * (slotSize + SLOT_GAP_PX) + SECTION_GAP_PX;

    buildSlots(stage, artefacts, cols, slotSize);
    layoutItems(itemEntries, cols, itemsTopPx, itemSize);

    const rows = rowsNeeded(artefacts.length, cols);
    stage.style.minHeight = `${itemsTopPx + rows * (itemSize + ITEM_GAP_PX) + STAGE_PADDING_PX}px`;
  };

  window.addEventListener('resize', currentResizeHandler);
}