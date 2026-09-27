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
 * Reads state.js's arrangementHintType (set by which dev button was used,
 * same as a real difficulty choice would) to decide what an empty slot
 * shows: easy mode keeps the silhouette/label above, hard mode instead
 * shows assets/ui/info-card.avif on every slot, and tapping an unfilled
 * one opens a popup with the artefact's `riddle` field from
 * artefacts.json (task R9). The popup never shows the artefact's name.
 *
 * The feedback panel on correct placement is a stand-in for the D4
 * information card, same as sorting-feedback stands in for D3. It shows
 * item.blurb (and item.image, hidden if absent/broken - true for every
 * current artefact), so this only looks fully populated once Research and
 * Visual Arts have written those fields in.
 *
 * The stage never grows to fit its content, at any screen size - its
 * height comes from arranging-demo.css alone. getLayout() below always
 * shrinks the artefact/slot boxes (and, past a certain count, adds more
 * rows within that fixed height) to fit whatever the stage's current
 * width and height are; a level with 20+ artefacts fits by getting
 * smaller, not by growing the page into a long scroll.
 *
 * Goes together with: the temporary menu button in index.html, the
 * screen-arranging-prototype section, and this file's import in menu.js.
 * Delete all of it together when the real arranging scene (D2) is built.
 */

import { createArranger } from '../arranging.js';
import { getLevel, getDifficultyConfig } from '../state.js';
import { setDragSuspended } from '../drag.js';
import { registerPauseHandlers } from '../../ui/pause-menu.js';
import { playSfx } from '../../ui/audio.js';

// Item size never grows past this, so boxes stay a comfortable size on a
// wide kiosk display. There's no minimum - shrinking is what keeps a large
// artefact count fitting the stage. Slots are 4px larger than items (the
// slot's two 2px borders, see .silhouette-slot in arranging.css) so a
// placed item fills the inside of its slot.
const ITEM_SIZE_MAX_PX = 160;
const SLOT_ITEM_SIZE_DIFF_PX = 4;

// Below this stage width, layout switches to the tighter COMPACT spacing
// so small boxes don't lose most of their space to gaps and padding.
// Keep in sync with arranging-demo.css's
// max-width:600px breakpoint for the feedback card's image placement.
const COMPACT_WIDTH_PX = 600;
const ROOMY_SPACING = { padding: 24, gap: 24, sectionGap: 32 };
const COMPACT_SPACING = { padding: 12, gap: 8, sectionGap: 16 };

// Bounds for sizeStageToViewport(). arranging-demo.css's height:clamp(...)
// mirrors these as the fallback before JS runs.
const STAGE_HEIGHT_MIN_PX = 320;
const STAGE_HEIGHT_MAX_PX = 760;
const STAGE_BOTTOM_MARGIN_PX = 16;
// Space above/below a popup - see capPopupToStage().
const POPUP_STAGE_MARGIN_PX = 16;

let wired = false;
let currentResizeHandler = null;
let settleTimeoutId = null;
// The slot the clue popup is currently open for.
let openClueSlot = null;

// Returns a shuffled copy of the list.
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

// Finds the column count that allows the biggest boxes while the slot grid
// and the item grid (stacked, with the gap between them) still fit inside
// the stage. The best trade-off depends on the stage's shape and the
// artefact count, so every column count is tried. The height sum mirrors
// getLayout()'s neededHeight.
function getStageLayout(stageWidth, stageHeight, artefactCount, spacing) {
  const { padding, gap, sectionGap } = spacing;
  const availableWidth = stageWidth - (padding * 2);
  let best = null;

  for (let cols = 1; cols <= artefactCount; cols += 1) {
    const rows = rowsNeeded(artefactCount, cols);
    // Slots are the wider grid, so they decide how big the boxes can be across.
    const maxByWidth = (availableWidth - gap * (cols - 1)) / cols - SLOT_ITEM_SIZE_DIFF_PX;
    // Slot rows + item rows + section gap + padding top and bottom.
    const maxByHeight =
      (stageHeight - padding * 2 - sectionGap - rows * (SLOT_ITEM_SIZE_DIFF_PX + gap * 2)) / (rows * 2);
    const itemSize = Math.min(ITEM_SIZE_MAX_PX, maxByWidth, maxByHeight);
    // ">=" so ties at the size cap prefer more columns, spreading the grid
    // across the stage width.
    if (!best || itemSize >= best.itemSize) best = { cols, itemSize };
  }

  const itemSize = Math.max(1, best.itemSize);
  return {
    cols: best.cols,
    itemSize,
    slotSize: itemSize + SLOT_ITEM_SIZE_DIFF_PX,
    padding,
    slotGap: gap,
    itemGap: gap,
    sectionGap,
  };
}

