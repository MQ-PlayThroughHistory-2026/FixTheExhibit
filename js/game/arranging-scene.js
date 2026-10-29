/**
 * arranging-scene.js
 *
 * The arranging phase (D2) for js/game/level.js. Wires the level's
 * artefacts - fillers never reach arranging, they're stored during
 * sorting - to arranging.js.
 *
 * Renders each artefact's `image` if the field is present, falling back to
 * a plain labelled box if it's missing or the image fails to load.
 *
 * Reads settings.arrangementHintType (from the chosen difficulty, see
 * state.js) to decide what an empty slot shows: easy mode shows the
 * artefact's silhouette (or a "Spot N" label until silhouette art exists,
 * VA10), hard mode shows assets/ui/clue.avif on every slot, and tapping
 * an unfilled one opens the clue popup with the artefact's `clue`
 * field (task R9). Neither ever reveals the artefact's name.
 *
 * The first time each hint type comes up this session, it opens on the
 * how-to-play card (#arranging-tutorial, js/ui/tutorial.js).
 *
 * A correct placement opens the information card (#arranging-feedback)
 * with item.image (hidden if absent or broken) and item.blurb. It's a deck
 * of cards, one per page: the blurb, then each item.longExplanation
 * paragraph, then (only if assets/<level-id>/qr-code/<artefact-id>.png
 * exists) a final card with that QR code. The neighbouring pages peek out
 * either side of the top card, and the arrows in its bottom corners, or
 * tapping a side card, shuffle that page to the top.
 *
 * Once every artefact is placed and the last card is closed, the stage
 * transition (js/ui/stage-transition.js) offers moving on to the quiz.
 *
 * The stage never grows to fit its content, at any screen size - its
 * height comes from sizeStageToViewport(). getLayout() below always
 * shrinks the artefact/slot boxes (and, past a certain count, adds more
 * rows within that fixed height) to fit whatever the stage's current
 * width and height are; a level with 20+ artefacts fits by getting
 * smaller, not by growing the page into a long scroll.
 *
 * The slots stand on the shelves of a display cabinet, pieced together
 * from assets/arrange-scene/ with one shelf per row of slots, so the
 * cabinet grows a shelf as the row count goes up and scales with the
 * slots. The loose artefacts wait in a tray beside the cabinet or under
 * it, whichever lets everything be bigger on the current stage.
 */

import { createArranger } from './arranging.js';
import { setDragSuspended } from './drag.js';
import { sizeStageToViewport, watchViewport } from './stage-size.js';
import { registerPauseHandlers } from '../ui/pause-menu.js';
import { playSfx, skipClickSfx } from '../ui/audio.js';
import { showStageTransition } from '../ui/stage-transition.js';
import { setProgress } from '../ui/progress-bar.js';
import { showTutorialOnce } from '../ui/tutorial.js';

// Item size never grows past this, so boxes stay a comfortable size on a
// wide kiosk display. There's no minimum - shrinking is what keeps a large
// artefact count fitting the stage. Slots are 4px larger than items (the
// slot's two 2px borders, see .silhouette-slot in arranging.css) so a
// placed item fills the inside of its slot.
const ITEM_SIZE_MAX_PX = 160;
const SLOT_ITEM_SIZE_DIFF_PX = 4;

// Below this stage width, layout switches to the tighter COMPACT spacing
// so small boxes don't lose most of their space to gaps and padding.
const COMPACT_WIDTH_PX = 600;
const ROOMY_SPACING = { padding: 24, gap: 24, sectionGap: 32 };
const COMPACT_SPACING = { padding: 12, gap: 8, sectionGap: 16 };

// Space above/below a popup - see capPopupToStage().
const POPUP_STAGE_MARGIN_PX = 16;

// Shown on the information card deck's optional last page, above the QR code.
const QR_MESSAGE = 'Want to find out more about this artefact? Scan the QR code below.';

let wired = false;
// Stops the current run's viewport listener (stage-size.js).
let unwatchViewport = null;
// The slot the clue popup is currently open for.
let openClueSlot = null;
// The ctx from level.js for the current run, kept so restarting reuses it.
let ctx = null;
// Set once every artefact is placed. The transition opens when the last card closes.
let completedSummary = null;
// Drops onto the wrong slot this run, for the score (score.js).
let misplacedCount = 0;
// Which artefacts have a QR code image (artefact id -> image path). A browser
// can't list a folder, so each possible file is tried when the stage is built.
// `qrProbes` holds the checks still running, so a card opened before its
// check finishes can add the QR page as soon as it does.
let qrCodeUrls = new Map();
let qrProbes = new Map();
// The artefact whose deck is open, null when it's closed.
let openFeedbackItem = null;

