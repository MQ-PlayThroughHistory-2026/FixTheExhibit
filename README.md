> Flag anything still open. 🚩

>Insert Team name/logo or Fix The Exhibit in cool font (replacing the title) to make it look more professional. e.g. `<img src="assets/logo.png" style="width:1000px;"/>`


# Fix The Exhibit

A browser game where you're the new intern at a museum, and the artefact's shipping labels got mixed up. Sort real artefacts from the fakes before the delivery driver leaves, then build the exhibit and see how much history you picked up along the way.

**Live demo:** [link once deployed] 🚩
<br>**Status:** In development 🚩

---

## Table of Contents
- [Fix The Exhibit](#fix-the-exhibit)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Core Gameplay](#core-gameplay)
  - [MVP Implementation Summary](#mvp-implementation-summary)
  - [Tech Stack](#tech-stack)
    - [Frontend Core](#frontend-core)
    - [Web APIs, Data \& Hosting](#web-apis-data--hosting)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Running locally](#running-locally)
  - [Project Structure](#project-structure)
  - [Contributing To This Project](#contributing-to-this-project)
  - [Project Teams](#project-teams)
    - [Development Team](#development-team)
    - [Visuals Team](#visuals-team)
    - [Research Team](#research-team)
  - [License](#license)

---

## Overview

*Fix The Exhibit* is an interactive companion piece to museum exhibits, providing players a hands-on way to engage with accurate historical information instead of the pop-culture version of history most games serve up.

The game covers two levels, the Australian gold rush and ancient Egypt, each built around ten genuine artefacts and ten filler packages from other eras. Players sort incoming packages under a timer, then take their time arranging the correct artefacts into a display case, reading a short blurb about each one. A quiz at the end checks what stuck, and sorting, arrangement accuracy, and quiz results combine into a rank from New Visitor up to Expert Historian.

## Core Gameplay

- **Conveyor belt sorting:** packages move across the screen under a countdown timer; players drag-and-drop each one into the display case or rejection bin, judging whether it belongs to the level's time period. Correct and incorrect sorts each get a quick audio-visual response and a short fun fact.
- **Timer:** if the timer runs out before all packages are sorted, the level restarts. Mistakes don't cost time or end the level, they only affect the final rank.
- **Micro-feedback:** placing an artefact correctly reveals a short blurb about it, with an option to open a longer explanation.
- **End-of-level quiz:** one multiple-choice question per artefact, shown after arranging is complete. Results are shown to the player immediately but are not stored.
- **Ranked titles:** sorting speed, arrangement accuracy, and quiz accuracy combine into a score, presented as a named title with cut-offs that differ by difficulty mode.
- **Levels/themes:** two levels at launch - Australian gold rush and ancient Egypt - with the codebase structured so museums can add further levels/artefacts later.

## MVP Implementation Summary
The current MVP includes:
- **Conveyor belt mechanic** - Moves items across or toward screen.
- **Drag & drop mechanic or swipe L/R mechanic (simplified gameplay)** -
- ^These are just placeholders 🚩

**Milestones Achieved:**
- [Design] Create company brand and style ✅
- [Base] Frontend Core built with HTML, CSS, and JavaScript  ✅
- [Stretch] Deployed on Github Pages for live access ✅
- ^These are just placeholders 🚩

## Tech Stack
Vanilla HTML, CSS, and JavaScript.

### Frontend Core

| Layer | Choice | Notes |
|---|---|---|
| **Structure** | HTML | Used for ease of learning, and cross-platform compatibility. |
| **Styling** | CSS | - Use a `styles/` folder split by component (`belt.css`, `hud.css`, `quiz.css`, etc.) rather than one giant stylesheet.<br>- Use CSS Custom Properties (Variables) inside a global `variables.css` file to manage site-wide colour schemes, transition speeds, spacing, and layout dimensions. |
| **Logic** | Vanilla JS (ES modules) | Handles the gameloop, scoring, timer, and module imports without external build tools. |

### Web APIs, Data & Hosting

| Category | Choice | Notes |
|---|---|---|
| **Interactivity** | Pointer Events API | - Replaces HTML5 DnD which lacks touch support.<br>- Pointer Events (`pointerdown`/`pointermove`/`pointerup`) handles mouse + touch with one code path, which matters given the mobile requirement. |
| **Data Storage** | Static JSON files (`data/`) | Local data files (`artefacts.json`, `levels.json`) elimate the need for a backend server. |
| **State Persistence** | In-memory (JS variables/state), reset per level | Progress and settings are only kept for the duration of a level, no browser storage or server-side persistence. |
| **Hosting** | Static hosting (GitHub Pages / Netlify / Vercel) | Plain HTML/CSS/JS easily deploys to any of these. |

## Getting Started

### Prerequisites
- A modern browser
- A local static server (no build step needed). e.g. VS Code's Live Server extension, or:
```bash
npx serve .
```

### Installation
```bash
git clone https://github.com/MQ-PlayThroughHistory-2026/FixTheExhibit.git
cd FixTheExhibit
```

### Running locally
Just open `index.html` via a local server (not `file://`, since ES modules and fetch for JSON data need `http://`):
```bash
npx serve .
```
App runs at `http://localhost:3000` (or whatever port `serve` gives you).

## Project Structure

```
fix-the-exhibit/
├── docs/                         # design docs, client proposal, research protocol
├── assets/                       # artefact images, audio, icons
├── data/
│   └── levels/
│       ├── index.json            # level-select metadata (id, name, description)
│       ├── gold-rush/
│       │   ├── artefacts.json    # the 10 real artefacts for this level
│       │   └── fillers.json      # the 10 filler packages for this level
│       └── ancient-egypt/
│           ├── artefacts.json
│           └── fillers.json
├── js/
│   ├── game/                     # game loop, conveyor belt, scoring, timer, drag interactions
│   ├── ui/                       # display case, rejection bin, HUD rendering
│   ├── quiz/                     # end-of-level quiz logic
│   └── main.js                   # entry point
├── styles/
│   ├── base.css
│   ├── belt.css
│   └── quiz.css
├── index.html
├── README.md                     # you are here
└── CONTRIBUTING.md
```

^Adjust as the project progresses, things change. Just an outline for now. 🚩

## Contributing To This Project

Want to work on this project? Branching model, commit conventions, PR process, and issue tracking all live in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

For design docs, research protocol, and client notes, see [`docs/`](./docs/).

## Project Teams
### Development Team
| Name | Role | Contributions | Related Source Code |
|---|---|---|---|
| [Yuyang Su](https://github.com/VnKnpwN) | Fullstack Dev, Docs | - Authored README.md<br>- Authored CONTRIBUTING.md<br>- Managed Github operations<br> | - **README.md:** `FixTheExhibit/README.md`<br>- **CONTRIBUTING.md:** `FixTheExhibit/CONTRIBUTING.md`<br> |

### Visuals Team
| Name | Role | Contributions | Related Assets |
|---|---|---|---|
| If other teams want to link their portfolios, e.g., your instagram if you're an art guy -> follow Yuyang's name format, but replace the link. 🚩 | Example | Example | - **Cool cat png:** `FixTheExhibit/assets/cat.png`<br> |

### Research Team
| Name | Role | Contributions | Related Research |
|---|---|---|---|
| Example | Example | Example | - `data/levels/ancient-egypt` |

^just follow the table format to add ur contributions. 🚩

## License
*This project is developed for educational purposes as part of the COMP3850 course at Macquarie University (2026).*

© No rights reserved. 

>but really: check with client on IP ownership before adding a license. 🚩
