/**
 * belt.js
 *
 * Conveyor belt for Stage 1 (task D1). Moves packages left to right along a
 * lane inside the stage, feeds them in from off-screen left with random
 * gaps, and sends anything that leaves on the right back to the queue on
 * the left, so unsorted packages keep coming round. Draws the belt as a
 * band of dots (.belt-track in belt.css) that scrolls at the same speed.
 *
 * Packages being dragged, returning or sorted are left alone. That is read
 * off the classes drag.js and sorting.js already set, so neither file needs
 * to know about the belt.
 */

const DOT_PERIOD_PX = 24; // matches background-size of .belt-track in belt.css
const REST_OVERLAP_PX = 6; // how far a package overlaps the band so it looks like it rests on it
const RETURN_MS = 350; // matches .is-returning in sorting.css
const MAX_FRAME_S = 0.05; // caps the jump after a stalled frame (tab switch etc.)
const HELD_CLASSES = ['is-dragging', 'is-returning', 'is-sorted'];

/**
 * @param {object} options
 * @param {HTMLElement} options.stage      container the packages move inside
 * @param {number} options.laneTop         y of the belt band inside the stage, in px
 * @param {number} options.speedPxPerSec
 * @param {number} [options.minGapPx=40]   smallest random gap between packages
 * @param {number} [options.maxGapPx=220]  largest random gap between packages
 */
export function createBelt({ stage, laneTop, speedPxPerSec, minGapPx = 40, maxGapPx = 220 }) {
  const positions = new Map(); // el -> left edge as a float, so slow speeds don't round away
  const track = stage.querySelector('.belt-track') ?? createTrack();
  let rafId = null;
  let lastTime = null;
  let paused = false;

  track.style.top = `${laneTop}px`;
  // One dot period per (period / speed) seconds keeps the dots in step with the packages.
  track.style.setProperty('--belt-period-seconds', `${DOT_PERIOD_PX / speedPxPerSec}s`);
  updateTrack();

  // Adds the belt band to the stage, behind the packages.
  function createTrack() {
    const el = document.createElement('div');
    el.className = 'belt-track';
    stage.prepend(el);
    return el;
  }

  // Runs the dot animation only while the belt is started and not paused.
  function updateTrack() {
    track.style.animationPlayState = rafId !== null && !paused ? 'running' : 'paused';
  }

  // Random gap between two packages.
  function randomGap() {
    return minGapPx + Math.random() * (maxGapPx - minGapPx);
  }

  // Top of a package resting on the band.
  function restingTop(el) {
    return laneTop - el.offsetHeight + REST_OVERLAP_PX;
  }

  // Left edge of the queue, the stage's left edge or the left-most package if that is further out.
  function tailX() {
    let min = 0;
    positions.forEach((x) => {
      min = Math.min(min, x);
    });
    return min;
  }

  // Places el off-screen left of the queue so it enters after a random gap.
  function add(el) {
    const x = tailX() - el.offsetWidth - randomGap();
    positions.set(el, x);
    el.style.left = `${x}px`;
    el.style.top = `${restingTop(el)}px`;
  }

  // Puts a package back on the band where it was dropped, after a missed drop.
  function putBack(el) {
    positions.set(el, el.offsetLeft);
    el.classList.add('is-returning');
    el.style.top = `${restingTop(el)}px`;
    setTimeout(() => el.classList.remove('is-returning'), RETURN_MS);
  }

  // Advances every free package by dt seconds, unless paused.
  function step(dt) {
    if (paused) return;
    const dx = speedPxPerSec * dt;
    const exitX = stage.clientWidth;
    positions.forEach((x, el) => {
      if (!el.isConnected) {
        positions.delete(el);
        return;
      }
      if (HELD_CLASSES.some((cls) => el.classList.contains(cls))) return;
      const next = x + dx;
      if (next > exitX) {
        add(el);
        return;
      }
      positions.set(el, next);
      el.style.left = `${next}px`;
    });
  }

  // One animation frame, steps by the real elapsed time.
  function frame(now) {
    if (lastTime !== null) {
      step(Math.min((now - lastTime) / 1000, MAX_FRAME_S));
    }
    lastTime = now;
    rafId = requestAnimationFrame(frame);
  }

  // Starts the belt.
  function start() {
    if (rafId !== null) return;
    lastTime = null;
    rafId = requestAnimationFrame(frame);
    updateTrack();
  }

  // Stops the belt, packages stay where they are.
  function stop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    lastTime = null;
    updateTrack();
  }

  // Holds everything in place, e.g. while an information card is open.
  function pause() {
    paused = true;
    updateTrack();
  }

  // Lets the belt move again.
  function resume() {
    paused = false;
    updateTrack();
  }

  return { add, putBack, start, stop, pause, resume, step };
}