// Returns a shuffled copy of the list.
function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The display cabinet (assets/arrange-scene/), measured in pixels of its
// art, which was drawn as a 657px wide, two-shelf cabinet. The pieces are
// drawn at `artScale` (see getStageLayout), so these become screen pixels
// once multiplied by it. The cabinet gets one compartment per slot row:
// the top rail, then each row's slots standing on a shelf (Mid.avif, or
// Bottom.avif under the last row), with the sides stretched to the total
// height. Piece insets are mirrored in arranging-scene.css.
const CABINET_ART = {
  topHeight: 40, // Top.avif
  midHeight: 111, // Mid.avif
  bottomHeight: 135, // Bottom.avif
  // Room between the sides' inner faces and the outermost slots.
  innerInset: 80,
  slotGap: 24,
  // Room between a compartment's ceiling and the top of its slots.
  headroom: 24,
  // How far down a shelf's top face an artefact's base stands - shelves are
  // drawn in perspective, so their top face shows above the front edge.
  midStand: 72,
  bottomStand: 90,
  // The row's back panel (Background.avif's top half) starts this far
  // above the compartment and runs this far under the shelf.
  backAbove: 10,
  backBelow: 54,
  // One slot is drawn this many art pixels across. Ties the frame's
  // thickness to the slot size, so a cabinet of small slots has a thin
  // frame rather than one that's all wood.
  slotSize: 200,
};

// Where the pieces join, measured on the art. buildCabinet() uses these to
// fit the pieces together at any size; see the CSS for the piece order.
const CABINET_JOINTS = {
  // The sides' tops tuck under the top rail, their outer corners on its
  // outer corners (Top.avif's left corner is at x 3, y 17; Left.avif's at
  // x 2, y 33).
  leftSide: { left: 1, top: -16 },
  // Right.avif's outer corner is 4px in from its right edge, at y 34.
  rightSide: { right: -2, top: -17 },
  // The sides' bottom tips are this far above their images' bottom edges.
  sideTipAbove: 3,
  // The sides lean in towards the bottom (the art's perspective): their
  // outer edges are this far in from their images' edges at the top...
  sideOuterTop: 3,
  // ...and move this much further in over the stretched middle, between
  // the unstretched end slices (sideSliceTop/Bottom, also in the CSS).
  sideLean: 18,
  sideSliceTop: 60,
  sideSliceBottom: 50,
  // Width of the sides' front faces, which the shelves butt up against.
  sideFront: 22,
  // Mid.avif's front face corners are 1px in from its ends, on row 100.
  midCornerIn: 1,
  midCornerRow: 100,
  // Bottom.avif sits behind the sides with its front corners (row 127) on
  // the sides' bottom tips.
  bottomCornerRow: 127,
  bottomLeft: 21,
  bottomRight: 20,
};

function rowsNeeded(count, cols) {
  return Math.ceil(count / cols);
}

// The cabinet's width and height per pixel of slot size, for a cabinet of
// `cols` x `rows` slots. Everything in it scales with the slot size, so
// width = slotSize * w and height = slotSize * h.
function cabinetFactors(cols, rows) {
  const a = CABINET_ART;
  const midRow = a.headroom - a.midStand + a.midHeight;
  const bottomRow = a.headroom - a.bottomStand + a.bottomHeight;
  return {
    w: cols + (a.innerInset * 2 + a.slotGap * (cols - 1)) / a.slotSize,
    h: rows + (a.topHeight + midRow * (rows - 1) + bottomRow) / a.slotSize,
  };
}

// Biggest item size for one candidate layout, or -Infinity if none fits.
// `mode` is 'stacked' (the tray of loose artefacts under the cabinet) or
// 'side' (the tray beside it). The cabinet is cols x rows slots, the tray
// trayCols x trayRows items. Every constraint is linear in the item size
// (slots are SLOT_ITEM_SIZE_DIFF_PX bigger), so each one is solved for it
// directly and the smallest wins.
function maxItemSizeFor(mode, cab, trayCols, trayRows, avail, spacing) {
  const d = SLOT_ITEM_SIZE_DIFF_PX;
  const { gap, sectionGap } = spacing;
  const trayGapsX = gap * (trayCols - 1);
  const trayGapsY = gap * (trayRows - 1);
  const limits =
    mode === 'stacked'
      ? [
          avail.width / cab.w - d,
          (avail.width - trayGapsX) / trayCols,
          (avail.height - d * cab.h - sectionGap - trayGapsY) / (cab.h + trayRows),
        ]
      : [
          (avail.width - d * cab.w - sectionGap - trayGapsX) / (cab.w + trayCols),
          avail.height / cab.h - d,
          (avail.height - trayGapsY) / trayRows,
        ];
  return Math.min(ITEM_SIZE_MAX_PX, ...limits);
}

