/**
 * stage1.js
 *
 * Owns Stage 1 (the sorting scene) - conveyor belt, display case, rejection
 * bin, and the packages moving between them. This is D1.
 *
 * Deliberately empty right now. The drag-and-drop prototype currently
 * shown for Gold Rush/Easy lives entirely in js/game/prototypes/drag-demo.js
 * instead of here, so this file stays a clean starting point - nothing to
 * remove before starting the real implementation.
 *
 * Should end up level-agnostic: read whichever level was selected
 * (state.js's getLevel()) and load its data/levels/<level-id>/artefacts.json
 * + fillers.json, rather than forking per level/difficulty combination.
 */
