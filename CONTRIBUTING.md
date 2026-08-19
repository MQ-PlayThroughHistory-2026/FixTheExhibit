# Contributing to Fix the Exhibit 

Thanks for working on this project! 
This doc covers the day-to-day mechanics of contributing - branching, commits, PRs, and where to find/raise work.

---

## Branching 

- `main` is always demo-stable. Only release milestones land here. 
- `dev` is for active development. Most work targets this.
- `feature/*`, `fix/*` - dedicated branches for individual pieces of work (e.g. `feature/conveyor-belt`, `fix/timer-bug`).

## Merging

- Feature branches merge into `dev` via Pull Request, after code review or self-testing if no reviewer is available.
- When a release milestone is reached, `dev` is merged into `main`.
- Don't push directly to `main`.

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/): concise, present-tense, prefixed by type.

```
feat: add rejection bin drag logic
fix: correct timer offset on level restart
docs: update tech stack table
style: reformat belt.css
refactor: extract scoring logic into scoring.js
```

## Pull Requests

- Keep PRs scoped to one feature/fix where possible easier to review, easier to revert if something breaks.
- Link the related issue if one exists.
- Self-test locally before requesting review (see README's [Getting Started](./README.md#getting-started)).
- If you're the only one available to review, note that in the PR description before merging. 

## Code Style

- Match existing formatting in the file you're editing.
- CSS: keep component-specific styles in their own file under `styles/` (e.g. `belt.css`, `quiz.css`) rather than adding to `base.css`.
- JS: use ES modules; one responsibility per file under `js/game/`, `js/ui/`, `js/quiz/`.
- Comment non-obvious logic, especially around Pointer Events handling (drag thresholds, touch vs. mouse branching).

## Issues & Task Tracking

- GitHub Issues: [FixTheExhibit/Issues](https://github.com/MQ-PlayThroughHistory-2026/FixTheExhibit/issues)
- Team also uses a private Trello board, check there first for anything not yet reflected as a GitHub issue.

## Team Sync
- Weekly check-ins: Thursdays and/or Sundays, via Zoom.
- Bring blockers to check-ins rather than sitting on them especially anything waiting on the client.