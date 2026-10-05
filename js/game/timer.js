/**
 * timer.js
 *
 * Minimal countdown timer. This is a scaffold for Development Team task D8
 * (Set up timer in sorting scene) - the sorting phase should create one
 * with ctx.settings.sortingTimerSeconds (see js/game/level.js), which
 * already comes from the level's config.json for the chosen difficulty.
 *
 * Not wired to a pause menu or information-card interrupts yet - that
 * belongs to D7/D8 once those scenes exist.
 */

export class CountdownTimer {
  /**
   * @param {number} durationSeconds
   * @param {(secondsRemaining: number) => void} onTick
   * @param {() => void} onExpire
   */
  constructor(durationSeconds, onTick, onExpire) {
    this.durationSeconds = durationSeconds;
    this.secondsRemaining = durationSeconds;
    this.onTick = onTick;
    this.onExpire = onExpire;
    this.intervalId = null;
  }

  start() {
    this.stop();
    this.onTick?.(this.secondsRemaining);
    this.intervalId = setInterval(() => {
      this.secondsRemaining -= 1;
      this.onTick?.(this.secondsRemaining);
      if (this.secondsRemaining <= 0) {
        this.stop();
        this.onExpire?.();
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stop();
    this.secondsRemaining = this.durationSeconds;
  }
}
