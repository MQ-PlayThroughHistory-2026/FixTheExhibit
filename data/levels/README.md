# Level content structure

Each level gets its own folder here, named after the level's `id` (matching
`index.json`, e.g. `gold-rush`, `ancient-egypt`). This keeps content
additions isolated per level - per NFR10/NFR11 and the Project Plan's scope
item on "documentation and coding framework to support easy addition of
levels and artefacts", adding a level should mean adding a new folder here,
not touching `js/game/`, `js/ui/`, or `js/quiz/`.

```
data/levels/
├── index.json              # level-select metadata shown on the level-select screen
├── <level-id>/
│   ├── artefacts.json      # the 10 real artefacts for this level
│   ├── fillers.json        # the 10 filler packages for this level
│   └── config.json         # per-difficulty tuning (timer, belt speed)
```

## index.json

One entry per level, used to render the level-select cards:

```json
{ "id": "gold-rush", "name": "Australian Gold Rush", "description": "..." }
```

## `<level-id>/artefacts.json`

One entry per artefact. Field -> owning task (see Project Plan 6.2.1,
R2/R5-R10 for gold-rush, R11-R19 for ancient-egypt):

| Field | Task | Notes |
|---|---|---|
| `id`, `name` | R2 | Stable id used to reference the artefact elsewhere (e.g. quiz results) |
| `correctZone` | - | Always `"display-case"` for artefacts |
| `blurb` | R6 | ~150 words, shown when arranged correctly |
| `longExplanation` | R7 | Array of ~150-word paragraphs, plus sources, for the "read more" panel |
| `funFactCorrect` / `funFactIncorrect` | R8 | Shown immediately after sorting |
| `riddle` | R9 | Hard-mode arrangement clue (easy mode uses a silhouette instead - no data needed for that) |
| `quiz.easy` / `quiz.hard` | R10 | Each has `question`, 4 `options`, and `correctIndex` |

## `<level-id>/fillers.json`

One entry per filler package. Simpler shape (task R3-R4 for gold-rush,
equivalent tasks for ancient-egypt):

| Field | Notes |
|---|---|
| `id`, `name` | Stable id + display name |
| `correctZone` | Always `"rejection-bin"` for fillers |
| `funFactCorrect` / `funFactIncorrect` | Shown immediately after sorting |

## `<level-id>/config.json`

Gameplay numbers for this level, one block per difficulty. Every field is
optional: anything left out (or the whole file, if missing) falls back to
the defaults in `js/game/state.js`'s `DIFFICULTY_CONFIG`.

```json
{
  "easy": { "sortingTimerSeconds": 90, "beltSpeedPxPerSec": 90 },
  "hard": { "sortingTimerSeconds": 45, "beltSpeedPxPerSec": 150 }
}
```

| Field | Notes |
|---|---|
| `sortingTimerSeconds` | Length of the sorting countdown |
| `beltSpeedPxPerSec` | Conveyor belt speed during sorting |

## Before merging real content

Per the Quality Control Plan (5.2) and Definition of Done (5.3), every
player-facing fact here needs Research Team verification against a
reliable source, plus client confirmation for anything drawn from the
museum's own collection, **before** it's merged. The example
files currently in each level folder are placeholder only.
