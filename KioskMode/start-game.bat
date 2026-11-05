@echo off
set GAME_URL=https://mq-playthroughhistory-2026.github.io/FixTheExhibit/?kiosk
start "" chrome --kiosk --no-first-run --user-data-dir="%LOCALAPPDATA%\FixTheExhibitKiosk" "%GAME_URL%"