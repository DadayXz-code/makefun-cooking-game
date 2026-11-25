# makefun-cooking-game

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/DadayXz-code/makefun-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/DadayXz-code/makefun-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Dapur Kilat** — a fast, original cooking game built for the make.fun "Make the best cooking game" bounty. Run the busiest kitchen in town: tickets keep coming in, so chop and sizzle ingredients on the prep board, stack them on the serving plate, and serve each dish before the customer's patience runs out. Fast serves pay a patience bonus, back-to-back serves build a combo multiplier, and every four dishes served raises the level — new recipes, faster tickets, and a Service Rush in the last 30 seconds of the 150-second shift. Lose all three hearts and the shift ends early.

Everything is original and drawn in code: six Indonesian street-food dishes (Nasi Goreng Kilat, Mie Ayam Spesial, Sate Ayam Bakar, Nasi Ayam Geprek, Mie Goreng Telur, Sayur Telur Sehat), vector food art on a single canvas, and WebAudio-synthesised sounds and music — no images, no audio files, no network requests. Play with mouse or keyboard (1-6 for ingredients, Space to plate, Enter to serve, T to trash, P to pause, M to mute).

## Run it

```sh
python3 -m http.server 8080 --directory game
```

Then open http://localhost:8080 in a desktop browser. No build step, no install.

## How to play

| Action | Mouse | Keyboard |
| --- | --- | --- |
| Send an ingredient to the prep board | Click its bin | `1`–`6` |
| Move a finished ingredient to the plate | Click the ready slot | `Space` |
| Serve the plate | Click **SAJIKAN** | `Enter` |
| Throw the plate away | Click **BUANG** | `T` |
| Pause / resume | Click ⏸ | `P` |
| Mute / unmute | Click 🔊 | `M` |

Serve a dish exactly as its ticket shows — extra or missing ingredients spoil the order. A ticket's patience bar drains while you cook; serve fast for a bonus, chain serves for a combo multiplier, and watch the last 30 seconds: the Service Rush brings tickets in faster.

---

<sub>Entered on [make.fun](https://make.fun/?ref=c1yxpfdh&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
