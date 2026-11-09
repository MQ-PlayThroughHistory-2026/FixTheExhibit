# Fix The Exhibit

A browser game where you're the new intern at a museum, and the artefact's shipping labels got mixed up. Sort real artefacts from the fakes before the delivery driver leaves, then build the exhibit and see how much history you picked up along the way.

*This project was developed for educational purposes as part of the COMP3850 course at Macquarie University (2026).*

**Live demo:** https://mq-playthroughhistory-2026.github.io/FixTheExhibit/
<br>**Status:** Closed

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

The game covers two levels, the Australian gold rush and ancient Egypt, each built around ten genuine artefacts and ten filler packages from other eras. Players sort incoming packages under a timer, then take their time arranging the correct artefacts into a display case, reading a short blurb about each one. A quiz at the end checks what players remember, then sorting timing and accuracy, arrangement accuracy, and quiz results combine to give players one of five ranks ranging from Curious Visitor to Master Historian.

## Core Gameplay

- **Conveyor belt sorting:** packages move across the screen under a countdown timer; players drag-and-drop each one into the display case or storage vault, judging whether it belongs to the level's time period. Correct and incorrect sorts each get a quick audio-visual response and a short fun fact. The timer is paused while fun fact cards are opened, so learning is not rushed.
- **Sorting timer:** if the timer runs out before all packages are sorted, the level restarts. Mistakes don't cost time or end the level, they only affect the final rank.
- **Artefact arranging:** placing an artefact in it's correct place reveals three cards with information about the artefact, and a fourth card that presents players with a QR code that links to further information.
- **End-of-level quiz:** players answer one multiple-choice question per artefact, after all artefacts have been arranged. Results are shown to the player immediately.
- **Difficulty levels:** players can choose to play in easy or hard mode. Easy mode has a longer sorting timer and slower conveyer belt, guides artefact arranging through silhouettes, and has simpler quiz questions. Hard mode has a shorter sorting timer and faster conveyer belt, guides artefact arranging through written clues, and has trickier quiz questions.
- **Ranked titles:** sorting speed and accuracy, arrangement accuracy, and quiz accuracy combine into a score, presented as a named title and numeric score. Cut-offs for each title differ by difficulty mode. Scores and titles are not stored.
- **Levels/themes:** the game contains two levels at launch - Australian gold rush and ancient Egypt. The codebase is structured so museums can add further levels and/or artefacts later.

## MVP Implementation Summary
### The current MVP includes:
**General**
- *Two levels of content* - Complete content for an Australian gold rush level and an ancient Egypt level. Each level includes a total of:
  - 20 package/artefact images
  - 40 fun facts
  - 10 clues
  - 10 QR codes
  - 30 paragraphs of information (80-100 words)
  - 20 quiz questions
