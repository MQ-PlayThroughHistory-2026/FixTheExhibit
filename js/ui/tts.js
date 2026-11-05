/**
 * tts.js
 *
 * Text-to-speech for the popups and cards that need reading (tutorial
 * cards, fun fact and information cards, the clue popup, quiz questions,
 * stage popups and the certificate). Uses the browser's built-in Web
 * Speech API, so there is nothing to install, no files to host and no
 * data leaves the device (NFR09).
 *
 * Each of those panels has a small speaker button in its top-right corner.
 * Tapping it reads the panel aloud; tapping it again (or closing the panel,
 * changing screen, pressing Escape...) stops. Nothing is ever read
 * automatically.
 *
 * Adding the button to a panel:
 *   - Static panel in index.html: add the `data-tts` attribute to it.
 *     initTts() puts the button in.
 *   - Panel built in JavaScript: call addTtsButton(panel).
 *
 * What gets read is the text of the panel's title and paragraphs, in page
 * order (see READABLE_SELECTOR). A panel that needs different wording can
 * set `data-tts-text` on itself, and an element whose sentence carries on
 * into the next one can set `data-tts-continue` to skip the full stop.
 *
 * TTS has its own volume, set from the pause/settings menu (pause-menu.js).
 * Like the other volumes it is only kept in memory (NFR08), so a page
 * refresh resets it to the default.
 */

const DEFAULT_TTS_VOLUME = 0.8;
// Australian English first (the museum's visitors), then any English voice.
const PREFERRED_LANGS = ['en-AU', 'en-GB', 'en-US', 'en'];
// Long utterances are cut off partway by some browsers (Chrome stops after
// roughly 15 seconds), so text is spoken a sentence or two at a time.
const MAX_CHUNK_CHARS = 220;

// What's read inside a panel, in page order.
const READABLE_SELECTOR =
  '.info-card-title, .pause-title, h2, p, .quiz-question, .quiz-answer, .quiz-feedback';

