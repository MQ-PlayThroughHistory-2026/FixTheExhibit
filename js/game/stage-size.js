/**
 * stage-size.js
 *
 * Sizes a scene's .stage-area to whatever height is left of the viewport
 * after everything else on its screen (heading, progress bar...), so the
 * page itself doesn't scroll on a short viewport and the stage uses the
 * room on a tall one. The bounds are mirrored by .stage-area's
 * height: clamp(...) in belt.css, the fallback before JS runs.
 */

const STAGE_HEIGHT_MIN_PX = 320;
const STAGE_HEIGHT_MAX_PX = 760;
const STAGE_BOTTOM_MARGIN_PX = 16;

export function sizeStageToViewport(stage) {
  const section = stage.closest('.screen');
  const app = section.parentElement;
  const appStyle = getComputedStyle(app);
  const appPadding = parseFloat(appStyle.paddingTop) + parseFloat(appStyle.paddingBottom);
  // Everything on the screen except the stage, gaps included. Measured from
  // the content rather than the stage's position, which moves as #app
  // re-centres around whatever height the stage currently has.
  const otherContentHeight = section.scrollHeight - stage.offsetHeight;
  const available = window.innerHeight - appPadding - otherContentHeight - STAGE_BOTTOM_MARGIN_PX;
  stage.style.height = `${Math.max(STAGE_HEIGHT_MIN_PX, Math.min(STAGE_HEIGHT_MAX_PX, available))}px`;
}

/**
 * Calls onResize on viewport changes (and once shortly after, in case the
 * viewport was still settling). Returns a function that stops listening.
 * Mobile address bar show/hide doesn't reliably fire a window resize
 * event, so visualViewport is listened to as well.
 */
export function watchViewport(onResize) {
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  const settleTimeoutId = setTimeout(onResize, 400);
  return () => {
    window.removeEventListener('resize', onResize);
    window.visualViewport?.removeEventListener('resize', onResize);
    clearTimeout(settleTimeoutId);
  };
}
