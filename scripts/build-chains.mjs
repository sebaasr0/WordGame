/**
 * Builds the puzzle data for WordGame from data/engwords.txt.
 *
 * A chain is six words of length 3,4,5,6,7,8 where each word's letters are a
 * multiset subset of the next word's letters, with exactly one letter added
 * each step. That is the rule from the board: every correct word's letters
 * carry into the next round, plus one new letter, plus three distractors.
 *
 * Run with:  npm run chains
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIN_LEN = 3;
const MAX_LEN = 8;
const DISTRACTORS = 3;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/** Deterministic PRNG so regenerating the file produces identical output. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260820);

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Canonical form of a word: its letters sorted. Anagrams share a key. */
const keyOf = (w) => [...w].sort().join("");

// ---------------------------------------------------------------------------
// 1. Load the dictionary
// ---------------------------------------------------------------------------

const raw = readFileSync(join(ROOT, "data", "engwords.txt"), "utf8");
const words = new Set();
for (const line of raw.split(/\r?\n/)) {
  const w = line.trim().toLowerCase();
  if (w.length < MIN_LEN || w.length > MAX_LEN) continue;
  if (!/^[a-z]+$/.test(w)) continue;
  words.add(w);
}
console.log(`dictionary: ${words.size} words of length ${MIN_LEN}-${MAX_LEN}`);

/** key -> the words that spell it (anagrams) */
const byKey = new Map();
for (const w of words) {
  const k = keyOf(w);
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(w);
}
for (const list of byKey.values()) list.sort();

// ---------------------------------------------------------------------------
// 2. Build the "add one letter" graph over canonical keys
// ---------------------------------------------------------------------------

/** key -> keys one letter longer that contain it */
const children = new Map();
for (const k of byKey.keys()) {
  if (k.length >= MAX_LEN) continue;
  const kids = [];
  for (const c of ALPHABET) {
    const nk = keyOf(k + c);
    if (byKey.has(nk)) kids.push(nk);
  }
  if (kids.length) children.set(k, kids);
}

/** Deepest length reachable from a key by repeatedly adding one letter. */
const depthMemo = new Map();
function depth(k) {
  const hit = depthMemo.get(k);
  if (hit !== undefined) return hit;
  if (k.length >= MAX_LEN) {
    depthMemo.set(k, MAX_LEN);
    return MAX_LEN;
  }
  let best = k.length;
  for (const c of children.get(k) ?? []) best = Math.max(best, depth(c));
  depthMemo.set(k, best);
  return best;
}

// ---------------------------------------------------------------------------
// 3. Collect every 3-letter seed that reaches 8 letters, and build its chain
// ---------------------------------------------------------------------------

/**
 * Walk from a seed to length 8, always stepping into a child that can still
 * reach the end. Among those, prefer the child with the most onward options —
 * it tends to land on ordinary words rather than dead-end oddities.
 */
function buildChain(seed) {
  const keys = [seed];
  let k = seed;
  while (k.length < MAX_LEN) {
    const viable = (children.get(k) ?? []).filter((c) => depth(c) === MAX_LEN);
    if (!viable.length) return null;
    viable.sort((a, b) => {
      const optionsA = (children.get(a) ?? []).length + byKey.get(a).length;
      const optionsB = (children.get(b) ?? []).length + byKey.get(b).length;
      if (optionsB !== optionsA) return optionsB - optionsA;
      return a < b ? -1 : 1;
    });
    k = viable[0];
    keys.push(k);
  }
  return keys.map((key) => byKey.get(key)[0]);
}

const seeds = [...byKey.keys()].filter((k) => k.length === MIN_LEN && depth(k) === MAX_LEN);
seeds.sort();
console.log(`seeds with a full ${MIN_LEN}->${MAX_LEN} chain: ${seeds.length}`);

// ---------------------------------------------------------------------------
// 4. Turn each chain into playable levels (answer + distractor letters + pool)
// ---------------------------------------------------------------------------

/**
 * Three distractors per level, drawn from letters not used by the answer so a
 * distractor can never masquerade as a missing copy of a real letter.
 */
function distractorsFor(answer) {
  const used = new Set(answer);
  const available = [...ALPHABET].filter((c) => !used.has(c));
  const out = [];
  while (out.length < DISTRACTORS && available.length) {
    const i = Math.floor(rand() * available.length);
    out.push(available.splice(i, 1)[0]);
  }
  return out;
}

const chains = [];
for (const seed of seeds) {
  const chainWords = buildChain(seed);
  if (!chainWords) continue;

  const levels = chainWords.map((answer, i) => {
    const distractors = distractorsFor(answer);
    // Letters kept from the previous answer — the board drew these highlighted.
    const carried = i === 0 ? [] : [...chainWords[i - 1]].sort();
    return {
      answer,
      distractors,
      carried,
      pool: shuffle([...answer, ...distractors]),
    };
  });

  chains.push({ id: chains.length, words: chainWords, levels });
}

for (const c of chains.slice(0, 5)) {
  console.log(`  ${c.words.map((w) => w.toUpperCase()).join(" -> ")}`);
}

const out = { generated: chains.length, minLen: MIN_LEN, maxLen: MAX_LEN, distractors: DISTRACTORS, chains };
writeFileSync(join(ROOT, "lib", "chains.json"), JSON.stringify(out));
console.log(`wrote lib/chains.json with ${chains.length} chains`);