// Tries every cabinet column count, tray column count and both
// arrangements, keeping whichever allows the biggest boxes. Ties (usually
// at ITEM_SIZE_MAX_PX, on a big stage) go to the squarest cabinet - the
// shape of the art - then to the tray beside the cabinet on a landscape
// stage, under it on a portrait one.
function pickArrangement(count, avail, spacing) {
  const preferredMode = avail.width >= avail.height ? 'side' : 'stacked';
  let best = null;
  for (const mode of ['stacked', 'side']) {
    for (let cols = 1; cols <= count; cols += 1) {
      const cab = cabinetFactors(cols, rowsNeeded(count, cols));
      const squareness = Math.abs(Math.log(cab.w / cab.h));
      for (let trayCols = 1; trayCols <= count; trayCols += 1) {
        const itemSize = maxItemSizeFor(mode, cab, trayCols, rowsNeeded(count, trayCols), avail, spacing);
        const candidate = { mode, cols, itemSize, squareness };
        if (!best || isBetterArrangement(candidate, best, preferredMode)) best = candidate;
      }
    }
  }
  return best;
}

function isBetterArrangement(a, b, preferredMode) {
  // Half a pixel either way is a tie, not worth a lopsided cabinet.
  if (Math.abs(a.itemSize - b.itemSize) > 0.5) return a.itemSize > b.itemSize;
  if (Math.abs(a.squareness - b.squareness) > 0.01) return a.squareness < b.squareness;
  return a.mode === preferredMode && b.mode !== preferredMode;
}

// Tray column count for a chosen item size: as few tray rows as fit
// (stacked) or as few columns (side), then evened out so the last row
// isn't left nearly empty.
function trayColsFor(mode, count, itemSize, avail, spacing) {
  const { gap } = spacing;
  const fitting = (span) => Math.max(1, Math.floor((span + gap) / (itemSize + gap)));
  if (mode === 'stacked') {
    const cols = Math.min(count, fitting(avail.width));
    return Math.ceil(count / rowsNeeded(count, cols));
  }
  const rows = Math.min(count, fitting(avail.height));
  return Math.ceil(count / rows);
}

// Works out the cabinet (one compartment per row of slots), the tray of
// loose artefacts and where both go on the stage. Whatever room is left
// over is shared evenly between the two edges and the gap between them.
function getStageLayout(stageWidth, stageHeight, artefactCount, spacing) {
  const { padding, gap, sectionGap } = spacing;
  const avail = { width: stageWidth - padding * 2, height: stageHeight - padding * 2 };
  const { mode, cols, itemSize: rawItemSize } = pickArrangement(artefactCount, avail, spacing);

  const itemSize = Math.max(1, rawItemSize);
  const slotSize = itemSize + SLOT_ITEM_SIZE_DIFF_PX;
  const artScale = slotSize / CABINET_ART.slotSize;
  const rows = rowsNeeded(artefactCount, cols);
  const factors = cabinetFactors(cols, rows);
  const cabinet = { cols, width: slotSize * factors.w, height: slotSize * factors.h };

  const trayCols = trayColsFor(mode, artefactCount, itemSize, avail, spacing);
  const trayRows = rowsNeeded(artefactCount, trayCols);
  const tray = {
    cols: trayCols,
    width: trayCols * itemSize + gap * (trayCols - 1),
    height: trayRows * itemSize + gap * (trayRows - 1),
  };

  if (mode === 'stacked') {
    const spare = Math.max(0, avail.height - cabinet.height - sectionGap - tray.height) / 3;
    cabinet.left = (stageWidth - cabinet.width) / 2;
    cabinet.top = padding + spare;
    tray.left = (stageWidth - tray.width) / 2;
    tray.top = cabinet.top + cabinet.height + sectionGap + spare;
  } else {
    const spare = Math.max(0, avail.width - cabinet.width - sectionGap - tray.width) / 3;
    // Both stand on the same stretch of floor in the background art, so
    // their bottoms line up, with the taller of the two centred.
    const floorY = (stageHeight + Math.max(cabinet.height, tray.height)) / 2;
    cabinet.left = padding + spare;
    cabinet.top = floorY - cabinet.height;
    tray.left = cabinet.left + cabinet.width + sectionGap + spare;
    tray.top = floorY - tray.height;
  }

  cabinet.rows = cabinetRows(rows, slotSize, artScale);
  return { stageWidth, stageHeight, itemSize, slotSize, artScale, gap, cabinet, tray };
}

