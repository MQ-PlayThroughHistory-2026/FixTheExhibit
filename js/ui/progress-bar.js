/**
 * progress-bar.js
 *
 * Updates a .progress-bar (styles/hud.css) to `done` of `total`, keeping
 * its role="progressbar" values in step for screen readers.
 */

export function setProgress(el, done, total) {
  const percent = total > 0 ? (done / total) * 100 : 0;
  el.style.setProperty('--progress', `${percent}%`);
  el.setAttribute('aria-valuemax', String(total));
  el.setAttribute('aria-valuenow', String(done));
  el.setAttribute('aria-valuetext', `${done} of ${total}`);
}
