/**
 * quiz-scene.js
 *
 * The quiz phase (D5) for js/game/level.js, the last stage of a level.
 * Shows one question per artefact (quiz.js) on the quiz card with four
 * lettered answers. Tapping an answer locks that question and marks it,
 * the correct answer in green and a wrong pick in red, so the player
 * always sees which one was right (task R10). The arrow button then moves
 * on, and stays disabled until the question is answered.
 *
 * After the last question the stage transition (js/ui/stage-transition.js)
 * shows the score. Restart replays the whole level from sorting
 * (ctx.onRestartLevel) and Leave reloads the page back to the title
 * screen. The score is only shown, never stored (NFR08).
 *
 * Level-agnostic like the other phases. The questions come from whichever
 * level was picked, so every level in data/levels/index.json gets its
 * quiz with no per-level code.
 *
 * Nothing on this screen moves or times out, so the pause menu only needs
 * Restart (this quiz from question 1). Its Quit reloads the page as on
 * every other screen.
 */

import { buildQuestions, createQuiz } from './quiz.js';
import { getDifficulty } from '../game/state.js';
import { sizeStageToViewport, watchViewport } from '../game/stage-size.js';
import { registerPauseHandlers } from '../ui/pause-menu.js';
import { playSfx } from '../ui/audio.js';
import { showStageTransition } from '../ui/stage-transition.js';
import { setProgress } from '../ui/progress-bar.js';

const LETTERS = ['A', 'B', 'C', 'D'];

let wired = false;
let quiz = null;
// The ctx from level.js for the current run, kept so restarting reuses it.
let ctx = null;
// Stops the current run's viewport listener (stage-size.js).
let unwatchViewport = null;

// The four answer buttons, in A to D order.
function answerButtons() {
  return Array.from(document.querySelectorAll('#quiz-answers .quiz-answer'));
}

// Fills the progress bar by how many questions have been answered.
function renderProgress() {
  const { answered, total } = quiz.getSummary();
  setProgress(document.getElementById('quiz-progress'), answered, total);
}

// Puts the current question on the card and clears the previous question's marks.
function renderQuestion() {
  const q = quiz.current();
  document.getElementById('quiz-question-number').textContent = `Q${q.number}.`;
  document.getElementById('quiz-question-text').textContent = q.question;

  answerButtons().forEach((button, i) => {
    button.querySelector('.quiz-answer-text').textContent = q.options[i];
    button.classList.remove('is-correct', 'is-incorrect', 'is-dimmed');
    button.removeAttribute('aria-disabled');
  });

  const feedback = document.getElementById('quiz-feedback');
  feedback.textContent = '';
  feedback.classList.remove('is-correct', 'is-incorrect');

  const next = document.getElementById('btn-quiz-next');
  next.disabled = true;
  next.setAttribute('aria-label', q.number === q.total ? 'Finish the quiz' : 'Next question');

  renderProgress();
  // Screen readers start on the new question rather than the old arrow button.
  document.getElementById('quiz-question').focus();
}

// Locks the question, marks the right answer green and a wrong pick red, then enables the arrow.
function choose(optionIndex) {
  const result = quiz.answer(optionIndex);
  if (!result) return; // already answered, the first choice stands

  answerButtons().forEach((button, i) => {
    button.setAttribute('aria-disabled', 'true');
    if (i === result.correctIndex) button.classList.add('is-correct');
    else if (i === result.chosenIndex) button.classList.add('is-incorrect');
    else button.classList.add('is-dimmed');
  });

  playSfx(result.correct ? 'correct' : 'incorrect');
  const feedback = document.getElementById('quiz-feedback');
  feedback.textContent = result.correct ? 'Correct!' : `Not quite. The answer was ${LETTERS[result.correctIndex]}.`;
  feedback.classList.toggle('is-correct', result.correct);
  feedback.classList.toggle('is-incorrect', !result.correct);

  renderProgress();
  const next = document.getElementById('btn-quiz-next');
  next.disabled = false;
  next.focus();
}

// Stops resize handling, before leaving the screen.
function leaveScene() {
  unwatchViewport?.();
  unwatchViewport = null;
}

// End of the level. Shows the score and offers replaying the whole level, or Leave.
// Stands in for the end of level screen (task D10, Yuyang's "Finished screen"
// card) until that exists. Swap this call for it, quiz.getSummary() has the score.
function showLevelComplete() {
  const { correct, total } = quiz.getSummary();
  showStageTransition({
    title: 'Well Done!',
    message: `Level complete! You answered ${correct} of ${total} questions correctly. Restart to play the whole level again.`,
    onRestart: () => {
      leaveScene();
      ctx.onRestartLevel();
    },
  });
}

// The arrow button. Moves to the next question, or ends the level after the last one.
function goNext() {
  if (!quiz.isAnswered()) return;
  if (quiz.isLast()) {
    showLevelComplete();
    return;
  }
  quiz.next();
  renderQuestion();
}

/**
 * Builds this level's questions for the chosen difficulty and shows the first. Safe to call again, it starts over.
 *
 * @param {object} runCtx  { level, settings, onNext, onRestartLevel } from js/game/level.js
 */
export function initQuizScene(runCtx) {
  ctx = runCtx;
  const stage = document.getElementById('quiz-stage');

  if (!wired) {
    answerButtons().forEach((button, i) => button.addEventListener('click', () => choose(i)));
    document.getElementById('btn-quiz-next').addEventListener('click', goNext);
    registerPauseHandlers('screen-quiz', {
      onRestart: () => initQuizScene(ctx),
    });
    wired = true;
  }

  // Stop the previous run's resize handling on re-init.
  leaveScene();
  document.getElementById('quiz-heading').textContent = ctx.level.name;
  quiz = createQuiz(buildQuestions(ctx.level.artefacts, getDifficulty()));
  renderQuestion();

  // Everything above the stage is filled in before sizing it to what's left of the viewport.
  sizeStageToViewport(stage);
  unwatchViewport = watchViewport(() => {
    if (stage.offsetParent === null) return; // screen hidden, nothing to measure
    sizeStageToViewport(stage);
  });
}