// The background is the sorting scene's storeroom art (1920x1080), zoomed
// in. It's placed so the cabinet stands on the floor under the left-hand
// ceiling light, and zoomed (past BACKDROP_ZOOM_MIN x "cover" if need be)
// so the loose artefacts land under the right-hand one. Kept covering the
// stage, which can pull the lights off-centre on an unusually shaped stage.
const BACKDROP_ART = { width: 1920, height: 1080, leftLightX: 610, rightLightX: 1367, floorY: 850 };
const BACKDROP_ZOOM_MIN = 1.2;

function getBackdrop(layout) {
  const a = BACKDROP_ART;
  const { stageWidth, stageHeight, cabinet, tray } = layout;
  const cabinetCentre = cabinet.left + cabinet.width / 2;
  const trayCentre = tray.left + tray.width / 2;
  const cover = Math.max(stageWidth / a.width, stageHeight / a.height);
  const scale = Math.max(cover * BACKDROP_ZOOM_MIN, (trayCentre - cabinetCentre) / (a.rightLightX - a.leftLightX));
  const floor = Math.max(cabinet.top + cabinet.height, tray.top + tray.height);
  const clamp = (value, min) => Math.min(0, Math.max(min, value));
  return {
    width: a.width * scale,
    height: a.height * scale,
    left: clamp(cabinetCentre - a.leftLightX * scale, stageWidth - a.width * scale),
    top: clamp(floor - a.floorY * scale, stageHeight - a.height * scale),
  };
}

// Each row's compartment, top to bottom, in px from the cabinet's top:
// where its slots start, where its shelf starts, and its back panel.
function cabinetRows(rowCount, slotSize, artScale) {
  const a = CABINET_ART;
  const rows = [];
  let ceiling = a.topHeight * artScale;
  for (let r = 0; r < rowCount; r += 1) {
    const last = r === rowCount - 1;
    const slotTop = ceiling + a.headroom * artScale;
    const shelfTop = slotTop + slotSize - (last ? a.bottomStand : a.midStand) * artScale;
    rows.push({
      last,
      slotTop,
      shelfTop,
      backTop: ceiling - a.backAbove * artScale,
      backHeight: shelfTop - ceiling + (a.backAbove + a.backBelow) * artScale,
    });
    ceiling = shelfTop + (last ? a.bottomHeight : a.midHeight) * artScale;
  }
  return rows;
}

// Picks the spacing preset for the current stage width.
function getLayout(stage, artefactCount) {
  sizeStageToViewport(stage);
  const spacing = stage.clientWidth < COMPACT_WIDTH_PX ? COMPACT_SPACING : ROOMY_SPACING;
  return getStageLayout(stage.clientWidth, stage.clientHeight, artefactCount, spacing);
}

// Position for box `index` (sizePx square) in a left-to-right,
// top-to-bottom grid of `cols` columns, with the last row centred if it
// isn't full.
function gridPosition(index, count, cols, sizePx, gapPx) {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const inRow = Math.min(cols, count - row * cols);
  return {
    left: ((cols - inRow) * (sizePx + gapPx)) / 2 + col * (sizePx + gapPx),
    top: row * (sizePx + gapPx),
  };
}

// Where slot `index` goes on the stage: in its row's compartment, its base
// standing on that row's shelf.
function slotPosition(index, count, layout) {
  const { cabinet, slotSize, artScale } = layout;
  const { left } = gridPosition(index, count, cabinet.cols, slotSize, CABINET_ART.slotGap * artScale);
  const row = cabinet.rows[Math.floor(index / cabinet.cols)];
  return {
    left: cabinet.left + CABINET_ART.innerInset * artScale + left,
    top: cabinet.top + row.slotTop,
  };
}

// Publishes the current box sizes as CSS custom properties for
// .silhouette-slot / .arranging-item in arranging.css, and the cabinet's
// art scale for the pieces in arranging-scene.css. Also places the
// background art (getBackdrop).
function applyLayout(stage, layout) {
  stage.style.setProperty('--arranging-item-size', `${layout.itemSize}px`);
  stage.style.setProperty('--arranging-slot-size', `${layout.slotSize}px`);
  stage.style.setProperty('--cabinet-scale', layout.artScale);
  const backdrop = getBackdrop(layout);
  stage.style.backgroundSize = `${backdrop.width}px ${backdrop.height}px`;
  stage.style.backgroundPosition = `${backdrop.left}px ${backdrop.top}px`;
}

