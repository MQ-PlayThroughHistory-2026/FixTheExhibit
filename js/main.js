/**
 * main.js - entry point.
 *
 * Currently only boots the main menu / difficulty flow (D6). Later tasks
 * (D1-D5, D7, D9-D11) will import and initialise their own scenes here
 * once screen-game-stub is replaced with the real sorting scene.
 */

import { registerScreens } from './ui/screens.js';
import { initMenu } from './ui/menu.js';
import { initFullscreenOnFirstInteraction, initStaffExit } from './ui/kiosk.js';
import { initAudio } from './ui/audio.js';

document.addEventListener('DOMContentLoaded', () => {
  registerScreens();
  initAudio();
  initMenu();
  initFullscreenOnFirstInteraction();
  initStaffExit();
});
