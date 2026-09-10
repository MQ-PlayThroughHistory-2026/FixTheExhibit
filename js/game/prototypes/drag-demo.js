/**
 * drag-demo.js
 *
 * TEMPORARY. This wires up the single draggable box on the
 * "Stage 1 Prototype" screen, used to test out Pointer Events dragging
 * (see js/game/drag.js) on both mouse and touch before the real Stage 1
 * scene exists.
 *
 * When someone starts building the real sorting scene:
 *   1. Delete this file (and the js/game/prototypes/ folder if empty after).
 *   2. Remove the `screen-stage1-prototype` section from index.html.
 *   3. Remove the import of initDragDemo and the gold-rush/easy special
 *      case in js/ui/menu.js's enterStage1().
 *   4. Build the real scene in js/game/stage1.js instead - that file is
 *      intentionally untouched by this prototype so there's nothing to
 *      strip out of it.
 *
 * js/game/drag.js itself is NOT part of this cleanup - it's a generic,
 * reusable helper and the real sorting/arranging scenes will likely want
 * it too.
 */

import { makeDraggable } from '../drag.js';

let initialised = false;

/** Safe to call more than once - only wires the box up the first time. */
export function initDragDemo() {
  if (initialised) return;
  const box = document.getElementById('drag-box');
  const area = document.getElementById('stage-area');
  makeDraggable(box, area);
  initialised = true;
}
