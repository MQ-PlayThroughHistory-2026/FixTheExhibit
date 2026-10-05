/**
 * level-data.js
 *
 * Loads level content from data/levels/ (see data/levels/README.md for the
 * file shapes). The only place that knows those paths, so phases get their
 * data handed to them by level.js instead of fetching it themselves.
 */

const LEVELS_DIR = 'data/levels';

// Fetches one JSON file, throwing on a non-OK response.
async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json();
}

/** The level-select metadata from index.json. */
export function loadLevelIndex() {
  return loadJson(`${LEVELS_DIR}/index.json`);
}

/** Everything one level needs: its index.json entry, artefacts and fillers. */
export async function loadLevelData(levelId) {
  const dir = `${LEVELS_DIR}/${levelId}`;
  const [index, artefacts, fillers] = await Promise.all([
    loadLevelIndex(),
    loadJson(`${dir}/artefacts.json`),
    loadJson(`${dir}/fillers.json`),
  ]);
  const entry = index.find((level) => level.id === levelId);
  return {
    id: levelId,
    name: entry?.name ?? levelId,
    artefacts,
    fillers,
  };
}
