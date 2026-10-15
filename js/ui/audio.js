/**
 * audio.js
 *
 * Background music and sound effects, each with its own volume (set from
 * the pause menu, see pause-menu.js). Volumes are only kept in memory -
 * per NFR08 nothing is retained beyond the current session, so a page
 * refresh (e.g. the kiosk inactivity timeout) resets them to the defaults.
 *
 * Browsers block audio until the visitor has interacted with the page, so
 * the music starts on the first tap/click/keypress instead of on load.
 */

const BGM_URL = 'assets/sounds/background-music/bgm.mp3';
const SFX_URLS = {
  click: 'assets/sounds/effects/button-click.mp3',
  correct: 'assets/sounds/effects/correct.mp3',
  incorrect: 'assets/sounds/effects/incorrect.mp3',
  timesUp: 'assets/sounds/effects/times-up.mp3',
  clueUp: 'assets/sounds/effects/clue-up.mp3',
  clueDown: 'assets/sounds/effects/clue-down.mp3',
  wellDone: 'assets/sounds/effects/well-done.mp3',
  congratulations: 'assets/sounds/effects/congratulations.mp3',
};

const DEFAULT_BGM_VOLUME = 0.25;
const DEFAULT_SFX_VOLUME = 0.4;

const bgm = new Audio(BGM_URL);
bgm.loop = true;
bgm.preload = 'auto';
bgm.volume = DEFAULT_BGM_VOLUME;

let sfxVolume = DEFAULT_SFX_VOLUME;
// True once the click being handled has played an effect of its own, see initAudio().
let clickPlayedSfx = false;

// One preloaded element per effect. playSfx() plays a clone of it so rapid
// repeats (e.g. several quick button taps) overlap instead of cutting off.
const sfxSamples = Object.fromEntries(
  Object.entries(SFX_URLS).map(([name, url]) => {
    const sample = new Audio(url);
    sample.preload = 'auto';
    return [name, sample];
  }),
);

function clampVolume(volume) {
  return Math.min(1, Math.max(0, volume));
}

export function getBgmVolume() {
  return bgm.volume;
}

export function setBgmVolume(volume) {
  bgm.volume = clampVolume(volume);
}

export function getSfxVolume() {
  return sfxVolume;
}

export function setSfxVolume(volume) {
  sfxVolume = clampVolume(volume);
}

/** Plays one of SFX_URLS' effects at the current sound effects volume. */
export function playSfx(name) {
  clickPlayedSfx = true;
  const sample = sfxSamples[name];
  if (!sample || sfxVolume === 0) return;
  const sound = sample.cloneNode();
  sound.volume = sfxVolume;
  sound.play().catch(() => {
    // Blocked before the first interaction, or the file failed - not worth interrupting play over.
  });
}

/**
 * Call while handling a click that should make no sound at all: the click
 * effect is skipped for it (see initAudio()). For a press that does
 * nothing (a riddle card behind an open popup) or that is better silent
 * (closing an information card).
 */
export function skipClickSfx() {
  clickPlayedSfx = true;
}

function startBgm() {
  if (!bgm.paused) return;
  bgm.play().catch(() => {
    // Still blocked (e.g. the gesture didn't count) - the next interaction retries.
  });
}

/**
 * Starts the music on the first interaction and plays the click effect for
 * every button press. Delegated on the document so buttons created later
 * (level cards, hard-mode clue slots) are covered too. A press whose own
 * handler already played an effect (a quiz answer's correct / incorrect,
 * the button that opens a Well Done popup) gets no click on top of it, and
 * neither does one whose handler called skipClickSfx().
 */
export function initAudio() {
  ['pointerdown', 'keydown', 'click'].forEach((type) => {
    document.addEventListener(type, startBgm);
  });
  bgm.addEventListener('playing', () => {
    ['pointerdown', 'keydown', 'click'].forEach((type) => {
      document.removeEventListener(type, startBgm);
    });
  }, { once: true });

  // Capture runs before the button's own handlers, the listener below after them.
  document.addEventListener('click', () => {
    clickPlayedSfx = false;
  }, true);
  document.addEventListener('click', (event) => {
    if (clickPlayedSfx) return;
    if (event.target.closest('button, [role="button"]')) playSfx('click');
  });
}
