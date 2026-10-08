/**
 * pause-menu.js
 *
 * The pause button and pause menu: background music and sound effects
 * volume, plus Restart / Resume / Quit. Replaces the per-screen "Restart"
 * and "Return to main menu" buttons.
 *
 * The same button and menu work in two modes, picked by attributes on the
 * screen's <section> in index.html:
 *   - `data-pausable` (the game screens): pause button, and the menu has
 *     Restart / Resume / Quit.
 *   - `data-settings` (title, level and difficulty select): burger button,
 *     and the menu is volume only, closed with the X in its corner.
 * Neither shows anywhere else.
 *
 * Quit reloads the page, so the next visitor starts from a clean slate
 * (tutorials included). Each game screen tells this module how to pause,
 * resume and restart itself via registerPauseHandlers(), so this file
 * doesn't need to know anything about belts, drag or popups:
 *
 *   registerPauseHandlers('screen-id', {
 *     onPause,   // freeze the scene (belt, drag, timers...)
 *     onResume,  // undo onPause
 *     onRestart, // start the scene over - Restart is hidden if omitted
 *   });
 */

import { getBgmVolume, setBgmVolume, getSfxVolume, setSfxVolume, playSfx } from './audio.js';

const ICON_VOLUME = 'assets/ui/menu-volume.avif';
const ICON_MUTED = 'assets/ui/volume-mute.avif';

// Per mode: the button's art and label.
const BUTTONS = {
  pause: { icon: 'assets/ui/pause-button.avif', label: 'Pause' },
  settings: { icon: 'assets/ui/burg-menu.avif', label: 'Settings' },
};

// Per channel: how to read/write its volume, and its label for aria text.
const CHANNELS = {
  bgm: { label: 'background music', get: getBgmVolume, set: setBgmVolume },
  sfx: { label: 'sound effects', get: getSfxVolume, set: setSfxVolume },
};

const handlersByScreen = new Map();
// Volume to go back to when a channel is unmuted from the speaker button.
const volumeBeforeMute = { bgm: null, sfx: null };

let activeScreenId = null;
let isOpen = false;
let isBlocked = false;

export function registerPauseHandlers(screenId, handlers) {
  handlersByScreen.set(screenId, handlers);
}

/**
 * Hides the pause button (and ignores Escape) while another popup owns the
 * screen, e.g. the stage transition (js/ui/stage-transition.js).
 */
export function setPauseBlocked(blocked) {
  isBlocked = blocked;
  if (blocked && isOpen) hideMenu();
  syncPauseButton();
}

function activeHandlers() {
  return handlersByScreen.get(activeScreenId) ?? {};
}

// 'pause', 'settings', or null if the screen has no menu.
function menuMode(screenId) {
  const screen = document.getElementById(screenId);
  if (screen?.hasAttribute('data-pausable')) return 'pause';
  if (screen?.hasAttribute('data-settings')) return 'settings';
  return null;
}

function syncPauseButton() {
  const mode = menuMode(activeScreenId);
  const button = document.getElementById('btn-pause');
  button.classList.toggle('hidden', isBlocked || !mode);
  if (!mode) return;
  button.querySelector('img').src = BUTTONS[mode].icon;
  button.setAttribute('aria-label', BUTTONS[mode].label);
}

// Syncs one channel's slider position and speaker icon to its current volume.
function renderChannel(channel) {
  const { label, get } = CHANNELS[channel];
  const volume = get();
  const slider = document.querySelector(`.pause-slider[data-channel="${channel}"]`);
  const mute = document.querySelector(`.pause-mute[data-channel="${channel}"]`);
  slider.value = Math.round(volume * 100);
  slider.setAttribute('aria-valuetext', `${slider.value}%`);
  const muted = volume === 0;
  mute.querySelector('img').src = muted ? ICON_MUTED : ICON_VOLUME;
  mute.setAttribute('aria-label', muted ? `Unmute ${label}` : `Mute ${label}`);
  mute.setAttribute('aria-pressed', String(muted));
}

function toggleMute(channel) {
  const { get, set } = CHANNELS[channel];
  if (get() > 0) {
    volumeBeforeMute[channel] = get();
    set(0);
  } else {
    // Unmuting a channel that was dragged to 0 (not muted) goes to half volume.
    set(volumeBeforeMute[channel] || 0.5);
  }
  renderChannel(channel);
}

function openMenu() {
  const mode = menuMode(activeScreenId);
  if (isOpen || isBlocked || !mode) return;
  isOpen = true;
  activeHandlers().onPause?.();
  Object.keys(CHANNELS).forEach(renderChannel);
  const isSettings = mode === 'settings';
  document.querySelector('#pause-menu .pause-actions').classList.toggle('hidden', isSettings);
  document.getElementById('btn-pause-close').classList.toggle('hidden', !isSettings);
  document.getElementById('btn-pause-restart').classList.toggle('hidden', !activeHandlers().onRestart);
  document.getElementById('pause-menu').classList.remove('hidden');
  document.getElementById('btn-pause').classList.add('hidden');
  document.getElementById(isSettings ? 'btn-pause-close' : 'btn-pause-resume').focus();
}

// Hides the menu without resuming the scene - callers decide what happens next.
function hideMenu() {
  isOpen = false;
  document.getElementById('pause-menu').classList.add('hidden');
  syncPauseButton();
}

function resume() {
  if (!isOpen) return;
  hideMenu();
  activeHandlers().onResume?.();
  document.getElementById('btn-pause').focus();
}

function restart() {
  const { onResume, onRestart } = activeHandlers();
  hideMenu();
  onResume?.();
  onRestart?.();
}

// A full reload rather than going back to the main menu, so nothing from
// this visitor (e.g. tutorials already seen) carries over to the next.
function quit() {
  window.location.reload();
}

function onScreenChange(event) {
  activeScreenId = event.detail.screenId;
  // Leaving a screen by any route (e.g. Quit) always closes the menu.
  if (isOpen) hideMenu();
  syncPauseButton();
}

function wireVolumeControls() {
  document.querySelectorAll('.pause-slider').forEach((slider) => {
    const { channel } = slider.dataset;
    slider.addEventListener('input', () => {
      CHANNELS[channel].set(Number(slider.value) / 100);
      renderChannel(channel);
    });
    // Lets the visitor hear the new effects volume once they let go.
    if (channel === 'sfx') slider.addEventListener('change', () => playSfx('click'));
  });

  document.querySelectorAll('.pause-mute').forEach((button) => {
    button.addEventListener('click', () => toggleMute(button.dataset.channel));
  });
}

export function initPauseMenu() {
  const overlay = document.getElementById('pause-menu');

  document.addEventListener('screenchange', onScreenChange);
  document.getElementById('btn-pause').addEventListener('click', openMenu);
  document.getElementById('btn-pause-resume').addEventListener('click', resume);
  document.getElementById('btn-pause-close').addEventListener('click', resume);
  document.getElementById('btn-pause-restart').addEventListener('click', restart);
  document.getElementById('btn-pause-quit').addEventListener('click', quit);
  wireVolumeControls();

  // Tapping the dimmed area around the panel resumes, same as Resume / X.
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) resume();
  });

  // Escape toggles the menu on keyboard setups.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    // The staff exit modal (js/ui/kiosk.js) handles its own Escape.
    if (event.target.closest?.('.modal')) return;
    if (isOpen) resume();
    else openMenu();
  });
}
