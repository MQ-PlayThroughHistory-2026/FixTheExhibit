/**
 * confirm-dialog.js
 *
 * Development Team task D23: "are you sure?" messages for the buttons that
 * throw progress away. One shared dialog, so the pause menu, the stage popup
 * and the certificate all ask in the same way:
 *
 *   if (!(await confirmAction('leave'))) return;   // Cancel, Escape, or tapping outside
 *   window.location.reload();
 *
 * The wording depends on what the button actually costs the player, so
 * "restart" (the player keeps playing, but this stage or level starts over)
 * reads differently from "leave" (everything is lost and the next visitor
 * gets the title screen):
 *
 *   'restart-stage'  starts the current stage over; earlier stages are kept
 *   'restart-level'  starts the whole level over, results included
 *   'leave'          back to the title screen, mid-level progress is lost
 *   'leave-results'  as 'leave', but from the certificate, where the score
 *                    is about to disappear rather than progress
 *
 * Styled like the pause menu (same backplate and button art). Cancel is
 * focused first, so a stray tap or Enter never destroys progress.
 */

const CONFIRMATIONS = {
  'restart-stage': {
    title: 'Restart Stage?',
    message:
      'This stage will start over, and the progress you have made in it will be lost. Stages you have already finished are kept.',
    confirmLabel: 'Restart',
  },
  'restart-level': {
    title: 'Restart Level?',
    message:
      'You will go back to the very start of the level, and your progress and score so far will be lost.',
    confirmLabel: 'Restart',
  },
  leave: {
    title: 'Leave Game?',
    message:
      'You will go back to the title screen, and all of your progress in this level will be lost.',
    confirmLabel: 'Leave',
  },
  'leave-results': {
    title: 'Leave Game?',
    message:
      'You will go back to the title screen. Your certificate and score are not saved, so take a photo first if you want to keep them.',
    confirmLabel: 'Leave',
  },
};

// { resolve, opener } while a question is on screen, otherwise null.
let pending = null;

/** True while the dialog is showing, so other Escape handlers can stand down. */
export function isConfirmOpen() {
  return pending !== null;
}

// Answers the open question (true = confirmed) and puts focus back where it was.
function settle(confirmed) {
  if (!pending) return;
  const { resolve, opener } = pending;
  pending = null;
  document.getElementById('confirm-dialog').classList.add('hidden');
  opener?.focus?.();
  resolve(confirmed);
}

/**
 * Asks the player to confirm an action.
 * @param {'restart-stage'|'restart-level'|'leave'|'leave-results'} kind
 * @returns {Promise<boolean>} true if they confirmed, false if they cancelled
 */
export function confirmAction(kind) {
  const config = CONFIRMATIONS[kind];
  if (!config) throw new Error(`Unknown confirmation: ${kind}`);
  // Only one question at a time; a second request counts as "no".
  if (pending) return Promise.resolve(false);

  // Remembered before focus moves to Cancel, so it can be handed back afterwards.
  const opener = document.activeElement;
  document.getElementById('confirm-title').textContent = config.title;
  document.getElementById('confirm-text').textContent = config.message;
  document.getElementById('btn-confirm-yes').textContent = config.confirmLabel;
  document.getElementById('confirm-dialog').classList.remove('hidden');
  document.getElementById('btn-confirm-cancel').focus();

  return new Promise((resolve) => {
    pending = { resolve, opener };
  });
}

export function initConfirmDialog() {
  const overlay = document.getElementById('confirm-dialog');
  const cancel = document.getElementById('btn-confirm-cancel');
  const yes = document.getElementById('btn-confirm-yes');

  cancel.addEventListener('click', () => settle(false));
  yes.addEventListener('click', () => settle(true));

  // Tapping the dimmed area around the panel cancels.
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) settle(false);
  });

  // Capture phase and stopPropagation, so Escape only closes this dialog
  // and doesn't also toggle the pause menu underneath it.
  window.addEventListener(
    'keydown',
    (event) => {
      if (!pending) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        settle(false);
      } else if (event.key === 'Tab') {
        // Two buttons: keep focus inside the dialog.
        event.preventDefault();
        (document.activeElement === cancel ? yes : cancel).focus();
      }
    },
    true,
  );

  // The screen changed underneath us (e.g. the inactivity reset): drop the question.
  document.addEventListener('screenchange', () => settle(false));
}