const SPEAKER_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path class="tts-cone" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path class="tts-wave tts-wave-1" d="M15 9.5a3.5 3.5 0 0 1 0 5" />
    <path class="tts-wave tts-wave-2" d="M17.6 7a7 7 0 0 1 0 10" />
  </svg>`;

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  && typeof SpeechSynthesisUtterance !== 'undefined';

let volume = DEFAULT_TTS_VOLUME;
// Bumped by every speak()/stopSpeaking(), so callbacks from a cancelled
// reading can tell they're out of date and do nothing.
let readingId = 0;
// The button whose panel is being read, if any.
let activeButton = null;
let voices = [];

function clampVolume(value) {
  return Math.min(1, Math.max(0, value));
}

export function isTtsSupported() {
  return supported;
}

export function getTtsVolume() {
  return volume;
}

export function setTtsVolume(newVolume) {
  volume = clampVolume(newVolume);
}

// Voices load asynchronously in most browsers, so the list is refreshed when it changes.
function loadVoices() {
  voices = window.speechSynthesis.getVoices();
}

function pickVoice() {
  for (const lang of PREFERRED_LANGS) {
    const wanted = lang.toLowerCase();
    const match = voices.find((voice) => {
      const voiceLang = voice.lang.replace('_', '-').toLowerCase();
      return voiceLang === wanted || (lang === 'en' && voiceLang.startsWith('en'));
    });
    if (match) return match;
  }
  return null;
}

// Splits text into sentence-sized pieces no longer than MAX_CHUNK_CHARS where possible.
function splitIntoChunks(text) {
  // A full stop only ends a sentence when whitespace follows, so "31.1 grams" stays whole.
  const sentences = text.match(/.+?(?:[.!?]+["')\]]*(?=\s|$)|$)/gs) ?? [text];
  const chunks = [];
  let current = '';
  sentences.forEach((raw) => {
    const sentence = raw.trim();
    if (!sentence) return;
    if (current && (current.length + sentence.length + 1) > MAX_CHUNK_CHARS) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

function setButtonSpeaking(button, speaking) {
  if (!button) return;
  button.classList.toggle('is-speaking', speaking);
  button.setAttribute('aria-pressed', String(speaking));
  button.setAttribute('aria-label', speaking ? 'Stop reading aloud' : 'Read aloud');
}

function clearActiveButton() {
  setButtonSpeaking(activeButton, false);
  activeButton = null;
}

/** Stops any reading in progress. Safe to call at any time. */
export function stopSpeaking() {
  readingId += 1;
  clearActiveButton();
  if (supported) window.speechSynthesis.cancel();
}

/**
 * Reads the text aloud at the TTS volume, replacing whatever was being read.
 * @param {string} text
 * @param {HTMLElement} [button]  the speaker button to show as active while reading
 */
export function speak(text, button = null) {
  stopSpeaking();
  const clean = text?.replace(/\s+/g, ' ').trim();
  if (!supported || !clean || volume === 0) return;

  const id = readingId;
  const chunks = splitIntoChunks(clean);
  const voice = pickVoice();
  activeButton = button;
  setButtonSpeaking(button, true);

  chunks.forEach((chunk, i) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.volume = volume;
    utterance.lang = voice?.lang ?? PREFERRED_LANGS[0];
    if (voice) utterance.voice = voice;
    const finish = () => {
      // Only the last piece ends the reading, and only if nothing newer has started.
      if (id !== readingId || i !== chunks.length - 1) return;
      clearActiveButton();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  });
}

// Makes the text read more naturally than it looks: "Q3." and "92 / 100".
function tidyForSpeech(text) {
  return text
    .replace(/\bQ(\d+)\./g, 'Question $1.')
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1 out of $2');
}

// The text of one readable element, or '' if it isn't showing anything.
function textOf(el) {
  if (el.closest('.tts-button, [hidden], .hidden:not(.tts-root)')) return '';
  let text = el.textContent.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  // Answer buttons are lettered by a picture, so the letter is in its alt text.
  if (el.matches('.quiz-answer')) {
    const letter = el.querySelector('img')?.alt;
    if (letter) text = `${letter}: ${text}`;
  }
  // A piece that carries on into the next (data-tts-continue) gets no full stop.
  if (el.hasAttribute('data-tts-continue')) return text;
  // Each piece reads as its own sentence, so titles don't run into the text.
  return /[.!?:]$/.test(text) ? text : `${text}.`;
}

/** The text a panel would read aloud right now. */
export function getPanelText(root) {
  if (root.dataset.ttsText) return root.dataset.ttsText;
  const seen = new Set();
  const parts = [];
  root.querySelectorAll(READABLE_SELECTOR).forEach((el) => {
    // A nested match (a <p> inside a quiz-feedback...) shouldn't be read twice.
    if (seen.has(el) || [...seen].some((other) => other.contains(el))) return;
    seen.add(el);
    const text = textOf(el);
    if (text) parts.push(text);
  });
  return tidyForSpeech(parts.join(' '));
}

/**
 * Puts a speaker button in a panel's top-right corner (once only).
 * @param {HTMLElement} root  the panel (a card, popup or overlay panel)
 * @returns {HTMLButtonElement|null}
 */
export function addTtsButton(root) {
  if (!supported || !root) return null;
  const existing = root.querySelector(':scope > .tts-button, :scope > .info-card-content > .tts-button');
  if (existing) return existing;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tts-button';
  button.innerHTML = SPEAKER_ICON;
  setButtonSpeaking(button, false);

  button.addEventListener('click', () => {
    if (activeButton === button) {
      stopSpeaking();
      return;
    }
    speak(getPanelText(root), button);
  });

  root.classList.add('tts-root');
  root.appendChild(button);
  return button;
}

/**
 * Call once at start up. Adds the speaker buttons to every panel marked
 * data-tts, and makes sure reading never outlives what is on screen.
 */
export function initTts() {
  if (!supported) {
    document.documentElement.classList.add('no-tts');
    return;
  }

  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);

  document.querySelectorAll('[data-tts]').forEach(addTtsButton);

  // Any press that isn't on a speaker button stops the reading: closing a
  // card, turning a page, pressing Next, opening the pause menu...
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.tts-button')) stopSpeaking();
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') stopSpeaking();
  });
  // A new screen, or the inactivity reload, shouldn't carry on reading.
  document.addEventListener('screenchange', stopSpeaking);
  window.addEventListener('pagehide', stopSpeaking);
}