// Sizes the stage to whatever's left of the viewport after the heading,
// intro text, tally and buttons around it, so the page itself doesn't
// scroll on a short viewport.
function sizeStageToViewport(stage) {
  const section = stage.closest('.screen');
  const stageTop = stage.getBoundingClientRect().top;
  const siblingsHeight = section.scrollHeight - stage.getBoundingClientRect().height;
  const available = window.innerHeight - stageTop - siblingsHeight - STAGE_BOTTOM_MARGIN_PX;
  stage.style.height = `${Math.max(STAGE_HEIGHT_MIN_PX, Math.min(STAGE_HEIGHT_MAX_PX, available))}px`;
}

// Picks the spacing preset for the current stage width and works out
// where the item grid starts (below the slot grid).
function getLayout(stage, artefactCount) {
  sizeStageToViewport(stage);
  const spacing = stage.clientWidth < COMPACT_WIDTH_PX ? COMPACT_SPACING : ROOMY_SPACING;
  const base = getStageLayout(stage.clientWidth, stage.clientHeight, artefactCount, spacing);
  const rows = rowsNeeded(artefactCount, base.cols);
  const itemsTop = base.padding + rows * (base.slotSize + base.slotGap) + base.sectionGap;
  const neededHeight = itemsTop + rows * (base.itemSize + base.itemGap) + base.padding;
  return { ...base, itemsTop, neededHeight };
}

// Publishes the current box sizes as CSS custom properties for
// .silhouette-slot / .arranging-item in arranging.css.
function applyLayout(stage, layout) {
  stage.style.setProperty('--arranging-item-size', `${layout.itemSize}px`);
  stage.style.setProperty('--arranging-slot-size', `${layout.slotSize}px`);
}

function isPopupOpen() {
  return !document.getElementById('arranging-clue').classList.contains('hidden')
    || !document.getElementById('arranging-feedback').classList.contains('hidden');
}

// Wires the click/keyboard activation for a hard-mode clue slot. Only
// called when the slot is first created, so listeners aren't added twice.
function wireClueSlot(slot, item, onClueRequested) {
  slot.classList.add('is-clue-slot');
  slot.setAttribute('role', 'button');
  slot.tabIndex = 0;
  // Doesn't name the artefact, or it would give the answer away.
  slot.setAttribute('aria-label', 'View clue for this spot');

  const activate = () => {
    // No clue once the slot is filled (is-filled is set by arranging.js).
    if (slot.classList.contains('is-filled')) return;
    // Only one popup at a time - close the open clue/blurb first.
    if (isPopupOpen()) return;
    onClueRequested(item, slot);
  };
  slot.addEventListener('click', activate);
  slot.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault(); // stop space from also scrolling the page
    activate();
  });
}

