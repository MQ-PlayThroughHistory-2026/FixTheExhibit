# Kiosk Mode Launcher

`start-game.bat` opens **Fix the Exhibit** in a locked-down, fullscreen Chrome window for use on a museum touchscreen. Visitors see only the game: no address bar, tabs or browser menus.

This is the recommended way to run the game in a museum. See Section 4.4 of the Help/Training Document for the full walkthrough.

## What it does

| Part of the script | Purpose |
|---|---|
| `--kiosk` | Runs Chrome fullscreen with no address bar, tabs or menus. |
| `?kiosk` on the game URL | Tells the game to remove its own staff-exit gear icon and passphrase box. Chrome offers to save typed passwords, and that pop-up could give a visitor a way into the operating system. |
| `--no-first-run` | Skips Chrome's welcome and setup screens. |
| `--user-data-dir=...\FixTheExhibitKiosk` | Uses a separate Chrome profile, so a fresh kiosk window opens even if Chrome is already running. It also keeps kiosk settings apart from the normal browser. |

Kiosk mode also stays fullscreen through the game's inactivity reset (after 3 minutes with no touch, a 60-second warning, then a reload to the title screen). In a normal browser window the reload can drop out of fullscreen.

## Before you use it

**1. Replace the game address.** The file points at the development team's GitHub Pages site:

```
https://mq-playthroughhistory-2026.github.io/FixTheExhibit/?kiosk
```

Replace everything before `?kiosk` with the museum's own address (see Help/Training Document Section 4.3, "Hosting on GitHub Pages"). Keep `?kiosk` on the end.

**2. Requirements**

- Windows
- Google Chrome installed
- An internet connection (the game is loaded from GitHub Pages). For an offline kiosk see "Running without internet" below.

## Using it

1. Copy `start-game.bat` somewhere permanent on the kiosk, for example `C:\FixTheExhibit\`.
2. Double-click it. The game opens fullscreen.
3. **To exit,** press **Alt + F4**. There is no on-screen exit in kiosk mode.

The first launch creates a profile folder at `C:\Users\<user>\AppData\Local\FixTheExhibitKiosk`. This is expected and safe to leave in place.

### Start automatically when the kiosk is switched on

1. Press **Windows + R**, type `shell:startup` and press Enter.
2. Put a **shortcut** to `start-game.bat` in the folder that opens.

## Using Microsoft Edge instead

Replace the last line of the file with:

```bat
start "" msedge --kiosk "%GAME_URL%" --edge-kiosk-type=fullscreen --no-first-run
```

Edge uses its own profile handling, so the `--user-data-dir` option is not needed.

## Running without internet

If the venue cannot guarantee reliable internet, run a local copy of the game instead. Help/Training Document Section 4.5 has a variant of this script that first starts a small local web server and then opens `http://localhost:8000/?kiosk`. Content changes then have to be copied onto each kiosk by hand.

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| Chrome says "This site can't be reached" | No internet, or the address in `GAME_URL` is wrong. Check the connection and the address. |
| The script window flashes and nothing opens | Chrome is not installed, or not registered with Windows. Install Google Chrome. |
| The staff-exit gear shows on the title screen | `?kiosk` is missing from the end of `GAME_URL`. Add it. |
| Can't leave the game | Press **Alt + F4**. |
| An iPad is being used | Windows scripts don't apply. Use **Guided Access** (Settings, Accessibility, Guided Access). See Help/Training Document Section 4.6. |

## Security note
Kiosk mode stops visitors reaching the address bar and browser menus, but it is not a full lock-down. For a dedicated device that must be fully locked, use Windows **Assigned Access** (Help/Training Document Section 4.6).