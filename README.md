# ChronoSlab 3D — Minimalist Desktop Productivity Overlay & Time-Block HUD

A lightweight, frameless, always-on-top desktop widget combining a 3D extruded geometric clock, an interactive time-blocking calendar, and a routine-bound to-do list with tactile claymorphic surfaces and procedural Web Audio sound effects.

## Quick Start

### 1. Run Interactive HUD Preview (Vite + React + Tailwind)
```powershell
cd C:\Users\syeds\.gemini\antigravity\scratch\timeblock-hud
npm.cmd run dev
```
Open `http://localhost:1420` in your browser.

### 2. Run Native Frameless Desktop Overlay (Tauri v2 + Rust)
```powershell
cd C:\Users\syeds\.gemini\antigravity\scratch\timeblock-hud
npx.cmd @tauri-apps/cli dev
```

## Key Shortcuts & Interactions
- **`Ctrl + Shift + G`**: Toggle **Ghost / Click-Through Mode** (`set_ignore_cursor_events` in Tauri / pointer pass-through in web preview).
- **Top Grip Bar**: Drag anywhere on the top recessed bar to reposition the frameless HUD.
- **Routine Binding**: Drag any task card from the To-Do drawer and drop it directly onto a 3D calendar pill slot, or bind via the slot selector.