// One labelled slot per artefact, in data order (not shuffled) so the
// display case layout stays stable across restarts. hintType picks what
// an empty slot shows: 'riddle' (hard mode) gets a clickable info card
// wired through onClueRequested instead of easy mode's silhouette/label.
function buildSlots(stage, artefacts, layout, hintType, onClueRequested) {
  artefacts.forEach((item, i) => {
    let slot = stage.querySelector(`[data-slot="${item.id}"]`);
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'silhouette-slot';
      slot.dataset.slot = item.id;

      if (hintType === 'riddle') {
        const img = document.createElement('img');
        img.src = 'assets/ui/info-card.avif';
        img.alt = ''; // decorative - the slot's own aria-label carries the meaning
        img.className = 'clue-card-art';
        slot.appendChild(img);
        wireClueSlot(slot, item, onClueRequested);
      } else if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = `Silhouette for ${item.name}`;
        img.className = 'silhouette-img';

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

// Caps a popup and its scrollable text column to the stage height in
// pixels. Percentage max-heights didn't resolve consistently across
// browsers for .arranging-clue (aspect-ratio + max-height).
function capPopupToStage(popupId, contentSelector) {
  const stage = document.getElementById('arranging-stage');
  const popup = document.getElementById(popupId);
  const content = popup.querySelector(contentSelector);
  const available = Math.max(0, stage.clientHeight - POPUP_STAGE_MARGIN_PX * 2);
  popup.style.maxHeight = `${available}px`;
  const popupStyle = getComputedStyle(popup);
  const innerAvailable = Math.max(
    0,
    available - parseFloat(popupStyle.paddingTop) - parseFloat(popupStyle.paddingBottom),
  );
  content.style.maxHeight = `${innerAvailable}px`;
}

function showFeedback(item) {
  hideCluePopup(); // only one big popup on the stage at a time
  setDragSuspended(true); // stop dragging anything else underneath the popup
  capPopupToStage('arranging-feedback', '.arranging-feedback-content');
  const card = document.getElementById('arranging-feedback');
  const image = document.getElementById('arranging-feedback-image');
  // Hidden when there's no image field or it fails to load.
  if (item.image) {
    image.src = item.image;
    image.alt = item.name;
    image.classList.remove('hidden');
    image.onerror = () => image.classList.add('hidden');
  } else {
    image.classList.add('hidden');
  }
  document.getElementById('arranging-feedback-title').textContent = item.name;
  document.getElementById('arranging-feedback-text').textContent =
    item.blurb ?? '[No blurb written yet for this artefact]';
  card.classList.remove('hidden');
}

function hideFeedback() {
  document.getElementById('arranging-feedback').classList.add('hidden');
  setDragSuspended(false);
}

// Hard mode only. Shows item.riddle (task R9, Project Plan 6.2.1).
function showCluePopup(item, slot) {
  hideFeedback();
  if (openClueSlot && openClueSlot !== slot) {
    openClueSlot.classList.remove('is-clue-open');
  }
  openClueSlot = slot;
  slot.classList.add('is-clue-open'); // hides this slot's own card while the popup's up
  setDragSuspended(true); // stop dragging anything else underneath the popup
  capPopupToStage('arranging-clue', '.arranging-clue-content');
  document.getElementById('arranging-clue-text').textContent =
    item.riddle ?? '[No clue written yet for this artefact]';
  document.getElementById('arranging-clue').classList.remove('hidden');
}

function hideCluePopup() {
  document.getElementById('arranging-clue').classList.add('hidden');
  if (openClueSlot) {
    openClueSlot.classList.remove('is-clue-open');
    openClueSlot = null;
  }
  setDragSuspended(false);
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
    window.visualViewport?.removeEventListener('resize', currentResizeHandler);
  }
  clearTimeout(settleTimeoutId);

  // Only remove the previous run's slots/items
  stage.querySelectorAll('.silhouette-slot, .arranging-item').forEach((el) => el.remove());
  hideFeedback();
  hideCluePopup();

  if (!wired) {
    document.getElementById('btn-arranging-feedback-close').addEventListener('click', hideFeedback);
    document.getElementById('btn-arranging-clue-close').addEventListener('click', hideCluePopup);
    registerPauseHandlers('screen-arranging-prototype', {
      onPause: () => setDragSuspended(true),
      // An open clue/blurb popup suspends drag itself, so keep it suspended.
      onResume: () => setDragSuspended(isPopupOpen()),
      onRestart: initArrangingDemo,
    });
    wired = true;
  }

  const difficultyConfig = getDifficultyConfig();
  const hintType = difficultyConfig?.arrangementHintType ?? 'silhouette';
  document.getElementById('arranging-heading').textContent =
    `Arranging Prototype — Gold Rush (${difficultyConfig?.label ?? 'Easy'})`;
  document.getElementById('arranging-intro').textContent =
    hintType === 'riddle'
      ? "Tap a spot's card for a clue about which artefact belongs there, then drag the matching artefact into place."
      : 'Drag each artefact into its own spot in the display case.';

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
  buildSlots(stage, artefacts, layout, hintType, showCluePopup);

  let itemEntries;

  const arranger = createArranger({
    stage,
    // Hard mode: don't let the drag-over glow single out the correct slot -
    // that would give the answer away for free and skip the clue entirely.
    revealCorrectSlot: hintType !== 'riddle',
    onPlaced({ item }) {
      playSfx('correct');
      itemEntries = itemEntries.filter((entry) => entry.item.id !== item.id);
      layoutItems(itemEntries, layout);
      renderTally(arranger.getSummary());
      showFeedback(item);
    },
    onMisplaced: () => playSfx('incorrect'),
    onComplete(summary) {
      document.getElementById('arranging-tally').textContent =
        `All ${summary.total} artefacts placed!`;
    },
  });

  itemEntries = buildItems(stage, artefacts, arranger);
  layoutItems(itemEntries, layout);
  renderTally(arranger.getSummary());

  // Recalculates the column count and box sizes on viewport change.
  currentResizeHandler = () => {
    layout = getLayout(stage, artefacts.length);
    applyLayout(stage, layout);

    buildSlots(stage, artefacts, layout, hintType, showCluePopup);
    layoutItems(itemEntries, layout);
    // Already-placed artefacts aren't in itemEntries, so re-centre them on
    // their (just moved) slots. arranging.js does this on resize itself, but
    // its listener runs before this one, i.e. against the old slot positions.
    arranger.repositionPlaced();
    // Keeps an open popup's height cap correct.
    capPopupToStage('arranging-feedback', '.arranging-feedback-content');
    capPopupToStage('arranging-clue', '.arranging-clue-content');
  };

  // Mobile address bar show/hide doesn't reliably fire a window resize
  // event, so visualViewport is listened to as well.
  window.addEventListener('resize', currentResizeHandler);
  window.visualViewport?.addEventListener('resize', currentResizeHandler);

  // Re-measures once shortly after the first layout in case the viewport
  // was still settling.
  settleTimeoutId = setTimeout(() => currentResizeHandler?.(), 400);
}