/**
 * sorting-demo.js
 *
 * TEMPORARY. Adds sample packages to the Stage 1 prototype screen and wires
 * them to js/game/sorting.js, so sorting can be tried from the menu flow
 * before the real Stage 1 (js/game/stage1.js) loads level data. Sits
 * alongside drag-demo.js and goes when that does.
 */

import { createSorter } from '../sorting.js';

// Placeholder items in the shape of artefacts.json and fillers.json.
const DEMO_ITEMS = [
  {
    id: 'gold-pan',
    name: 'Gold pan',
    correctZone: 'display-case',
    funFactCorrect: '[Insert fun fact here]',
    funFactIncorrect: 'Incorrect: This belonged in the display case.',
  },
  {
    id: 'miners-licence',
    name: "Miner's licence",
    correctZone: 'display-case',
    funFactCorrect: '[Insert fun fact here]',
    funFactIncorrect: 'Incorrect: This belonged in the display case.',
  },
  {
    id: 'metal-detector',
    name: 'Metal detector',
    correctZone: 'rejection-bin',
    funFactCorrect: '[Insert fun fact here]',
    funFactIncorrect: 'Incorrect: This was a filler item.'
  },
  {
    id: 'diamond-sword',
    name: 'Diamond sword',
    correctZone: 'rejection-bin',
    funFactCorrect: '[Insert fun fact here]',
    funFactIncorrect: 'Incorrect: This was a filler item.',
  },
];

const FIRST_COLUMN_PX = 124; // leaves room for drag-demo.js's box
const FIRST_ROW_PX = 40;
const STEP_PX = 100; // 88px package plus 12px gap

let wired = false;

// Returns a shuffled copy of the list.
function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Creates one element per item, lays them out in rows and registers each with the sorter.
function spawnPackages(stage, items, sorter) {
  stage.querySelectorAll('.package').forEach((el) => el.remove());

  const perRow = Math.max(1, Math.floor((stage.clientWidth - FIRST_COLUMN_PX) / STEP_PX));

  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'draggable-box package';
    el.textContent = item.name;
    el.style.left = `${FIRST_COLUMN_PX + (i % perRow) * STEP_PX}px`;
    el.style.top = `${FIRST_ROW_PX + Math.floor(i / perRow) * STEP_PX}px`;
    stage.appendChild(el);
    sorter.addPackage(el, item);
  });
}

// Shows the feedback card with a title, the fun fact and a correct/incorrect text.
function showCard(title, text, correct) {
  const card = document.getElementById('sorting-feedback');
  document.getElementById('sorting-feedback-title').textContent = title;
  document.getElementById('sorting-feedback-text').textContent = text;
  card.classList.toggle('is-correct', correct);
  card.classList.toggle('is-incorrect', !correct);
  card.classList.remove('hidden');
}

// Hides the feedback card.
function hideCard() {
  document.getElementById('sorting-feedback').classList.add('hidden');
}

// Writes the running tally line.
function renderTally(summary) {
  document.getElementById('sorting-tally').textContent =
    `Sorted ${summary.sorted} / ${summary.total} · Correct ${summary.correct} · Incorrect ${summary.incorrect}`;
}

// Builds a fresh set of packages and a new sorter. Safe to call again, it starts over.
export function initSortingDemo() {
  const stage = document.getElementById('stage-area');

  if (!wired) {
    document.getElementById('btn-sorting-feedback-close').addEventListener('click', hideCard);
    document.getElementById('btn-stage1-restart').addEventListener('click', initSortingDemo);
    wired = true;
  }

  hideCard();

  const sorter = createSorter({
    stage,
    onSorted(result) {
      renderTally(sorter.getSummary());
      showCard(
        result.correct ? `Correct, ${result.item.name} sorted` : `Not quite, ${result.item.name}`,
        result.funFact ?? '',
        result.correct,
      );
    },
    onComplete(summary) {
      document.getElementById('sorting-tally').textContent =
        `All ${summary.total} packages sorted, ${summary.correct} correct and ${summary.incorrect} incorrect.`;
    },
  });

  spawnPackages(stage, shuffle(DEMO_ITEMS), sorter);
  renderTally(sorter.getSummary());
}
