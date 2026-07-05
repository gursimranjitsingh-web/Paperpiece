# Sound effects

Drop MP3 files with these **exact names** into this folder (`apps/web/public/sounds/`).
The game plays them by name; any that are missing simply stay silent — nothing
breaks. All sources below are free for commercial use (CC0 / royalty-free).

| File | When it plays | Suggested search |
| --- | --- | --- |
| `capture.mp3` | You capture territory | "success chime" / "collect" — Mixkit, Pixabay |
| `kill.mp3` | You eliminate a rival | "hit" / "slash" / "zap" — Kenney Digital Audio |
| `death.mp3` | You die | "game over" / "explosion soft" — Mixkit |
| `start.mp3` | Match begins | "level start" / "whoosh" — Pixabay |
| `countdown.mp3` | Each countdown tick | "beep" / "tick" — Kenney Interface |
| `win.mp3` | Match ends | "win jingle" / "fanfare" — Mixkit |
| `powerup.mp3` | You collect a power-up | "power up" / "pickup" — Kenney Digital Audio |
| `click.mp3` | UI clicks (optional) | "ui click" — Kenney Interface |
| `music.mp3` | Background loop during a match | "ambient loop" / "chiptune loop" — Pixabay, incompetech.com |

## Where to download (free, no attribution required for most)

- **Mixkit** — https://mixkit.co/free-sound-effects/ (game + UI categories)
- **Pixabay Sound Effects** — https://pixabay.com/sound-effects/ (search "game", "loop")
- **Kenney** (CC0 game audio packs) — https://kenney.nl/assets/interface-sounds and https://kenney.nl/assets/digital-audio
- **Freesound** — https://freesound.org/ (filter License → "Creative Commons 0")
- **Incompetech** (background music, CC-BY) — https://incompetech.com/music/royalty-free/

## Tips
- Keep SFX short (< 1s) and small (< 100 KB) for snappy playback.
- Keep `music.mp3` a seamless loop; ~0.25 volume is applied in code.
- If a file is a `.wav`/`.ogg`, convert to `.mp3` (or rename the paths in
  `apps/web/src/lib/sound.ts`).
