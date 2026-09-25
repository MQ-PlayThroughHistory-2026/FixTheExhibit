/**
 * sorting.js
 *
 * Stage 1 sorting. Hit-tests a dragged package against the
 * display case and rejection bin, commits the drop, keeps the tally and
 * reports through callbacks.
 *
 * Zones are elements inside the stage with data-zone="display-case" or
 * data-zone="rejection-bin". A drop counts when the package centre is
 * inside a zone box.
 */

import { makeDraggable } from './drag.js';

export const ZONES = Object.freeze({
  DISPLAY_CASE: 'display-case',
  REJECTION_BIN: 'rejection-bin',
});

const ZONE_FEEDBACK_MS = 600; // one fade per drop, nothing strobes (NFR05)
const PACKAGE_SETTLE_MS = 350; // matches the transitions in sorting.css

/**
 * @typedef {object} PackageItem   entry from artefacts.json or fillers.json
 * @property {string} id
 * @property {string} name
 * @property {'display-case'|'rejection-bin'} correctZone
 * @property {string} [funFactCorrect]
 * @property {string} [funFactIncorrect]
 *
 * @typedef {object} SortResult
 * @property {PackageItem} item
 * @property {string} zone
 * @property {boolean} correct
 * @property {string|undefined} funFact
 *
 * @typedef {object} SortSummary
 * @property {number} total
 * @property {number} sorted
 * @property {number} correct
 * @property {number} incorrect
 * @property {number} remaining
 * @property {SortResult[]} history
 */

/**
 * Creates the sorter for one stage. Register every package with addPackage,
 * then listen on onSorted and onComplete.
 * @param {object} options
 * @param {HTMLElement} options.stage  holds the packages and the [data-zone] elements
 * @param {(result: SortResult) => void} [options.onSorted]
 * @param {(summary: SortSummary) => void} [options.onComplete]
 * @param {(el: HTMLElement) => void} [options.onReturn]  replaces the default snap-back on a missed drop
 */
export function createSorter({ stage, onSorted, onComplete, onReturn }) {
  const zones = Array.from(stage.querySelectorAll('[data-zone]'));
  if (zones.length === 0) {
    throw new Error('createSorter needs at least one [data-zone] element inside the stage');
  }

  const tally = { total: 0, sorted: 0, correct: 0, incorrect: 0, history: [] };
  const pickupPositions = new WeakMap();

  // Returns the zone whose box contains the package centre, or null.
  function zoneUnder(el) {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    return (
      zones.find((zone) => {
        const z = zone.getBoundingClientRect();
        return x >= z.left && x <= z.right && y >= z.top && y <= z.bottom;
      }) ?? null
    );
  }

  // Marks the zone a package is hovering over and clears the others.
  function highlightZone(target) {
    zones.forEach((zone) => zone.classList.toggle('is-target', zone === target));
  }

  // Centres element (el) on the zone. offset* values share the frame left/top are set
  // in and ignore the hover scale on the zone.
  function moveToZoneCentre(el, zone) {
    el.style.left = `${zone.offsetLeft + (zone.offsetWidth - el.offsetWidth) / 2}px`;
    el.style.top = `${zone.offsetTop + (zone.offsetHeight - el.offsetHeight) / 2}px`;
  }

  // Slides element (el) back to where it was picked up.
  function snapBack(el) {
    const start = pickupPositions.get(el);
    if (!start) return;
    el.classList.add('is-returning');
    el.style.left = `${start.left}px`;
    el.style.top = `${start.top}px`;
    setTimeout(() => el.classList.remove('is-returning'), PACKAGE_SETTLE_MS);
  }

  // Records the drop, tints the zone, removes the package and fires callbacks.
  function commitSort(el, item, zone) {
    const chosenZone = zone.dataset.zone;
    const correct = chosenZone === item.correctZone;

    tally.sorted += 1;
    tally[correct ? 'correct' : 'incorrect'] += 1;

    const result = {
      item,
      zone: chosenZone,
      correct,
      funFact: correct ? item.funFactCorrect : item.funFactIncorrect,
    };
    tally.history.push(result);

    const tint = correct ? 'flash-correct' : 'flash-incorrect';
    zone.classList.remove('flash-correct', 'flash-incorrect');
    zone.classList.add(tint);
    setTimeout(() => zone.classList.remove(tint), ZONE_FEEDBACK_MS);

    // The decision is final either way, so the package leaves the stage.
    el.classList.add('is-sorted');
    moveToZoneCentre(el, zone);
    setTimeout(() => el.remove(), PACKAGE_SETTLE_MS);

    onSorted?.(result);
    if (tally.sorted === tally.total) {
      onComplete?.(getSummary());
    }
  }

  /**
   * Makes element (el) draggable and ties it to its level-data item.
   * @param {HTMLElement} el   absolutely positioned element already inside the stage
   * @param {PackageItem} item
   */
  function addPackage(el, item) {
    if (!item || !item.correctZone) {
      throw new Error(`addPackage was given item "${item?.id ?? 'unknown'}" without a correctZone`);
    }
    tally.total += 1;
    el.dataset.itemId = item.id;

    makeDraggable(el, stage, {
      // Remember the pickup point for snapBack.
      onDragStart(target) {
        pickupPositions.set(target, { left: target.offsetLeft, top: target.offsetTop });
      },
      // Highlight whichever zone the package is over.
      onDragMove(target) {
        highlightZone(zoneUnder(target));
      },
      // Commit inside a zone, otherwise put the package back.
      onDrop(target, _event, { cancelled }) {
        highlightZone(null);
        const zone = cancelled ? null : zoneUnder(target);
        if (zone) {
          commitSort(target, item, zone);
        } else if (onReturn) {
          onReturn(target);
        } else {
          snapBack(target);
        }
      },
    });
  }

  // Returns a copy of the current tally.
  function getSummary() {
    return {
      total: tally.total,
      sorted: tally.sorted,
      correct: tally.correct,
      incorrect: tally.incorrect,
      remaining: tally.total - tally.sorted,
      history: [...tally.history],
    };
  }

  return { addPackage, getSummary };
}
