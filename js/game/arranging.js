/**
 * arranging.js
 *
 * Stage 2 arranging (D2). Each artefact has exactly one correct
 * silhouette slot. A correct drop snaps the artefact into place and
 * locks it there for good; a wrong drop (or a drop outside any slot)
 * snaps back to where it was picked up and stays draggable.
 *
 * Slots are elements inside the stage carrying data-slot="<artefact id>".
 *
 * revealCorrectSlot (default true) controls the drag-over glow: true glows
 * only the artefact's own slot as a hint (easy mode); false glows whichever
 * slot is under the artefact regardless of correctness, so hovering can't
 * be used to find the right one (hard mode - see arranging-demo.js).
 */

import { makeDraggable } from './drag.js';

const SLOT_FEEDBACK_MS = 500; // one fade per wrong drop, nothing strobes (NFR05)

/**
 * @typedef {object} ArtefactItem   entry from artefacts.json
 * @property {string} id
 * @property {string} name
 * @property {string} [image]
 * @property {string} [blurb]
 *
 * @typedef {object} ArrangeSummary
 * @property {number} total
 * @property {number} placed
 * @property {number} remaining
 */

/**
 * Creates the arranger for one stage. Register every artefact with
 * addItem, then listen on onPlaced and onComplete.
 * @param {object} options
 * @param {HTMLElement} options.stage  holds the items and the [data-slot] elements
 * @param {(result: { item: ArtefactItem }) => void} [options.onPlaced]
 * @param {(summary: ArrangeSummary) => void} [options.onComplete]
 */
export function createArranger({ stage, onPlaced, onComplete, revealCorrectSlot = true }) {
  const slots = Array.from(stage.querySelectorAll('[data-slot]'));
  if (slots.length === 0) {
    throw new Error('createArranger needs at least one [data-slot] element inside the stage');
  }

  const tally = { total: 0, placed: 0 };
  const pickupPositions = new WeakMap();
  const itemRegistry = new Map(); // Tracks locked/registered elements and their slots

  function slotFor(item) {
    return slots.find((slot) => slot.dataset.slot === item.id) ?? null;
  }

  // Returns whichever slot's box contains the element's centre, or null.
  function slotUnder(el) {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    return (
      slots.find((slot) => {
        const s = slot.getBoundingClientRect();
        return x >= s.left && x <= s.right && y >= s.top && y <= s.bottom;
      }) ?? null
    );
  }

  // Toggles is-target (the drag-over "glow", styled in arranging.css) onto
  // exactly one slot - whichever is passed in - and off every other one.
  // What gets passed in is what makes this a hint or not; see onDragMove.
  function highlightHoveredSlot(target) {
    slots.forEach((slot) => slot.classList.toggle('is-target', slot === target));
  }

  function flashWrongSlot(slot) {
    slot.classList.add('flash-incorrect');
    setTimeout(() => slot.classList.remove('flash-incorrect'), SLOT_FEEDBACK_MS);
  }

  // Centers element over slot based on stage bounding box rather than offsetParent.
  // left/top are measured from the stage's padding box (inside its border), so the
  // border width (clientLeft/clientTop) has to come off the bounding-box offset or
  // every placed artefact lands a border-width down and to the right of centre.
  function moveToSlotCentre(el, slot) {
    const stageRect = stage.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const targetLeft = (slotRect.left - stageRect.left - stage.clientLeft) + (slotRect.width - elRect.width) / 2;
    const targetTop = (slotRect.top - stageRect.top - stage.clientTop) + (slotRect.height - elRect.height) / 2;

    el.style.left = `${targetLeft}px`;
    el.style.top = `${targetTop}px`;
  }

  function snapBack(el) {
    const start = pickupPositions.get(el);
    if (!start) return;
    el.style.left = `${start.left}px`;
    el.style.top = `${start.top}px`;
  }

  // Locks a correctly-placed artefact into its slot for good.
  function commitPlacement(el, item, slot) {
    tally.placed += 1;

    slot.classList.remove('is-target');
    slot.classList.add('is-filled');

    el.classList.add('is-placed');
    moveToSlotCentre(el, slot);
    el.dataset.locked = 'true'; // drag.js ignores pointerdown on locked elements

    itemRegistry.set(el, slot); // Store reference for resize repositioning

    onPlaced?.({ item });
    if (tally.placed === tally.total) {
      onComplete?.(getSummary());
    }
  }

  /**
   * Makes element (el) draggable and ties it to its one correct slot.
   * @param {HTMLElement} el   absolutely positioned element already inside the stage
   * @param {ArtefactItem} item
   */
  function addItem(el, item) {
    const slot = slotFor(item);
    if (!slot) {
      throw new Error(`addItem was given item "${item?.id ?? 'unknown'}" with no matching [data-slot]`);
    }
    tally.total += 1;
    el.dataset.itemId = item.id;

    makeDraggable(el, stage, {
      onDragStart(target) {
        pickupPositions.set(target, { left: target.offsetLeft, top: target.offsetTop });
      },
      onDragMove(target) {
        const under = slotUnder(target);
        // Easy mode glows only the item's own slot; hard mode glows
        // whichever slot is under the artefact, right or wrong.
        highlightHoveredSlot(revealCorrectSlot ? (under && under.dataset.slot === item.id ? under : null) : under);
      },
      onDrop(target, _event, { cancelled }) {
        highlightHoveredSlot(null);
        const under = cancelled ? null : slotUnder(target);
        const isOwnSlot = under && under.dataset.slot === item.id && !under.classList.contains('is-filled');

        if (isOwnSlot) {
          commitPlacement(target, item, under);
        } else {
          if (under) flashWrongSlot(under);
          snapBack(target);
        }
      },
    });
  }

  // Recalculates positions of all locked elements when container/screen changes size
  const handleResize = () => {
    itemRegistry.forEach((slot, el) => {
      moveToSlotCentre(el, slot);
    });
  };

  window.addEventListener('resize', handleResize);

  function getSummary() {
    return {
      total: tally.total,
      placed: tally.placed,
      remaining: tally.total - tally.placed,
    };
  }

  function destroy() {
    window.removeEventListener('resize', handleResize);
  }

  // Exposed so a caller that moves the slots on resize can re-centre the placed
  // artefacts afterwards (this file's own resize listener fires before theirs).
  return { addItem, getSummary, repositionPlaced: handleResize, destroy };
}