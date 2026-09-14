/**
 * arranging.js
 *
 * Stage 2 arranging (D2). Each artefact has exactly one correct
 * silhouette slot (unlike sorting's zones, which any correctly-categorised
 * package can land in). A correct drop snaps the artefact into place and
 * locks it there for good; a wrong drop (or a drop outside any slot)
 * snaps back to where it was picked up and stays draggable.
 *
 * Slots are elements inside the stage carrying data-slot="<artefact id>".
 */

import { makeDraggable } from './drag.js';

const SETTLE_MS = 350; // matches the transitions in arranging.css
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
export function createArranger({ stage, onPlaced, onComplete }) {
  const slots = Array.from(stage.querySelectorAll('[data-slot]'));
  if (slots.length === 0) {
    throw new Error('createArranger needs at least one [data-slot] element inside the stage');
  }

  const tally = { total: 0, placed: 0 };
  const pickupPositions = new WeakMap();

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

  // Only ever highlights an item's OWN slot - hovering someone else's
  // slot gets no encouragement.
  function highlightOwnSlot(target) {
    slots.forEach((slot) => slot.classList.toggle('is-target', slot === target));
  }

  function flashWrongSlot(slot) {
    slot.classList.add('flash-incorrect');
    setTimeout(() => slot.classList.remove('flash-incorrect'), SLOT_FEEDBACK_MS);
  }

  function moveToSlotCentre(el, slot) {
    el.style.left = `${slot.offsetLeft + (slot.offsetWidth - el.offsetWidth) / 2}px`;
    el.style.top = `${slot.offsetTop + (slot.offsetHeight - el.offsetHeight) / 2}px`;
  }

  function snapBack(el) {
    const start = pickupPositions.get(el);
    if (!start) return;
    el.classList.add('is-returning');
    el.style.left = `${start.left}px`;
    el.style.top = `${start.top}px`;
    setTimeout(() => el.classList.remove('is-returning'), SETTLE_MS);
  }

  // Locks a correctly-placed artefact into its slot for good.
  function commitPlacement(el, item, slot) {
    tally.placed += 1;

    slot.classList.remove('is-target');
    slot.classList.add('is-filled');

    el.classList.add('is-placed');
    moveToSlotCentre(el, slot);
    el.dataset.locked = 'true'; // drag.js ignores pointerdown on locked elements

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
        highlightOwnSlot(under && under.dataset.slot === item.id ? under : null);
      },
      onDrop(target, _event, { cancelled }) {
        highlightOwnSlot(null);
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

  function getSummary() {
    return {
      total: tally.total,
      placed: tally.placed,
      remaining: tally.total - tally.placed,
    };
  }

  return { addItem, getSummary };
}