- *Touch and mouse input* - Both input types are supported in this game.
- *Drag & drop mechanic* - The sorting and arranging stages both use drag and drop controls to move packages/artefacts through the scene.
- *Menus* - The game begins on a main menu which leads to a level select menu, then a difficult select menu before the game begins. All stages in the game contain a pause/settings button that allows players to adjust audio settings, restart the stage, or quit to the main menu.
- *Audio settings* - Available on all screens as part of the pause/settings menu. Allows players to independently control the volume for background music, sound effects, and text-to-speech.
- *Instructions* - General instructions appear at the start of the game, and further stage-specific instructions appear at the start of each stage. These instructions only appear once per play.
- *Text-to-speech functionality* - Optional functionality is available on all menus, instruction cards, and information/fun fact cards. Where available, an audio button will appear in the top right corner of the menu/card, which serves to both start and stop text-to-speech functionality.
- *Kiosk mode* - Interacting with the game will enter fullscreen mode, used to mimic kiosk functionality in museums. On kiosk devices, the only way to exit fullscreen mode is by clicking the staff exit button and entering the correct passphrase.
- *Credits page* - The main menu includes a button in the bottom left corner that displays a credits page, which credit the creators and any external resources used in the project.
**Sorting Stage**
- *Conveyor belt* - Moves packages across screen.
- *Timer* - Counts down to 0, at which point the stage ends and players must choose to either restart the stage or quit to the main menu. Timer length is calculated based on the number of packages, with different calculations for hard and easy mode.
- *Drop zones* - Players pick up packages from the conveyer belt and drop them into either the display case or storage vault.
- *Sorting feedback* - When a package is sorted, the drop zone shows either a green or red outline to indicate whether the sort was correct, and the accompanying correct/incorrect sound effect is played. A card then pops up, which also indicates whether the player sorted the package correctly and provides a fun fact about the item. The timer is paused while the card is opened, and resume when the player closes the card.
**Arranging Stage**
- *Silhouettes* - In easy mode, silhouettes of each artefact indicate where they should be placed.
- *Clues* - In hard mode, clue cards are placed where each artefact should go. Clicking on the clue card will reveal a written clue that will help players determine which artefact goes in which spot.
- *Information* - When an artefact is correctly arranged, a set of cards appear with information about the artefact. There are a total of four cards - three with paragraphs of information about the artefact, and a fourth which contains a QR code linking to the primary source of information for each artefact. Players can reopen information cards after they have been closed, though the stage ends after the information cards for the last artefact close.
**Quiz Stage**
- *Quiz Questions* - Quiz questions appear one at a time, showing the question and four possible answers. Players click the answer they believe is correct, and are provided with immediate feedback about which answer was correct and whether they made the right choice.
**Results**
- *Certificate* - After the quiz is complete, players are shown a certificate indicating their rank and score out of 100. They can then choose to restart the level or return to the main menu.
- *Score* - Player scores are based on their performance in each stage. The sorting stage accounts for 30% of the score, the arranging stage accounts for 20% of the score, and the quiz stage accounts for the final 50% of the score.
- *Ranks* - Players receive one of five ranks based on their score, ranging from *Curious Visitor* to *Master Historian*. The score cutoffs differ in each difficulty, so the highest rank is achievable for all players in easy mode.

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
├── KioskMode/
│   ├── README.md
│   └── start-game.bat
├── assets/
│   ├── ancient-egypt/
│   │   ├── artefacts/
│   │   │   └── *.avif                # images
│   │   ├── fillers/
│   │   │   └── *.avif
│   │   └── qr-code/
│   │       └── *.png                 # images
│   ├── arrange-scene/
│   │   └── *.avif
│   ├── gold-rush/
│   │   ├── artefacts/
│   │   │   └── *.avif
│   │   ├── fillers/
│   │   │   └── *.avif
│   │   └── qr-code/
│   │       └── *.png
│   ├── sort-scene/
│   │   ├── conveyer belt.webm
│   │   ├── dropshadow.png
│   │   └── *.avif
│   ├── sounds/
│   │   ├── background-music/
│   │   │   └── bgm.mp3
│   │   └── effects/
│   │       └── *.mp3                 # audio files
│   └── ui/
│       └── *.avif
├── data/
│   └── levels/
│       ├── index.json                # level-select metadata (id, name, time, description)
│       ├── gold-rush/
│       │   ├── artefacts.json        # information about 10 real artefacts for this level
│       │   └── fillers.json          # information about 10 filler packages for this level
│       └── ancient-egypt/
│           ├── artefacts.json
│           └── fillers.json
├── docs/
│   └── User Manual.pdf
├── js/
│   ├── game/
│   │   └── *.js                      # game loop, conveyer belt, scoring, timer, drag interactions
│   ├── quiz/
│   │   └── *.js                      # end-of-level quiz logic
│   ├── ui/
│   │   └── *.js                      # display case, storage vault, HUD rendering, audio, tutorials
│   └── main.js                       # entry point
├── styles/
│   └── *.css                         # styling
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
├── README.md                         # you are here
└── index.html

