/**
 * belt.js
 *
 * Conveyor belt for the sorting phase (task D1). Moves packages left to right along a
 * lane inside the stage, feeds them in from off-screen left with random
 * gaps, and sends anything that leaves on the right back to the queue on
 * the left, so unsorted packages keep coming round. Draws the belt from
 * the conveyor video onto a canvas (.belt-track in belt.css), moving its
 * slats exactly as far as the packages on every frame.
 *
 * The video isn't played. It only has 30 frames a second, and slowed down
 * to the packages' speed its slats moved in visible jumps next to the
 * packages, which move every screen refresh. Its slats are all alike, so
 * the picture repeats each time the belt has moved one slat along, and the
 * first few frames of the video cover that whole cycle. Those are copied
 * once (loadKeyframes), and drawBelt() picks the one nearest to how far
 * the belt has travelled, slides it the rest of the way and fades it into
 * the next.
 *
 * The video is the same 1920x1080 frame as the sorting stage's background
 * art (sort scene.avif in sorting-scene.css) and is drawn at the same
 * scale ("cover"), so the belt is in proportion with the scene. Only the
 * band of the frame the belt's top and side are drawn in is shown, along
 * the bottom of the stage - the rest of the frame is empty, and the
 * underside of the belt (which runs the other way) is left out.
 *
 * Packages being dragged, returning or sorted are left alone. That is read
 * off the classes drag.js and sorting.js already set, so neither file needs
 * to know about the belt.
 */

const BELT_VIDEO_URL = 'assets/sort-scene/conveyer belt.webm';
// Measured from the video, in its own pixels.
const VIDEO_WIDTH_PX = 1920;
const VIDEO_HEIGHT_PX = 1080;
const VIDEO_BAND_TOP_PX = 678; // the rows the belt's top and side are drawn in
const VIDEO_BAND_BOTTOM_PX = 790; // the underside is drawn below this, down to 806
const VIDEO_SURFACE_Y_PX = 700; // on the belt's top face, where packages rest
const VIDEO_BAND_HEIGHT_PX = VIDEO_BAND_BOTTOM_PX - VIDEO_BAND_TOP_PX;
const VIDEO_FPS = 30;
const VIDEO_PX_PER_FRAME = 16.97; // how far the slats move from one frame of the video to the next
const VIDEO_SLAT_PITCH_PX = 74.73; // from one slat to the next, the picture repeats every time the belt moves this far
// Frames of the video needed to cover one slat's worth of movement.
const KEYFRAME_COUNT = Math.ceil(VIDEO_SLAT_PITCH_PX / VIDEO_PX_PER_FRAME);
// Left off each end of the frame, so sliding it sideways never shows its edge.
const EDGE_MARGIN_PX = 20;
const VISIBLE_WIDTH_PX = VIDEO_WIDTH_PX - EDGE_MARGIN_PX * 2;
const REST_OVERLAP_PX = 6; // how far a package overlaps the lane so it looks like it rests on the belt
const RETURN_MS = 350; // matches .is-returning in sorting.css
const MAX_FRAME_S = 0.05; // caps the jump after a stalled frame (tab switch etc.)
const HELD_CLASSES = ['is-dragging', 'is-returning', 'is-sorted'];

let keyframesPromise = null;

// Copies the belt's band out of the first KEYFRAME_COUNT frames of the
// video, one canvas each. Done once, every belt after that reuses them.
function loadKeyframes() {
  keyframesPromise ??= new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const frames = [];
    // The middle of the frame's time slot, so the seek can't land on its neighbour.
    const seekToNextFrame = () => {
      video.currentTime = (frames.length + 0.5) / VIDEO_FPS;
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.addEventListener('loadeddata', seekToNextFrame, { once: true });
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = VIDEO_WIDTH_PX;
      canvas.height = VIDEO_BAND_HEIGHT_PX;
      canvas
        .getContext('2d')
        .drawImage(
          video,
          0, VIDEO_BAND_TOP_PX, VIDEO_WIDTH_PX, VIDEO_BAND_HEIGHT_PX,
          0, 0, VIDEO_WIDTH_PX, VIDEO_BAND_HEIGHT_PX,
        );
      frames.push(canvas);
      if (frames.length < KEYFRAME_COUNT) seekToNextFrame();
      else resolve(frames);
    });
    video.addEventListener('error', () => reject(video.error));
    video.src = BELT_VIDEO_URL;
  });
  return keyframesPromise;
}

/**
 * @param {object} options
 * @param {HTMLElement} options.stage      container the packages move inside
 * @param {number} options.speedPxPerSec
 * @param {number} [options.minGapPx=40]   smallest random gap between packages
 * @param {number} [options.maxGapPx=120]  largest random gap between packages
 */
