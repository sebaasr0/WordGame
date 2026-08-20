# WordGame

A word-chain game. You solve six words in a row, from three letters up to eight.
Every letter of a correct word carries into the next round, joined by exactly one
new letter and three distractors — so the board grows by one box each round while
the puzzle keeps getting harder.

```
round 1   L I E          pool: C E L A I W
round 2   T I L E        pool: L I E + T + Q Y F
round 3   T I L E R      pool: T I L E + R + A O D
...
round 6   ........       eight boxes
```

Carried letters are tinted; the new letter and the distractors are both gray, so
you cannot tell them apart. Several pool letters may spell other real words —
only the one word in the chain is accepted.

## Hints

Three hints for the whole game, not per round. They are always spent in this order:

1. Remove one distractor from the current pool
2. Reveal the first letter
3. Reveal the second letter

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## The word list

`data/engwords.txt` is the provided dictionary — 42,405 English words. Filtered to
words of 3–8 letters with only the letters a–z, that leaves 24,024 usable words.

`npm run chains` reads that file and writes `lib/chains.json`. It treats each word
as its sorted letters, so anagrams collapse to one node, then links every node to
the nodes one letter longer that contain it. Walking that graph from length 3 to
length 8 gives a playable chain; there are **300** three-letter words that reach
eight letters in this dictionary.

The generator is seeded, so regenerating produces the same file. `npm run build`
regenerates it before building.

Note that the board's example chain stops at `TILER` — `tilers` is not in this
dictionary, so that particular chain cannot reach eight letters. The generator
only keeps chains that go all the way.

## Layout

```
app/page.tsx            game state, keyboard input, hint logic
components/Board.tsx    the answer boxes
components/LetterPool.tsx  the tray of available letters
components/HintBar.tsx  the hint button
lib/game.ts             types and helpers over the generated data
lib/chains.json         generated puzzle data
scripts/build-chains.mjs  the generator
data/engwords.txt       source dictionary
```

## Controls

Click letters or type them. Backspace clears the last letter you placed.

There is no submit step — the word is judged the moment the last box is filled.
A correct word advances to the next round on its own; a wrong one shakes and
waits for you to change a letter.