// (Re)draws the cabinet for the current layout, behind the slots and
// artefacts. Rebuilt on every layout, since the row count can change.
// Pieces are stacked back to front: its shadow on the floor, back panels,
// the bottom shelf, the sides, the middle shelves (whose ends lie over the
// sides' inner faces), then the top rail over the sides' tops.
function buildCabinet(stage, layout) {
  stage.querySelector('.arranging-cabinet')?.remove();
  const { cabinet, artScale: k } = layout;
  const j = CABINET_JOINTS;
  const el = document.createElement('div');
  el.className = 'arranging-cabinet';
  el.setAttribute('aria-hidden', 'true'); // scenery only
  el.style.left = `${cabinet.left}px`;
  el.style.top = `${cabinet.top}px`;
  el.style.width = `${cabinet.width}px`;
  el.style.height = `${cabinet.height}px`;

  const addPiece = (className, box) => {
    const piece = document.createElement('div');
    piece.className = className;
    Object.entries(box).forEach(([prop, px]) => {
      piece.style[prop] = `${px}px`;
    });
    el.appendChild(piece);
  };

  // The sides run from under the top rail down to tips level with the
  // bottom shelf's front corners.
  const lastRow = cabinet.rows[cabinet.rows.length - 1];
  const tipY = lastRow.shelfTop + j.bottomCornerRow * k;
  const sideHeight = (side) => tipY - side.top * k + j.sideTipAbove * k;
  const leftHeight = sideHeight(j.leftSide);
  const rightHeight = sideHeight(j.rightSide);
  // How far a side's outer edge has leaned in at height y (cabinet px),
  // from the stretched middle's top (lean 0) to its bottom (full lean).
  const leanAt = (y, side, height) => {
    const middleTop = side.top * k + j.sideSliceTop * k;
    const middleHeight = height - (j.sideSliceTop + j.sideSliceBottom) * k;
    const t = Math.min(1, Math.max(0, (y - middleTop) / middleHeight));
    return (j.sideOuterTop + j.sideLean * t) * k;
  };

  addPiece('cabinet-shadow', {});
  cabinet.rows.forEach((row) => addPiece('cabinet-back', { top: row.backTop, height: row.backHeight }));
  addPiece('cabinet-bottom', {
    top: lastRow.shelfTop,
    left: j.bottomLeft * k,
    right: j.bottomRight * k,
  });
  addPiece('cabinet-side cabinet-left', {
    top: j.leftSide.top * k,
    left: j.leftSide.left * k,
    height: leftHeight,
  });
  addPiece('cabinet-side cabinet-right', {
    top: j.rightSide.top * k,
    right: j.rightSide.right * k,
    height: rightHeight,
  });
  // Each middle shelf's front corners butt up against the inside of the
  // sides' front faces, wherever the sides' lean has them at that height.
  cabinet.rows.filter((row) => !row.last).forEach((row) => {
    const cornerY = row.shelfTop + j.midCornerRow * k;
    const inset = (side, height, edge) =>
      edge * k + leanAt(cornerY, side, height) + j.sideFront * k - j.midCornerIn * k;
    addPiece('cabinet-mid', {
      top: row.shelfTop,
      left: inset(j.leftSide, leftHeight, j.leftSide.left),
      right: inset(j.rightSide, rightHeight, j.rightSide.right),
    });
  });
  addPiece('cabinet-top', {});

  stage.prepend(el);
}

function isPopupOpen() {
  return ['arranging-clue', 'arranging-feedback', 'arranging-tutorial']
    .some((id) => !document.getElementById(id).classList.contains('hidden'));
}

