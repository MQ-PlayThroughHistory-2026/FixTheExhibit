> Flag anything still open. 🚩

>Insert Team name/logo or Fix The Exhibit in cool font (replacing the title) to make it look more professional. e.g. `<img src="assets/logo.png" style="width:1000px;"/>`


# Fix The Exhibit

An interactive browser-based sorting game where players take on the role of a museum curator, racing against the clock to correctly sort genuine historical artefacts from a conveyor belt of pop-culture fakes while learning the real history behind each object.

**Live demo:** [link once deployed] 🚩
<br>**Status:** In development 🚩

---

## Table of Contents
- [Overview](#overview)
- [Core Gameplay](#core-gameplay)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Team](#team)
- [License](#license)

---

## Overview

*Fix the Exhibit* evaluates how well video game and pop-culture depictions of historical artefacts hold up against the real thing. 
Players sort through a stream of objects (some genuine museum pieces, some pop-culture props) into a correct display case or a rejection bin, receiving instant micro-feedback explaining the real history behind each item.

The project doubles as a lightweight research tool; pre- and post-game mini-quizzes measure whether play improves players' ability to distinguish historical fact from fiction.

## Core Gameplay

- **Conveyor belt sorting:** items move across the screen; players drag-and-drop (or swipe on mobile) genuine artefacts into the display case and pop-culture fakes into the rejection bin.
- **Timer + scoring:** speed and accuracy affect score; mistakes cost time or points (TBD). 🚩
- **Micro-feedback:** each sort triggers a short explanation of the real object's history.
- **Levels/themes:** distinct historical eras or exhibits (e.g. Mesozoic Era, 1850s Gold Rush, Ancient Egypt) TBD. 🚩
- **Pre/post quiz:** short quiz before and after play to capture learning outcomes for research purposes. (TBD/Stretch Goal) 🚩
- **End-of-level reward:** score/leaderboard entry, and/or a printable "certificate" of a correctly sorted artefact. (TBD/Stretch Goal) 🚩

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
| **Data Storage** | Static JSON files (`src/data/`) | Local data files (`artefacts.json`, `levels.json`) elimate the need for a backend server. |
| **State Persistence** | `localStorage` | Local storage for single-device sessions. Upgrade to Firebase/Supabase if cross-device leaderboards are needed. |
| **Hosting** | Static hosting (GitHub Pages / Netlify / Vercel) | Plain HTML/CSS/JS easily deploys to any of these. |
| **Analytics** | Static JS/JSON + simple submission endpoint or export | Handles quiz responses. Needs to comply with research ethics requirements. 🚩 |

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
├── docs/                  # design docs, client proposal, research protocol
├── assets/                # artefact images, audio, icons
├── data/                  # artefacts.json, levels.json
├── js/
│   ├── game/              # game loop, conveyor belt, scoring, timer
│   ├── ui/                # display case, rejection bin, HUD rendering
│   ├── quiz/              # pre/post quiz logic
│   └── main.js            # entry point
├── styles/
│   ├── base.css
│   ├── belt.css
│   └── quiz.css
├── index.html
├── README.md              # you are here
└── CONTRIBUTING.md
```

^Adjust as the project progresses, things change. Just an outline for now. 🚩

## Development Workflow

- **Branching:** `main` is always demo-stable. Work happens on feature branches (`feature/conveyor-belt`, `fix/timer-bug`), merged via Pull Requests.
- **Commits:** concise, present-tense, following Conventional Commits (`feat: add rejection bin drag logic`).
- **Issues/board:** For issue tracking; https://github.com/MQ-PlayThroughHistory-2026/FixTheExhibit/issues. A private Trello board was used by the team during development.
- **Weekly check-ins:** Thursdays and/or Sundays during Zoom Team Meetings.

See `CONTRIBUTING.md` for details.

## Team
### Development Team
| Name | Role | Contributions | Related Source Code |
|---|---|---|---|
| [Yuyang Su](https://github.com/VnKnpwN) | Fullstack Dev, Docs | - Authored README.md<br>- Managed Github org<br> | - **README.md:** `FixTheExhibit/README.md`<br> |

### Visuals Team
| Name | Role | Contributions | Related Assets |
|---|---|---|---|
| If other teams want to link their portfolios, e.g., your instagram if you're an art guy -> follow Yuyang's name format, but replace the link. | Example | Exammple | - **Cool cat png:** `FixTheExhibit/assets/cat.png`<br> |

### Research Team
| Name | Role | Contributions | Related (?) |
|---|---|---|---|
| Example | Example | Exammple | Not sure what you'd put here, but if you guys at R-Team can think of anything feel free to add or change things around in this doc & repo architecture. |

^just follow the table format to add ur contributions. 🚩

## License
*This project is developed for educational purposes as part of the COMP3850 course at Macquarie University (2026).*

© No rights reserved. 

>but really: check with client on IP ownership before adding a license. 🚩