export function createBelt({ stage, speedPxPerSec, minGapPx = 40, maxGapPx = 120 }) {
  const positions = new Map(); // el -> left edge as a float, so slow speeds don't round away
  const track = stage.querySelector('.belt-track') ?? createTrack();
  const canvas = track.querySelector('canvas');
  const context = canvas.getContext('2d');
  let keyframes = null; // set once loadKeyframes() is done, the band stays plain until then
  let laneTop = 0; // y the packages rest on inside the stage, set by applyLane()
  let stagePxPerVideoPx = 1; // how big the canvas draws one pixel of the video, set by applyLane()
  let travelledPx = 0; // how far the belt has moved, in stage px
  let rafId = null;
  let lastTime = null;
  let paused = false;

  applyLane();
  loadKeyframes()
    .then((frames) => {
      keyframes = frames;
      drawBelt();
    })
    .catch(() => {
      // The video couldn't be read - .belt-track's plain band stays, the packages still move.
    });

  // Sizes the canvas as "cover" would size the video, and shows only the
  // belt's band of it along the bottom of the stage.
  function applyLane() {
    const scale = Math.max(stage.clientWidth / VIDEO_WIDTH_PX, stage.clientHeight / VIDEO_HEIGHT_PX);
    const bandHeight = VIDEO_BAND_HEIGHT_PX * scale;
    const bandTop = stage.clientHeight - bandHeight;
    laneTop = bandTop + (VIDEO_SURFACE_Y_PX - VIDEO_BAND_TOP_PX) * scale;
    // The canvas is as wide as the whole frame would be, but only shows VISIBLE_WIDTH_PX of it.
    stagePxPerVideoPx = (VIDEO_WIDTH_PX * scale) / VISIBLE_WIDTH_PX;

    track.style.top = `${bandTop}px`;
    track.style.height = `${bandHeight}px`;
    canvas.style.width = `${VIDEO_WIDTH_PX * scale}px`;
    canvas.style.left = `${(stage.clientWidth - VIDEO_WIDTH_PX * scale) / 2}px`;
    drawBelt();
  }

  // Adds the belt's canvas to the stage, behind the packages.
  function createTrack() {
    const el = document.createElement('div');
    el.className = 'belt-track';
    const surface = document.createElement('canvas');
    surface.width = VIDEO_WIDTH_PX;
    surface.height = VIDEO_BAND_HEIGHT_PX;
    el.appendChild(surface);
    stage.prepend(el);
    return el;
  }

  // Draws a keyframe slid shiftPx (video px) to the right of where it was filmed.
  function drawKeyframe(index, shiftPx) {
    context.drawImage(
      keyframes[index],
      EDGE_MARGIN_PX - shiftPx, 0, VISIBLE_WIDTH_PX, VIDEO_BAND_HEIGHT_PX,
      0, 0, canvas.width, canvas.height,
    );
  }

  // Draws the belt as it looks after moving travelledPx: the last keyframe
  // it has passed, slid on by what's left over, with the next keyframe
  // (slid back to the same spot) faded in over it the closer it gets. After
  // the last keyframe comes the first again, one slat further along.
  function drawBelt() {
    if (!keyframes) return;
    const phase = (travelledPx / stagePxPerVideoPx) % VIDEO_SLAT_PITCH_PX;
    const index = Math.min(KEYFRAME_COUNT - 1, Math.floor(phase / VIDEO_PX_PER_FRAME));
    const shift = phase - index * VIDEO_PX_PER_FRAME;
    const isLast = index === KEYFRAME_COUNT - 1;
    const gap = isLast ? VIDEO_SLAT_PITCH_PX - index * VIDEO_PX_PER_FRAME : VIDEO_PX_PER_FRAME;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.globalAlpha = 1;
    drawKeyframe(index, shift);
    context.globalAlpha = shift / gap;
    drawKeyframe(isLast ? 0 : index + 1, shift - gap);
  }

  // Random gap between two packages.
  function randomGap() {
    return minGapPx + Math.random() * (maxGapPx - minGapPx);
  }

  // Top of a package resting on the belt.
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
    let x = 0;
    if (tailX() == 0) {
      x = -el.offsetWidth - minGapPx/2; //Don't want large gap for first package
    } else {
      x = tailX() - el.offsetWidth - randomGap();
    }
    positions.set(el, x);
    el.style.left = `${x}px`;
    el.style.top = `${restingTop(el)}px`;
  }

  // Puts a package back on the belt where it was dropped, after a missed drop.
  function putBack(el) {
    positions.set(el, el.offsetLeft);
    el.classList.add('is-returning');
    el.style.top = `${restingTop(el)}px`;
    setTimeout(() => el.classList.remove('is-returning'), RETURN_MS);
  }

  // Advances the belt and every free package on it by dt seconds, unless paused.
  function step(dt) {
    if (paused) return;
    const dx = speedPxPerSec * dt;
    travelledPx += dx;
    drawBelt();
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
  }

  // Stops the belt, packages stay where they are.
  function stop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    lastTime = null;
  }

  // Holds everything in place, e.g. while an information card is open.
  function pause() {
    paused = true;
  }

  /**
   * Refits the belt and changes the speed after the stage is resized, and
   * re-seats every package riding on it (their height may have changed too).
   * Horizontal positions are kept; anything now past the right edge loops
   * round as usual.
   */
  function resize(options) {
    ({ speedPxPerSec } = { speedPxPerSec, ...options });
    applyLane();
    positions.forEach((_x, el) => {
      if (HELD_CLASSES.some((cls) => el.classList.contains(cls))) return;
      el.style.top = `${restingTop(el)}px`;
    });
  }

  // Lets the belt move again.
  function resume() {
    paused = false;
  }

  return { add, putBack, start, stop, pause, resume, resize, step };
}
