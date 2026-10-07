/**
 * drag.js
 *
 * Minimal "pick up and move freely" behaviour for one element, built on
 * the Pointer Events API per the tech stack decision in README/Project
 * Plan: pointerdown/pointermove/pointerup handle mouse and touch through
 * one code path instead of separate mouse and touch handlers.
 *
 * Free dragging within a bounding container. Optional hooks (onDragStart,
 * onDragMove, onDrop) let sorting.js and arranging.js react to the drag.
 */

// Module-level so a popup covering the stage can stop every draggable at
// once. Set/cleared by whichever screen owns the popup.
let inputSuspended = false;

// Blocks new drags from starting until called again with false. Doesn't
// interrupt a drag already in progress.
export function setDragSuspended(suspended) {
  inputSuspended = suspended;
}

export function makeDraggable(el, container, hooks = {}) {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  el.addEventListener('pointerdown', (event) => {
  // Set by other game code (e.g. arranging.js) once an item has been
  // correctly placed and should stop being draggable.
  if (el.dataset.locked === 'true') return;
  // A popup is covering the stage.
  if (inputSuspended) return;

  dragging = true;
  // setPointerCapture keeps this element receiving move/up events even if
  // the pointer moves faster than the box and briefly leaves its bounds -
  // matters a lot on touch, where fingers are imprecise.
  el.setPointerCapture(event.pointerId);
  const elRect = el.getBoundingClientRect();
  offsetX = event.clientX - elRect.left;
  offsetY = event.clientY - elRect.top;
  el.classList.add('is-dragging');
  hooks.onDragStart?.(el, event);
});

  el.addEventListener('pointermove', (event) => {
    if (!dragging) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    let newLeft = event.clientX - containerRect.left - offsetX;
    let newTop = event.clientY - containerRect.top - offsetY;

    // Clamp so the box can't be dragged outside the stage area.
    newLeft = Math.max(0, Math.min(newLeft, containerRect.width - elRect.width));
    newTop = Math.max(0, Math.min(newTop, containerRect.height - elRect.height));

    el.style.left = `${newLeft}px`;
    el.style.top = `${newTop}px`;
    hooks.onDragMove?.(el, event);
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('is-dragging');
    if (el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    hooks.onDrop?.(el, event, { cancelled: event.type === 'pointercancel' });
  }

  // pointercancel fires if the OS interrupts the gesture (e.g. an incoming
  // call, or the browser deciding it's a scroll) - without handling it the
  // box could get stuck thinking it's still being dragged.
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);
}
