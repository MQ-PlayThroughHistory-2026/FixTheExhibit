/**
 * timer.js
 *
 * Countdown timer for the sorting phase (D8). Counts real elapsed time
 * rather than interval ticks, so pausing and resuming (pause menu,
 * information cards) never gains or loses a partial second, and a
 * throttled background tab still counts down correctly.
 *
 *   const timer = new CountdownTimer(90, { onTick, onExpire });
 *   timer.start();            // from the full duration
 *   timer.pause(); timer.resume();
 *   timer.stop();             // finished for good - resume() does nothing until start()
 *
 * onTick(secondsRemaining) fires on start and whenever the whole number of
 * seconds left changes (rounded up, so it shows 1 until time is truly up).
 */

const TICK_MS = 100;

export class CountdownTimer {
  /**
   * @param {number} durationSeconds
   * @param {object} [callbacks]
   * @param {(secondsRemaining: number) => void} [callbacks.onTick]
   * @param {() => void} [callbacks.onExpire]
   */
  constructor(durationSeconds, { onTick, onExpire } = {}) {
    this.durationMs = durationSeconds * 1000;
    this.remainingMs = this.durationMs;
    this.onTick = onTick;
    this.onExpire = onExpire;
    this.status = 'idle'; // idle | running | paused | stopped
    this.intervalId = null;
    this.lastNow = 0;
    this.lastShownSeconds = null;
  }

  get secondsRemaining() {
    return Math.ceil(this.remainingMs / 1000);
  }

  start() {
    this.clearTicker();
    this.remainingMs = this.durationMs;
    this.lastShownSeconds = null;
    this.run();
  }

  pause() {
    if (this.status !== 'running') return;
    this.update();
    // update() may have just expired the timer.
    if (this.status !== 'running') return;
    this.clearTicker();
    this.status = 'paused';
  }

  resume() {
    if (this.status !== 'paused') return;
    this.run();
  }

  stop() {
    this.clearTicker();
    this.status = 'stopped';
  }

  run() {
    this.status = 'running';
    this.lastNow = performance.now();
    this.emitTick();
    this.intervalId = setInterval(() => this.update(), TICK_MS);
  }

  // Takes the time since the last update off the clock, and expires at 0.
  update() {
    const now = performance.now();
    this.remainingMs = Math.max(0, this.remainingMs - (now - this.lastNow));
    this.lastNow = now;
    this.emitTick();
    if (this.remainingMs === 0) {
      this.stop();
      this.onExpire?.();
    }
  }

  emitTick() {
    const seconds = this.secondsRemaining;
    if (seconds === this.lastShownSeconds) return;
    this.lastShownSeconds = seconds;
    this.onTick?.(seconds);
  }

  clearTicker() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
