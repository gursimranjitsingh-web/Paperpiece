# Paperpiece — Feature Ideas & Roadmap

A menu of features that would make the game more fun, sticky, and competitive.
Nothing here is committed — pick what you like and I'll build it.

**Effort key:** 🟢 S = a few hours · 🟡 M = ~a day · 🔴 L = multi-day / architectural.
**Touchpoints** name the real files/systems each idea would plug into.

---

## ✅ Already built (for reference — don't re-propose)

Lobby & rooms, free 360° movement, flood-fill territory capture, collision
(self/enemy-trail, boundary, head-on), respawn, bots, **power-ups**
(Shield/Speed/Freeze/Shrink), **kill/capture juice** (particles + shake),
**chat + emoji**, **sounds** + mute, **avatars** (DiceBear + photo upload),
**board themes**, **territory patterns**, **shapes** (round/square), **spectate**
free-fly camera, **daily missions + battle-pass XP**, **replays**, **public
matchmaking browser**, leaderboards, match history, profiles, minimap, R3F
renderer with bloom, MongoDB + Redis, Docker, deployed on Vercel + Railway.

---

## 1. Gameplay & mechanics

| Idea | What it adds | Effort | Touchpoints |
| --- | --- | --- | --- |
| **More power-ups** | Ghost (pass through trails briefly), Magnet (auto-collect nearby drops), Bomb (clear a radius of enemy territory), Teleport, Invisibility | 🟡 M | `PowerUpType` enum, `MatchSimulation` effects, HUD/board icons |
| **Combo / streak scoring** | Bonus XP + score multiplier for chaining captures or kills without dying | 🟢 S | `MatchSimulation` per-player streak counter, `Score` |
| **Territory decay** | Unclaimed-for-too-long cells slowly revert to neutral — punishes turtling, keeps the map dynamic | 🟡 M | `Grid` timestamps or a decay pass in `tick` |
| **Trail length limit / stamina** | The longer your trail, the riskier (or a stamina bar caps how far you can roam) — encourages bold-but-smart play | 🟢 S | `MatchSimulation.advance` (already has `MAX_TRAIL_LENGTH`) |
| **Speed scales with territory** | Bigger territory = slightly slower (rubber-banding so leaders aren't unstoppable) | 🟢 S | `MatchSimulation` speed calc |
| **Obstacles / walls on the map** | Random impassable rocks or rivers that kill on contact — adds map variety | 🟡 M | `Grid` (a "blocked" layer), `Spawn`, renderer |
| **Capturable objectives / bonus zones** | Timed golden zones worth extra points if you enclose them | 🟡 M | engine spawn logic + scoring |

## 2. Game modes

| Idea | What it adds | Effort | Touchpoints |
| --- | --- | --- | --- |
| **Team mode (2v2 / 3v3)** | Shared team territory + team leaderboard; teammates can't kill each other | 🔴 L | `Player.team`, capture/collision team-aware, lobby team picker, scoring |
| **Time-attack / "most territory in 2 min"** | Already have `matchDurationSeconds` — add a dedicated fast mode preset | 🟢 S | lobby presets, `RoomSettings` |
| **King-of-the-hill** | A central zone; holding it accrues points | 🟡 M | engine zone logic + scoring |
| **Battle royale / shrinking safe zone** | The playable area shrinks over time (you already list "animated safe zone") — outside the ring you take damage/die | 🔴 L | `MatchSimulation` shrinking bounds, renderer ring |
| **Solo practice / vs-bots-only** | Single-player warm-up with adjustable bot difficulty | 🟢 S | lobby "practice" that starts immediately with bots |
| **Quick Play** | One button → auto-join a public room or spin up a bot match (no lobby friction) | 🟡 M | `listPublic` + auto-create fallback |

## 3. Social & multiplayer

| Idea | What it adds | Effort | Touchpoints |
| --- | --- | --- | --- |
| **Friends & invites** | Add friends, see who's online, invite to a room | 🔴 L | new `Friend` model, presence, socket events |
| **Party system** | Stick with the same group across matches | 🟡 M | RoomService "party" grouping |
| **Spectate a live public match** | Watch ongoing games from the browser (you already broadcast snapshots) | 🟡 M | join-as-spectator flow (reuse `request-state`) |
| **In-match voice/quick-pings** | Non-verbal "help!"/"nice!" pings on the minimap | 🟢 S | reuse emoji/socket infra |
| **Report / mute players** | Basic moderation for chat | 🟢 S | client mute list + server rate limits (exist) |

## 4. Progression & retention

| Idea | What it adds | Effort | Touchpoints |
| --- | --- | --- | --- |
| **Achievements** | "First blood", "Capture 1000 cells", "Win 10 games" with badges (model field `achievements` already exists) | 🟡 M | `MatchService` unlock logic, profile UI |
| **Unlockable cosmetics via XP** | Earn new avatars/patterns/themes/trail effects by leveling up | 🟡 M | `User.ownedSkins`, gating in lobby pickers |
| **Weekly missions + seasons** | Longer-horizon goals on top of dailies; seasonal leaderboards that reset | 🟡 M | extend `DAILY_MISSIONS`, seasonal `Leaderboard` |
| **Login streak rewards** | Daily login bonus XP to build habit | 🟢 S | `User` lastLogin + reward on connect |
| **Level-up celebration** | Toast + sound + confetti when you level up | 🟢 S | profile/HUD + existing fx/sound |

## 5. Ranked & competitive

| Idea | What it adds | Effort | Touchpoints |
| --- | --- | --- | --- |
| **True ranked mode + MMR** | Elo/MMR rating, tiers (Bronze→Diamond), rank badges (you have `rankPoints` + `GameMode.Ranked` stubs) | 🔴 L | matchmaking by MMR, `Leaderboard.rankPoints` math |
| **Seasonal ladder + rewards** | Season resets with end-of-season rewards | 🟡 M | seasonal collections |
| **Match MVP / post-game awards** | "Most territory", "Most kills", "Comeback" cards on the results screen | 🟢 S | results overlay + match stats (already tracked) |

## 6. Rendering, feel & audio

| Idea | What it adds | Effort | Touchpoints |
| --- | --- | --- | --- |
| **Trail glow / dashed animated trails** | Animate the neon trail (flowing dashes) for a premium look | 🟢 S | `Trails.tsx` shader/material |
| **Capture "flood" animation** | Territory fills with a sweeping wave when you capture, not instant | 🟡 M | client animate cellDeltas over a few frames |
| **Death explosion + slow-mo** | Bigger particle burst + brief time dilation on your death | 🟢 S | `fx.ts`, `CameraRig` |
| **Dynamic camera zoom** | Zoom out as your territory grows so you keep perspective | 🟢 S | `CameraRig` zoom from territory size |
| **Day/night or animated backgrounds** | Subtle animated board backdrops per theme | 🟢 S | `GameBoard3D` background |
| **More music tracks + SFX variety** | Menu vs in-match music, randomized kill/capture sounds | 🟢 S | `sound.ts` |
| **Screen-reader / colorblind modes** | Colorblind-safe palettes, reduced-motion toggle | 🟡 M | theme + settings |

## 7. UX & quality-of-life

| Idea | What it adds | Effort | Touchpoints |
| --- | --- | --- | --- |
| **Rematch button** | On the results screen, "Play again" resets the room to lobby (you have `returnToLobby` unused) | 🟢 S | wire `returnToLobby` + a socket event |
| **Settings menu** | Master volume slider, control scheme, graphics quality (bloom on/off for low-end) | 🟢 S | a settings store + panel |
| **Tutorial / first-time overlay** | A 3-step "how to play" the first time someone enters a match | 🟢 S | client onboarding overlay |
| **Reconnect-into-match UI** | Show "reconnecting…" and auto-resume (infra exists via `request-state` + grace window) | 🟢 S | client polish |
| **PWA / installable** | Add to home screen, offline shell (manifest already present) | 🟢 S | service worker + icons |
| **Better mobile controls** | Virtual joystick (drag anywhere) instead of the D-pad for smoother mobile steering | 🟡 M | `TouchControls` rewrite |
| **Shareable match result cards** | Generate an image of your result to share | 🟡 M | canvas/OG image |

## 8. Infrastructure, ops & quality

| Idea | What it adds | Effort | Touchpoints |
| --- | --- | --- | --- |
| **GitHub Actions CI** | Typecheck + tests + build on every push/PR before deploy | 🟢 S | `.github/workflows/ci.yml` |
| **Server-authoritative replays (shareable)** | Persist replays to storage + a shareable URL (current replays are local-only) | 🔴 L | delta storage (GridFS/S3), playback route |
| **Anti-cheat hardening + metrics** | Per-player input sanity checks, Prometheus/Grafana dashboards | 🟡 M | server middleware + metrics endpoint |
| **Horizontal scaling test** | Verify the Redis adapter across 2+ server instances | 🟡 M | infra + load test |
| **Load / stress testing** | Simulate 50 players/room to validate perf goals | 🟡 M | k6/artillery script |
| **Sentry error tracking** | Client + server error reporting | 🟢 S | Sentry SDK |
| **E2E test suite (Playwright)** | Automated browser tests of the full lobby→match→result flow | 🟡 M | `apps/web` Playwright |

## 9. Monetization (optional, if you ever want it)

| Idea | Effort | Notes |
| --- | --- | --- |
| **Cosmetic-only store** (skins, trails, themes) | 🟡 M | never pay-to-win; models have `skins`/`cosmetics` fields |
| **Battle-pass premium track** | 🟡 M | free + premium reward tiers |
| **Non-intrusive ads between matches** | 🟢 S | results screen only |

---

## 🎯 My top recommendations (best value-for-effort, in order)

1. **Rematch button** 🟢 — huge QoL, tiny effort; keeps groups playing.
2. **GitHub Actions CI** 🟢 — protects every future deploy for ~an hour of work.
3. **Team mode (2v2/3v3)** 🔴 — the single biggest fun multiplier for playing with friends.
4. **Achievements + XP-unlockable cosmetics** 🟡 — the strongest retention loop, and the model fields already exist.
5. **More power-ups + combo scoring** 🟡 — deepens the core loop cheaply.
6. **Capture flood animation + dynamic zoom** 🟢/🟡 — makes the game *feel* great with modest work.
7. **Settings menu (volume, quality, reduced motion)** 🟢 — expected polish; also helps low-end devices.
8. **Quick Play button** 🟡 — removes lobby friction for solo players (great for growth).
9. **True ranked mode + MMR** 🔴 — the long-term competitive hook once you have players.

> Suggested first batch: **Rematch + CI + Settings menu + more power-ups** (all quick, high-impact),
> then commit to **Team mode** or **Ranked** as the next "big" feature.