// Wires the click/keyboard activation for a hard-mode clue slot. Only
// called when the slot is first created, so listeners aren't added twice.
function wireClueSlot(slot, item, onClueRequested) {
  slot.classList.add('is-clue-slot');
  slot.setAttribute('role', 'button');
  slot.tabIndex = 0;
  // Doesn't name the artefact, or it would give the answer away.
  slot.setAttribute('aria-label', 'Read the clue for this spot');

  const activate = () => {
    // No clue once the slot is filled (is-filled is set by arranging.js),
    // and only one popup at a time - close the open clue/blurb first.
    if (isPopupOpen()) {
      skipClickSfx(); // nothing happens, so nothing should sound like it did
      return;
    }
    if (slot.classList.contains('is-filled')) {
      playSfx('clueUp');
      showFeedback(item);
      return;
    }
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
// an empty slot shows: 'clue' (hard mode) gets a clickable clue card
// wired through onClueRequested instead of easy mode's silhouette/label.
function buildSlots(stage, artefacts, layout, hintType, onClueRequested) {
  artefacts.forEach((item, i) => {
    let slot = stage.querySelector(`[data-slot="${item.id}"]`);
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'silhouette-slot';
      slot.dataset.slot = item.id;

      if (hintType === 'clue') {
        const img = document.createElement('img');
        img.src = 'assets/ui/clue.avif';
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

    const { left, top } = slotPosition(i, artefacts.length, layout);
    slot.style.left = `${left}px`;
    slot.style.top = `${top}px`;
  });
}

// Repositions each entry (in current array order) into a packed grid in
// the layout's tray.
function layoutItems(entries, layout) {
  const { tray, itemSize, gap } = layout;
  entries.forEach(({ el }, i) => {
    const { left, top } = gridPosition(i, entries.length, tray.cols, itemSize, gap);
    el.style.left = `${tray.left + left}px`;
    el.style.top = `${tray.top + top}px`;
  });
}

// Shows the artefact's name on a box with no image (or a broken one). In
// its own element so a long name is clipped to the box while the floor
// shadow (arranging-scene.css) still hangs out below it.
function showName(el, name) {
  const label = document.createElement('span');
  label.className = 'arranging-item-name';
  label.textContent = name;
  el.appendChild(label);
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
        showName(el, item.name);
      };
      el.appendChild(img);
    } else {
      showName(el, item.name);
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
  // The information card is a deck of cards, each with its own padding
  // (the clue popup's content sits straight in the popup).
  popup.querySelectorAll(contentSelector).forEach((content) => {
    const cardStyle = getComputedStyle(content.parentElement);
    const innerAvailable = Math.max(
      0,
      available - parseFloat(cardStyle.paddingTop) - parseFloat(cardStyle.paddingBottom),
    );
    content.style.maxHeight = `${innerAvailable}px`;
  });
}

// The information card's deck: one card per page, the blurb, each
// longExplanation paragraph, then the QR code if the artefact has one. The current card sits on top with its
// neighbours peeking out either side; the rest wait out of sight.
let feedbackCards = [];
let feedbackPage = 0;

// Moves the deck so the given page is on top. The cards' CSS transitions
// do the shuffle. Only the top card's buttons can be reached; a side card
// is one big button that brings it to the top.
function showFeedbackPage(index) {
  feedbackPage = index;
  feedbackCards.forEach((card, i) => {
    const offset = i - index;
    const position = { '-1': 'is-left', 0: 'is-active', 1: 'is-right' }[offset] ?? 'is-away';
    card.classList.remove('is-left', 'is-active', 'is-right', 'is-away');
    card.classList.add(position);
    const isSide = Math.abs(offset) === 1;
    card.querySelector('.info-card-content').inert = offset !== 0;
    if (isSide) {
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', offset < 0 ? 'Previous page' : 'Next page');
      card.tabIndex = 0;
    } else {
      card.removeAttribute('role');
      card.removeAttribute('aria-label');
      card.removeAttribute('tabindex');
    }
  });
}

// Shuffles to another page with its own sound instead of the button click.
function turnFeedbackPage(index) {
  if (index < 0 || index >= feedbackCards.length || index === feedbackPage) return;
  playSfx('next');
  showFeedbackPage(index);
}

// Where an artefact's QR code image would be: assets/<level-id>/qr-code/<artefact-id>.png
function qrCodePath(levelId, item) {
  return `assets/${levelId}/qr-code/${item.id}.png`;
}

// Checks (once per stage build) which artefacts have a QR code image. Missing
// ones just mean no QR page. Any that are found are remembered in qrCodeUrls.
function probeQrCodes(level) {
  qrCodeUrls = new Map();
  qrProbes = new Map();
  level.artefacts.forEach((item) => {
    const url = qrCodePath(level.id, item);
    const probe = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        qrCodeUrls.set(item.id, url);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    }).then(() => {
      qrProbes.delete(item.id);
      // This artefact's card was opened before the check finished: add the page now.
      if (openFeedbackItem === item && qrCodeUrls.has(item.id)) {
        showFeedback(item, feedbackPage);
      }
    });
    qrProbes.set(item.id, probe);
  });
}