```

## Contributing To This Project

Want to work on this project? Branching model, commit conventions, PR process, and issue tracking all live in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

For design docs, research protocol, and client notes, see [`docs/`](./docs/).

## Project Teams
### Development Team
| Name | Role | Contributions | Related Source Code |
|---|---|---|---|
| [Yuyang Su](https://github.com/VnKnpwN) | Fullstack Dev, Docs | - Authored README.md<br>- Authored CONTRIBUTING.md<br>- Managed Github operations<br> | - **README.md:** `FixTheExhibit/README.md`<br>- **CONTRIBUTING.md:** `FixTheExhibit/CONTRIBUTING.md`<br> |
| Arjun Gupta<br>[GitHub](https://github.com/Arjung952) · [LinkedIn](https://www.linkedin.com/in/YOUR-HANDLE) | Developer, QA Tester | - Developed the sorting stage and conveyor belt<br>- Developed the end-of-level quiz<br>- Developed the credits page<br>- Tested the game across desktop, tablet and mobile<br>- Co-authored the user manual<br>- Reviewed and merged pull requests<br> | - **Sorting** `FixTheExhibit/js/game/sorting.js`<br>- **Conveyor belt** `FixTheExhibit/js/game/belt.js`<br>- **Quiz** `FixTheExhibit/js/quiz/`<br>- **Credits** `FixTheExhibit/styles/credits.css`<br> |

### Visuals Team
| Name | Role | Contributions | Related Assets |
|---|---|---|---|
| If other teams want to link their portfolios, e.g., your instagram if you're an art guy -> follow Yuyang's name format, but replace the link. 🚩 | Example | Example | - **Cool cat png:** `FixTheExhibit/assets/cat.png`<br> |
| Nathan Wu | UI/UX Designer, Visual Assets | - Designed UI mockups and interface layouts for the game.<br>- Created visual designs for the main menu and gameplay interfaces.<br>- Designed UI elements, including buttons, backgrounds, title boxes and HUD components.<br>- Created designs for the quiz interface, audio settings and historical information cards.<br>- Documented UI designs and mockups for the project documentation. | - **UI image assets, including those for the main menu, audio settings, timer, quiz, and information cards** `FixTheExhibit/assets/ui/*.avif`|

### Research Team
| Name | Role | Contributions | Related Research |
|---|---|---|---|
| [Samantha Hamilton](https://linktr.ee/SamanthaHamilton2) | Research, Content Development, Project Manager | - Researched artefacts and filler objects for both levels.<br>- Developed and implemented written game content.<br>- Reviewed all work to ensure consistency.<br>- Organised meetings and task assignments.<br>- Co-authored documentation. | - **Ancient Egypt artefacts:** `data/levels/ancient-egypt/artefacts.json`<br>- **Ancient Egypt fillers:** `data/levels/ancient-egypt/fillers.json`<br>- **Australian Gold Rush artefacts:** `data/levels/gold-rush/artefacts.json`<br>- **Australian Gold Rush fillers:** `data/levels/gold-rush/fillers.json`<br>- **Historical reference QR codes:** `assets/ancient-egypt/qr-code/`, `assets/gold-rush/qr-code/`<br> |
| Cody Huang | Research, Content Development | - Researched historical artefacts for the Ancient Egypt and Australian Gold Rush levels.<br>- Wrote historical blurbs and detailed artefact information for educational content cards.<br>- Created fun facts for historical artefacts and filler objects.<br>- Developed easy and hard multiple-choice quiz questions for artefacts.<br>- Wrote clues to help players identify artefact placements during the arranging stage.<br>- Sourced historical references and generated QR codes for further reading.<br> | - **Ancient Egypt artefacts:** `data/levels/ancient-egypt/artefacts.json`<br>- **Ancient Egypt fillers:** `data/levels/ancient-egypt/fillers.json`<br>- **Australian Gold Rush artefacts:** `data/levels/gold-rush/artefacts.json`<br>- **Australian Gold Rush fillers:** `data/levels/gold-rush/fillers.json`<br>- **Historical reference QR codes:** `assets/ancient-egypt/qr-code/`, `assets/gold-rush/qr-code/`<br> |

^just follow the table format to add ur contributions. 🚩

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
