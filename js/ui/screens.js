/**
 * screens.js
 *
 * Generic screen switcher. Each top-level view in index.html is a
 * `<section class="screen">`; only one is visible at a time via the
 * `.hidden` class from base.css.
 */

const screens = new Map();

export function registerScreens() {
  document.querySelectorAll('.screen').forEach((el) => {
    screens.set(el.id, el);
  });
}

export function showScreen(screenId) {
  if (!screens.has(screenId)) {
    console.warn(`Unknown screen: ${screenId}`);
    return;
  }
  screens.forEach((el, id) => {
    el.classList.toggle('hidden', id !== screenId);
  });
}

/** Wires up any element with [data-target] to call showScreen on click. */
export function wireBackButtons() {
  document.querySelectorAll('[data-target]').forEach((el) => {
    el.addEventListener('click', () => showScreen(el.dataset.target));
  });
}