// Builds one card of the deck from the template in index.html. Pass qrUrl to
// make it the QR code page: the QR image replaces the artefact picture and sits
// below the message.
function buildFeedbackCard(item, text, index, count, qrUrl = null) {
  const card = document.getElementById('arranging-feedback-card').content.firstElementChild.cloneNode(true);
  card.dataset.page = String(index);
  const image = card.querySelector('.arranging-feedback-image');
  const paragraph = card.querySelector('p');
  if (qrUrl) {
    card.classList.add('is-qr');
    image.src = qrUrl;
    image.alt = `QR code with more information about ${item.name}`;
    paragraph.after(image); // "...scan the QR code below" - so the code goes under the text
  } else if (item.image) {
    // Hidden when there's no image field or it fails to load.
    image.src = item.image;
    image.alt = item.name;
    image.onerror = () => image.classList.add('hidden');
  } else {
    image.classList.add('hidden');
  }
  card.querySelector('.info-card-title').textContent = item.name;
  paragraph.textContent = text;
  if (index === 0) card.querySelector('.info-card-arrow.is-prev').remove();
  if (index === count - 1) card.querySelector('.info-card-arrow.is-next').remove();
  return card;
}

// Opens the deck for an artefact, on the given page (rebuilding an open deck keeps its page).
function showFeedback(item, startPage = 0) {
  hideCluePopup(); // only one big popup on the stage at a time
  setDragSuspended(true); // stop dragging anything else underneath the popup
  openFeedbackItem = item;
  const deck = document.getElementById('arranging-feedback');
  const pages = [
    { text: item.blurb ?? '[No blurb written yet for this artefact]' },
    ...(item.longExplanation ?? []).map((text) => ({ text })),
  ];
  // The QR page goes at the very end, and only if the image exists.
  if (qrCodeUrls.has(item.id)) pages.push({ text: QR_MESSAGE, qrUrl: qrCodeUrls.get(item.id) });
  feedbackCards = pages.map((page, i) => buildFeedbackCard(item, page.text, i, pages.length, page.qrUrl));
  deck.replaceChildren(...feedbackCards);
  // Placed before the deck shows, so the cards start in place instead of shuffling in.
  deck.classList.add('no-transition');
  showFeedbackPage(Math.min(startPage, pages.length - 1));
  deck.classList.remove('hidden');
  capPopupToStage('arranging-feedback', '.arranging-feedback-content');
  deck.getBoundingClientRect(); // commits the starting positions before transitions come back
  deck.classList.remove('no-transition');
}

// One listener for the whole deck, since its cards are rebuilt for every artefact.
function wireFeedbackDeck() {
  const deck = document.getElementById('arranging-feedback');
  deck.addEventListener('click', (event) => {
    if (event.target.closest('.info-card-close')) {
      hideFeedback();
      showCompleteIfDone();
      return;
    }
    if (event.target.closest('.info-card-arrow.is-prev')) {
      turnFeedbackPage(feedbackPage - 1);
      return;
    }
    if (event.target.closest('.info-card-arrow.is-next')) {
      turnFeedbackPage(feedbackPage + 1);
      return;
    }
    const card = event.target.closest('.arranging-feedback-card');
    if (card && !card.classList.contains('is-active')) turnFeedbackPage(Number(card.dataset.page));
  });
  deck.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.arranging-feedback-card[role="button"]');
    if (!card) return;
    event.preventDefault();
    turnFeedbackPage(Number(card.dataset.page));
  });
}

function hideFeedback() {
  openFeedbackItem = null;
  document.getElementById('arranging-feedback').classList.add('hidden');
  setDragSuspended(false);
}

