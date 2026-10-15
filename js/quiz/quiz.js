/**
 * quiz.js
 *
 * Rules for the end-of-level quiz (task D5). Turns the level's artefacts
 * into one multiple-choice question each, steps through them and checks
 * each answer against the correct option. Knows nothing about the page,
 * js/quiz/quiz-scene.js does the drawing.
 *
 * Questions come from each artefact's quiz.easy or quiz.hard entry in
 * data/levels/<level-id>/artefacts.json (task R10, see
 * data/levels/README.md). Those entries are placeholders for now, and an
 * artefact without a usable entry gets a generated placeholder question,
 * so a level with unfinished content still plays through.
 */

export const OPTION_COUNT = 4;

/**
 * @typedef {object} QuizQuestion
 * @property {string} artefactId
 * @property {string} question
 * @property {string[]} options       always OPTION_COUNT long
 * @property {number} correctIndex    index into options
 *
 * @typedef {object} QuizAnswer
 * @property {boolean} correct
 * @property {number} chosenIndex
 * @property {number} correctIndex
 *
 * @typedef {object} QuizSummary
 * @property {number} total
 * @property {number} answered
 * @property {number} correct
 */

// True when a quiz entry has a question, four options and a correctIndex pointing at one of them.
function isUsable(entry) {
  return (
    typeof entry?.question === 'string' &&
    Array.isArray(entry.options) &&
    entry.options.length === OPTION_COUNT &&
    Number.isInteger(entry.correctIndex) &&
    entry.correctIndex >= 0 &&
    entry.correctIndex < OPTION_COUNT
  );
}

// Stand-in for an artefact whose quiz entry is missing or incomplete. The
// correct letter moves along with the question number so testing doesn't
// always land on A.
function placeholderQuestion(artefact, index) {
  return {
    artefactId: artefact.id,
    question: `Placeholder question about ${artefact.name}`,
    options: ['Placeholder answer A', 'Placeholder answer B', 'Placeholder answer C', 'Placeholder answer D'],
    correctIndex: index % OPTION_COUNT,
  };
}

/**
 * One question per artefact, in data order, for the chosen difficulty.
 * @param {object[]} artefacts       level.artefacts from js/game/level-data.js
 * @param {'easy'|'hard'} difficulty
 * @returns {QuizQuestion[]}
 */
export function buildQuestions(artefacts, difficulty) {
  return artefacts.map((artefact, i) => {
    const entry = artefact.quiz?.[difficulty];
    if (!isUsable(entry)) {
      console.warn(`No usable quiz.${difficulty} for "${artefact.id}", using a placeholder question.`);
      return placeholderQuestion(artefact, i);
    }
    return {
      artefactId: artefact.id,
      question: entry.question,
      options: [...entry.options],
      correctIndex: entry.correctIndex,
    };
  });
}

/**
 * Steps through the questions one at a time. Each question takes one
 * answer, the first choice counts, then next() moves on.
 * @param {QuizQuestion[]} questions
 */
export function createQuiz(questions) {
  let index = 0;
  let answered = false;
  let correctCount = 0;

  // The question on screen, with its 1-based number and the total.
  function current() {
    return { ...questions[index], number: index + 1, total: questions.length };
  }

  // Records the choice for the current question. Returns null if it was already answered.
  function answer(optionIndex) {
    if (answered) return null;
    answered = true;
    const { correctIndex } = questions[index];
    const correct = optionIndex === correctIndex;
    if (correct) correctCount += 1;
    return { correct, chosenIndex: optionIndex, correctIndex };
  }

  // True once the current question has its answer.
  function isAnswered() {
    return answered;
  }

  // True on the final question.
  function isLast() {
    return index === questions.length - 1;
  }

  // Moves to the following question. Only once this one is answered, and never past the last.
  function next() {
    if (!answered || isLast()) return false;
    index += 1;
    answered = false;
    return true;
  }

  // Returns a copy of the current tally.
  function getSummary() {
    return {
      total: questions.length,
      answered: index + (answered ? 1 : 0),
      correct: correctCount,
    };
  }

  return { current, answer, isAnswered, isLast, next, getSummary };
}
