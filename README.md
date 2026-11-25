# Copper Pot Kitchen

[![make.fun bounty](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![make.fun rank](https://make.fun/badge/best-cooking-game-20261125-0137/zws0a929/best-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![make.fun reward](https://make.fun/badge/best-cooking-game-20261125-0137/zws0a929/best-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

A tiny restaurant, a very busy shift. **Copper Pot Kitchen** is an original
2D cooking game that runs entirely offline in a desktop browser: no build
step, no libraries, no network requests, just static files under `game/`.

Built for the [make.fun best cooking game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) — my referral link is
[https://make.fun?ref=81228bnq](https://make.fun?ref=81228bnq) (referral code `81228bnq`).

## How to play

Serve `node serve.ts`, open http://localhost:8080, and press Enter.

- **Walk** with WASD or the arrow keys, or click anywhere on the floor.
- **Use a station** with E (or Space), or click the station to walk to it
  and use it on arrival.
- **M** mutes the music and sound effects.

## The shift

Orders land on the board at the top, each with a patience timer. Work the
kitchen to fill them before the customer walks out:

1. **Grab ingredients** from the crates along the top — tomato, lettuce,
   onion, cheese, bun, patty.
2. **Chop** tomato, lettuce and onion on the chopping board (hold still
   while the knife works).
3. **Cook** patties on the stove — take them off when the bar turns green,
   or they burn. Chopped tomato + chopped onion together make a pot of
   tomato soup on a burner.
4. **Plate** the dish on the assembly counter, then **serve** it the moment
   it matches an order.

Serve fast for tips, chain serves for a combo bonus, and watch the clock:
the shift lasts 2 minutes 30 seconds, orders arrive faster as it goes on,
and three walkouts end your shift early.

## Recipes

| Dish | Needs |
| --- | --- |
| Garden Salad | chopped tomato + chopped lettuce |
| Copper Burger | bun + cooked patty + chopped lettuce |
| Cheesy Melt | bun + cooked patty + cheese |
| Tomato Soup | chopped tomato + chopped onion, cooked in a pot |

## Files

- `game/` — the game itself: `index.html` plus ES modules under `game/src/`
  (`config.js` — constants, recipes and layout; `random.js` — the seeded
  generator; `world.js` — orders, stations and rules; `render.js` — all
  canvas drawing; `input.js` — keyboard and mouse; `audio.js` — WebAudio
  sounds synthesised from scratch; `shots.js` — deterministic screenshot
  staging; `main.js` — boot and game loop).
- `screenshots/` — four real renders of the game, taken in headless Chrome
  from the `?shot=` scenes (`shots.json` lists them).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with `vendor/makefun-game.ts`.
- `serve.ts` — a tiny static server for local play-testing.

Screenshots are deterministic: `?shot=start|play|serve|end&seed=N` replays
the same seeded world through the real rules, so the same seed always
produces the same frame.

## License

MIT — see [LICENSE](LICENSE).
