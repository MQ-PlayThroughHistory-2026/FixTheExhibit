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
// displays. Slots are drawn 4px larger than items - exactly the slot's two
// 2px borders (see .silhouette-slot in arranging.css) - so a placed item
// fills the inside of its slot with the border still visible around it.
const ITEM_SIZE_MIN_PX = 64;
const ITEM_SIZE_MAX_PX = 160;
const SLOT_ITEM_SIZE_DIFF_PX = 4;
const SLOT_GAP_PX = 24;
const ITEM_GAP_PX = 32;
const SECTION_GAP_PX = 32;
const STAGE_PADDING_PX = 24;

// On phones the stage is a fixed height (arranging-demo.css sets it, the same
// way sorting-demo.css does) instead of growing with its content, which would
// turn the whole page into a long scroll. Item and slot boxes are scaled down
// until both grids fit inside it, using tighter gaps than the roomy desktop ones.
// Keep the breakpoint in sync with the media query in arranging-demo.css.
const FIXED_STAGE_QUERY = '(max-width: 600px)';
const FIXED_STAGE_PADDING_PX = 12;
const FIXED_GAP_PX = 8;
const FIXED_SECTION_GAP_PX = 16;

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
// wraps after `cols` columns, starting `topPx` down from the stage top and
// `paddingPx` in from its left edge.
function gridPosition(index, cols, sizePx, gapPx, topPx, paddingPx) {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    left: col * (sizePx + gapPx) + paddingPx,
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

  return {
    cols,
    itemSize,
    slotSize,
    padding: STAGE_PADDING_PX,
    slotGap: SLOT_GAP_PX,
    itemGap: ITEM_GAP_PX,
    sectionGap: SECTION_GAP_PX,
    fixedHeight: false,
  };
}

// Phone layout: the stage's width AND height are both given, so this looks
// for the column count that allows the biggest boxes while the slot grid and
// the item grid (stacked, with the gap between them) still fit inside it.
// More columns means fewer rows but narrower boxes; fewer columns means wider
// boxes but more rows - the best trade-off depends on the stage's shape and
// on how many artefacts a level has, so every column count is tried rather
// than hardcoding one. The height sum mirrors getLayout()'s neededHeight.
function getFixedLayout(stageWidth, stageHeight, artefactCount) {
  const padding = FIXED_STAGE_PADDING_PX;
  const availableWidth = stageWidth - (padding * 2);
  let best = null;

  for (let cols = 1; cols <= artefactCount; cols += 1) {
    const rows = rowsNeeded(artefactCount, cols);
    // Slots are the wider grid, so they decide how big the boxes can be across.
    const maxByWidth = (availableWidth - FIXED_GAP_PX * (cols - 1)) / cols - SLOT_ITEM_SIZE_DIFF_PX;
    // Slot rows + item rows + section gap + padding top and bottom.
    const maxByHeight =
      (stageHeight - padding * 2 - FIXED_SECTION_GAP_PX - rows * (SLOT_ITEM_SIZE_DIFF_PX + FIXED_GAP_PX * 2)) /
      (rows * 2);
    const itemSize = Math.min(ITEM_SIZE_MAX_PX, maxByWidth, maxByHeight);
    if (!best || itemSize > best.itemSize) best = { cols, itemSize };
  }

  const itemSize = Math.max(1, best.itemSize);
  return {
    cols: best.cols,
    itemSize,
    slotSize: itemSize + SLOT_ITEM_SIZE_DIFF_PX,
    padding,
    slotGap: FIXED_GAP_PX,
    itemGap: FIXED_GAP_PX,
    sectionGap: FIXED_SECTION_GAP_PX,
    fixedHeight: true,
  };
}

