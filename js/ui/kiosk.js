/**
 * kiosk.js
 *
 * Two related behaviours for running as a locked-down museum kiosk:
 *   1. Enter fullscreen on the visitor's first tap/click anywhere on the
 *      page - browsers require a genuine user gesture before allowing
 *      fullscreen, it can't be requested automatically on page load.
 *   2. A staff-only, passphrase-gated way to exit fullscreen.
 *
 * IMPORTANT LIMITATION: the Fullscreen API used here works in Chromium-
 * based browsers (Chrome, Edge) and desktop Safari, matching the
 * "dedicated kiosk browser or standard Chromium-based browser" deployment
 * described in SRS 2.2.1. It does NOT work in iOS Safari - Apple has
 * never supported Element.requestFullscreen() there for page content.
 * SRS 2.2 lists iPads as a testing substitute platform, so if the real
 * kiosk hardware ends up being iPads on Safari, this feature will
 * silently no-op there. The lockdown mechanism on that platform is
 * iOS's own Guided Access (Settings > Accessibility) - a device setting,
 * not something any web page's code can control. Worth raising with the
 * client if/what actual kiosk hardware will be used.
 *
 * NOTE: The passphrase check below is a visitor deterrent, not real security. 
 * Anyone reading this file's source (or the browser's dev tools) 
 * can see the passphrase. Don't reuse it anywhere where real security matters. 
 * 
 * In a real kiosk environment, the kiosk browser/mode will prevent exiting 
 * fullscreen so this kiosk.js code won't work as intended. Staff will 
 * need to use the kiosk browser's own exit mechanism (e.g. a hardware button, 
 * a special gesture, or Alt + F4 on keyboard) to leave fullscreen. 
 * This passphrase modal is just for testing in a normal browser 
 * to simulate kiosk mode.
 */

//TODO: staff to set a real value before deployment
const STAFF_PASSPHRASE = 'exit';

function requestFullscreen() {
  const el = document.documentElement;
  
  const request = el.requestFullscreen || 
                  el.webkitRequestFullscreen ||
                  el.msRequestFullscreen ||
                  el.mozRequestFullScreen;

  if (!request) return; // unsupported browser (e.g. iOS Safari) - game still works windowed
  request.call(el)?.catch?.(() => {
    // Some other error occurred (e.g. user denied permission). Ignore and continue windowed.
  });
}

function exitFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen || document.mozCancelFullScreen;
  if (!exit) return;
  exit.call(document)?.catch?.(() => {});
}

/**
 * Enters fullscreen on the visitor's first tap/click anywhere on the page.
 * Only fires once - if it's declined, we don't keep re-prompting on every
 * subsequent tap.
 */
export function initFullscreenOnFirstInteraction() {
  document.addEventListener('pointerdown', requestFullscreen, { once: true });
  document.addEventListener('click', requestFullscreen, { once: true });
}

/** Wires the staff-only exit trigger + passphrase modal. */
export function initStaffExit() {
  const trigger = document.getElementById('btn-staff-exit');
  const modal = document.getElementById('staff-exit-modal');
  const input = document.getElementById('staff-exit-passphrase');
  const error = document.getElementById('staff-exit-error');
  const submit = document.getElementById('btn-staff-exit-submit');
  const cancel = document.getElementById('btn-staff-exit-cancel');

  function openModal() {
    error.classList.add('hidden');
    modal.classList.remove('hidden');
    input.value = '';
    input.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  function attemptExit() {
    if (input.value === STAFF_PASSPHRASE) {
      closeModal();
      exitFullscreen();
    } else {
      error.classList.remove('hidden');
      input.value = '';
      input.focus();
    }
  }

  trigger.addEventListener('click', openModal);
  cancel.addEventListener('click', closeModal);
  submit.addEventListener('click', attemptExit);

  // Clicking the dark overlay (outside the staff exit screen) closes, same as Cancel.
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') attemptExit();
    if (event.key === 'Escape') closeModal();
  });
}