// Hard mode only. Picks up a slot's clue card: shows item.clue (task R9, Project Plan 6.2.1).
function showCluePopup(item, slot) {
  playSfx('clueUp');
  hideFeedback();
  if (openClueSlot && openClueSlot !== slot) {
    openClueSlot.classList.remove('is-clue-open');
  }
  openClueSlot = slot;
  slot.classList.add('is-clue-open'); // hides this slot's own card while the popup's up
  setDragSuspended(true); // stop dragging anything else underneath the popup
  capPopupToStage('arranging-clue', '.arranging-clue-content');
  document.getElementById('arranging-clue-text').textContent =
    item.clue ?? '[No clue written yet for this artefact]';
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

// The clue popup's Close: puts the clue card back down.
function closeCluePopup() {
  playSfx('clueDown');
  hideCluePopup();
}

// Fills the progress bar by how many artefacts have been placed.
function renderProgress(summary) {
  setProgress(document.getElementById('arranging-progress'), summary.placed, summary.total);
}

// Runs after the information card's Close. Once everything is placed it offers moving on to the quiz.
function showCompleteIfDone() {
  if (!completedSummary) return;
  const { total } = completedSummary;
  ctx.results.arranging = { correct: total, total: total + misplacedCount };
  playSfx('wellDone');
  showStageTransition({
    title: 'Well Done!',
    message: `All ${completedSummary.total} artefacts are on display. Next, take a short quiz to see what you've learnt.`,
    onNext: ctx.onNext,
    onRestart: () => initArrangingScene(ctx),
  });
}

/**
 * Builds a fresh arranging stage. Safe to call again, it starts over.
 *
 * @param {object} runCtx  { level, settings, results, onNext } from js/game/level.js
 */
export function initArrangingScene(runCtx) {
  ctx = runCtx;
  const { level, settings } = ctx;
  const stage = document.getElementById('arranging-stage');

  // Stop the previous run's resize handling on re-init.
  unwatchViewport?.();

  // Only remove the previous run's slots/items
  stage.querySelectorAll('.silhouette-slot, .arranging-item').forEach((el) => el.remove());
  completedSummary = null;
  misplacedCount = 0;
  hideFeedback();
  hideCluePopup();

  if (!wired) {
    wireFeedbackDeck();
    document.getElementById('btn-arranging-clue-close').addEventListener('click', closeCluePopup);
    registerPauseHandlers('screen-arranging', {
      onPause: () => setDragSuspended(true),
      // An open clue/blurb popup suspends drag itself, so keep it suspended.
      onResume: () => setDragSuspended(isPopupOpen()),
      onRestart: () => initArrangingScene(ctx),
    });
    wired = true;
  }

  const hintType = settings.arrangementHintType;
  document.getElementById('arranging-heading').textContent = level.name;
  document.getElementById('arranging-tutorial-text').textContent =
    hintType === 'clue'
      ? 'Tap a clue card in the display case, work out which artefact belongs there, then drag that artefact into place.'
      : 'Drag each artefact onto its matching silhouette in the display case.';

  const { artefacts } = level;
  probeQrCodes(level);
  let layout = getLayout(stage, artefacts.length);
  applyLayout(stage, layout);
  buildCabinet(stage, layout);
  buildSlots(stage, artefacts, layout, hintType, showCluePopup);

  let itemEntries;

  const arranger = createArranger({
    stage,
    // Hard mode: don't let the drag-over glow single out the correct slot -
    // that would give the answer away for free and skip the clue entirely.
    revealCorrectSlot: hintType !== 'clue',
    onPlaced({ item }) {
      playSfx('correct');
      itemEntries = itemEntries.filter((entry) => entry.item.id !== item.id);
      layoutItems(itemEntries, layout);
      renderProgress(arranger.getSummary());
      showFeedback(item);
    },
    onMisplaced() {
      misplacedCount += 1;
      playSfx('incorrect');
    },
    // onPlaced has just opened the last artefact's card, the transition waits for it to close.
    onComplete(summary) {
      completedSummary = summary;
    },
    showInfo(slot, item) {
      if (hintType !== 'clue') {
        slot.setAttribute('role', 'button');
        slot.addEventListener('click', (event) => {
          // only one popup at a time - close the open clue/blurb first.
          if (isPopupOpen()) {
            skipClickSfx(); // nothing happens, so nothing should sound like it did
            return;
          }
          playSfx('clueUp');
          showFeedback(item);
          return;
        });
      }
    }
  });

  itemEntries = buildItems(stage, artefacts, arranger);
  layoutItems(itemEntries, layout);
  renderProgress(arranger.getSummary());
  // Separate ids per hint type, so hard mode's clues get explained even
  // after easy mode's tutorial has been seen.
  showTutorialOnce(`arranging-${hintType}`, document.getElementById('arranging-tutorial'), () => {});

  // Recalculates the column count and box sizes on viewport change.
  unwatchViewport = watchViewport(() => {
    if (stage.offsetParent === null) return; // screen hidden, nothing to measure
    layout = getLayout(stage, artefacts.length);
    applyLayout(stage, layout);
    buildCabinet(stage, layout);

    buildSlots(stage, artefacts, layout, hintType, showCluePopup);
    layoutItems(itemEntries, layout);
    // Already-placed artefacts aren't in itemEntries, so re-centre them on
    // their (just moved) slots. arranging.js does this on resize itself, but
    // its listener runs before this one, i.e. against the old slot positions.
    arranger.repositionPlaced();
    // Keeps an open popup's height cap correct.
    capPopupToStage('arranging-feedback', '.arranging-feedback-content');
    capPopupToStage('arranging-clue', '.arranging-clue-content');
  });
}