// Picks the layout for the current screen and works out where the item grid
// starts (below the slot grid) and how tall everything needs to be.
function getLayout(stage, artefactCount) {
  const fixedHeight = window.matchMedia(FIXED_STAGE_QUERY).matches;
  // A min-height left over from a taller (desktop) layout would override the
  // stylesheet's fixed height and skew the measurement below.
  if (fixedHeight) stage.style.minHeight = '';

  const base = fixedHeight
    ? getFixedLayout(stage.clientWidth, stage.clientHeight, artefactCount)
    : getDynamicLayout(stage.clientWidth, artefactCount);

  const rows = rowsNeeded(artefactCount, base.cols);
  const itemsTop = base.padding + rows * (base.slotSize + base.slotGap) + base.sectionGap;
  const neededHeight = itemsTop + rows * (base.itemSize + base.itemGap) + base.padding;
  return { ...base, itemsTop, neededHeight };
}

// Publishes the current box sizes as CSS custom properties so
// arranging.css can size .silhouette-slot / .arranging-item without the
// pixel values being duplicated (and getting out of sync) between here
// and the stylesheet. On desktop it also grows the stage to fit the content;
// on phones the stage keeps the fixed height from the stylesheet instead.
function applyLayout(stage, layout) {
  stage.style.setProperty('--arranging-item-size', `${layout.itemSize}px`);
  stage.style.setProperty('--arranging-slot-size', `${layout.slotSize}px`);
  stage.style.minHeight = layout.fixedHeight ? '' : `${layout.neededHeight}px`;
}

// One labelled slot per artefact, in data order (not shuffled) so the
// display case layout stays stable across restarts.
function buildSlots(stage, artefacts, layout) {
  artefacts.forEach((item, i) => {
    let slot = stage.querySelector(`[data-slot="${item.id}"]`);
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'silhouette-slot';
      slot.dataset.slot = item.id;

      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = `Silhouette for ${item.name}`;
        
        // Fallback to label if image fails to load
        img.onerror = () => {
          img.remove();
          slot.textContent = `Spot ${i + 1}`;
        };

        slot.appendChild(img);
      } else {
        // Fallback if no image field exists in JSON
        slot.textContent = `Spot ${i + 1}`;
      }

      stage.appendChild(slot);
    }

    const { left, top } = gridPosition(
      i, layout.cols, layout.slotSize, layout.slotGap, layout.padding, layout.padding,
    );
    slot.style.left = `${left}px`;
    slot.style.top = `${top}px`;
  });
}

// Repositions each entry (in current array order) into a packed grid
// starting at the layout's itemsTop.
function layoutItems(entries, layout) {
  entries.forEach(({ el }, i) => {
    const { left, top } = gridPosition(
      i, layout.cols, layout.itemSize, layout.itemGap, layout.itemsTop, layout.padding,
    );
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

  let layout = getLayout(stage, artefacts.length);
  applyLayout(stage, layout);
  buildSlots(stage, artefacts, layout);

  let itemEntries;

  const arranger = createArranger({
    stage,
    onPlaced({ item }) {
      itemEntries = itemEntries.filter((entry) => entry.item.id !== item.id);
      layoutItems(itemEntries, layout);
      renderTally(arranger.getSummary());
      showFeedback(item);
    },
    onComplete(summary) {
      document.getElementById('arranging-tally').textContent =
        `All ${summary.total} artefacts placed!`;
    },
  });

  itemEntries = buildItems(stage, artefacts, arranger);
  layoutItems(itemEntries, layout);
  renderTally(arranger.getSummary());

  // Dynamic reflow on viewport change - recalculates both the column
  // count and the box sizes, so the grid keeps using the available
  // space rather than just staying small with extra margin. Crossing the
  // phone breakpoint (e.g. rotating a tablet) switches between the growing
  // and fixed-height layouts here too.
  currentResizeHandler = () => {
    layout = getLayout(stage, artefacts.length);
    applyLayout(stage, layout);

    buildSlots(stage, artefacts, layout);
    layoutItems(itemEntries, layout);
    // Already-placed artefacts aren't in itemEntries, so re-centre them on
    // their (just moved) slots. arranging.js does this on resize itself, but
    // its listener runs before this one, i.e. against the old slot positions.
    arranger.repositionPlaced();
  };

  window.addEventListener('resize', currentResizeHandler);
}