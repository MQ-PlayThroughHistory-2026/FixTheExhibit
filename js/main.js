/**
 * main.js - entry point.
 *
 * Boots the main menu / difficulty flow (D6). Levels and their phases are
 * started from there through js/game/level.js.
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
