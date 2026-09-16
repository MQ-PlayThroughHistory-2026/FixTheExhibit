/**
 * sorting-demo.js
 *
 * TEMPORARY. Loads the selected level's packages from data/levels/<id>/
 * artefacts.json and fillers.json, puts them on the Stage 1 prototype
 * screen and wires them to js/game/sorting.js, so sorting can be tried from
 * the menu flow before the real Stage 1 (js/game/stage1.js) exists. Sits
 * alongside drag-demo.js and goes when that does.
 */

import { createSorter } from '../sorting.js';
import { getLevel } from '../state.js';

const FIRST_COLUMN_PX = 124; // leaves room for drag-demo.js's box
const FIRST_ROW_PX = 40;
const STEP_PX = 100; // 88px package plus 12px gap

let wired = false;

// Fetches one JSON file, throwing on a non-OK response.
async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json();
}

// Loads the level's artefacts and fillers as one list of package items.
async function loadLevelItems(levelId) {
  const [artefacts, fillers] = await Promise.all([
    loadJson(`data/levels/${levelId}/artefacts.json`),
    loadJson(`data/levels/${levelId}/fillers.json`),
  ]);
  return [...artefacts, ...fillers];
}

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

// Loads the level data, then builds the packages and a new sorter. Safe to call again, it starts over.
export async function initSortingDemo() {
  const stage = document.getElementById('stage-area');
  const tally = document.getElementById('sorting-tally');

  if (!wired) {
    document.getElementById('btn-sorting-feedback-close').addEventListener('click', hideCard);
    document.getElementById('btn-stage1-restart').addEventListener('click', initSortingDemo);
    wired = true;
  }

  hideCard();
  stage.querySelectorAll('.package').forEach((el) => el.remove());
  tally.textContent = 'Loading packages…';

  let items;
  try {
    items = await loadLevelItems(getLevel());
  } catch (err) {
    console.error(err);
    tally.textContent = 'Packages could not be loaded. Check the console for details.';
    return;
  }

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
      tally.textContent =
        `All ${summary.total} packages sorted, ${summary.correct} correct and ${summary.incorrect} incorrect.`;
    },
  });

  spawnPackages(stage, shuffle(items), sorter);
  renderTally(sorter.getSummary());
}
