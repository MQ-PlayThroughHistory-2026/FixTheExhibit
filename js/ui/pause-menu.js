/**
 * pause-menu.js
 *
 * The in-game pause button and pause menu: background music and sound
 * effects volume, plus Resume / Restart / Quit. Replaces the per-screen
 * "Restart" and "Return to main menu" buttons.
 *
 * The pause button only shows on screens marked `data-pausable` in
 * index.html. Each game screen tells this module how to pause, resume and
 * restart itself via registerPauseHandlers(), so this file doesn't need
 * to know anything about belts, drag or popups:
 *
 *   registerPauseHandlers('screen-id', {
 *     onPause,   // freeze the scene (belt, drag, timers...)
 *     onResume,  // undo onPause
 *     onRestart, // start the scene over - Restart is hidden if omitted
 *     onQuit,    // clean-up before returning to the main menu
 *   });
 */

import { getBgmVolume, setBgmVolume, getSfxVolume, setSfxVolume, playSfx } from './audio.js';

const ICON_VOLUME = 'assets/ui/menu-volume.avif';
const ICON_MUTED = 'assets/ui/volume-mute.avif';

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
let quitToMainMenu = () => {};

export function registerPauseHandlers(screenId, handlers) {
  handlersByScreen.set(screenId, handlers);
}

function activeHandlers() {
  return handlersByScreen.get(activeScreenId) ?? {};
}

function isPausableScreen(screenId) {
  return document.getElementById(screenId)?.hasAttribute('data-pausable') ?? false;
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
  if (isOpen || !isPausableScreen(activeScreenId)) return;
  isOpen = true;
  activeHandlers().onPause?.();
  Object.keys(CHANNELS).forEach(renderChannel);
  document.getElementById('btn-pause-restart').classList.toggle('hidden', !activeHandlers().onRestart);
  document.getElementById('pause-menu').classList.remove('hidden');
  document.getElementById('btn-pause').classList.add('hidden');
  document.getElementById('btn-pause-resume').focus();
}

// Hides the menu without resuming the scene - callers decide what happens next.
function hideMenu() {
  isOpen = false;
  document.getElementById('pause-menu').classList.add('hidden');
  document.getElementById('btn-pause').classList.toggle('hidden', !isPausableScreen(activeScreenId));
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

function quit() {
  const { onQuit } = activeHandlers();
  hideMenu();
  onQuit?.();
  quitToMainMenu();
}

function onScreenChange(event) {
  activeScreenId = event.detail.screenId;
  // Leaving a screen by any route (e.g. Quit) always closes the menu.
  if (isOpen) hideMenu();
  document.getElementById('btn-pause').classList.toggle('hidden', !isPausableScreen(activeScreenId));
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

/**
 * @param {object} options
 * @param {() => void} options.onQuit  returns to the main menu (after the screen's own onQuit)
 */
export function initPauseMenu({ onQuit }) {
  quitToMainMenu = onQuit;
  const overlay = document.getElementById('pause-menu');

  document.addEventListener('screenchange', onScreenChange);
  document.getElementById('btn-pause').addEventListener('click', openMenu);
  document.getElementById('btn-pause-resume').addEventListener('click', resume);
  document.getElementById('btn-pause-restart').addEventListener('click', restart);
  document.getElementById('btn-pause-quit').addEventListener('click', quit);
  wireVolumeControls();

  // Tapping the dimmed area around the panel resumes, same as Resume.
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) resume();
  });

  // Escape toggles the menu on keyboard setups.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (isOpen) resume();
    else openMenu();
  });
}
