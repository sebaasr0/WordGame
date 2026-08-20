/**
 * Checks lib/chains.json against data/engwords.txt and the rules of the game.
 * Run with:  npm run verify
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const dict = new Set(
  readFileSync(join(ROOT, "data", "engwords.txt"), "utf8")
    .split(/\r?\n/)
    .map((w) => w.trim().toLowerCase())
);

const data = JSON.parse(readFileSync(join(ROOT, "lib", "chains.json"), "utf8"));
const { minLen, maxLen, distractors: DISTRACTORS, chains } = data;

const counts = (w) => {
  const m = new Map();
  for (const c of w) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
};

const failures = [];
const fail = (chain, msg) => failures.push(`chain ${chain.id} [${chain.words.join(" -> ")}]: ${msg}`);

for (const chain of chains) {
  const rounds = maxLen - minLen + 1;

  if (chain.words.length !== rounds) fail(chain, `has ${chain.words.length} words, expected ${rounds}`);
  if (chain.levels.length !== rounds) fail(chain, `has ${chain.levels.length} levels, expected ${rounds}`);

  chain.words.forEach((word, i) => {
    if (word.length !== minLen + i) fail(chain, `"${word}" should be ${minLen + i} letters`);
    if (!dict.has(word)) fail(chain, `"${word}" is not in engwords.txt`);

    // Each word's letters must be contained in the next word, plus one new letter.
    if (i > 0) {
      const prev = counts(chain.words[i - 1]);
      const cur = counts(word);
      let added = 0;
      for (const [c, n] of cur) added += Math.max(0, n - (prev.get(c) ?? 0));
      for (const [c, n] of prev) {
        if ((cur.get(c) ?? 0) < n) fail(chain, `"${chain.words[i - 1]}" letter '${c}' is dropped by "${word}"`);
      }
      if (added !== 1) fail(chain, `"${chain.words[i - 1]}" -> "${word}" adds ${added} letters, expected 1`);
    }
  });

  chain.levels.forEach((level, i) => {
    if (level.answer !== chain.words[i]) fail(chain, `level ${i} answer "${level.answer}" != "${chain.words[i]}"`);

    if (level.distractors.length !== DISTRACTORS)
      fail(chain, `level ${i} has ${level.distractors.length} distractors, expected ${DISTRACTORS}`);

    // A distractor must never be a letter the answer needs.
    for (const d of level.distractors) {
      if (level.answer.includes(d)) fail(chain, `level ${i} distractor '${d}' appears in "${level.answer}"`);
    }
    if (new Set(level.distractors).size !== level.distractors.length)
      fail(chain, `level ${i} has duplicate distractors`);

    // The pool must be exactly the answer's letters plus the distractors.
    const expected = [...level.answer, ...level.distractors].sort().join("");
    if ([...level.pool].sort().join("") !== expected)
      fail(chain, `level ${i} pool ${level.pool.join("")} != answer+distractors`);
    if (level.pool.length !== level.answer.length + DISTRACTORS)
      fail(chain, `level ${i} pool is ${level.pool.length} tiles, expected ${level.answer.length + DISTRACTORS}`);

    // Carried letters are the previous answer, and the pool must be able to supply them.
    const carried = i === 0 ? [] : [...chain.words[i - 1]].sort();
    if (level.carried.join("") !== carried.join(""))
      fail(chain, `level ${i} carried "${level.carried.join("")}" != "${carried.join("")}"`);

    const avail = counts(level.pool);
    for (const [c, n] of counts(carried.join(""))) {
      if ((avail.get(c) ?? 0) < n) fail(chain, `level ${i} pool cannot supply carried '${c}' x${n}`);
    }

    // Both hint-revealed letters must have a tile to claim.
    for (const idx of [0, 1]) {
      if (idx < level.answer.length && !level.pool.includes(level.answer[idx]))
        fail(chain, `level ${i} pool has no tile for revealed letter '${level.answer[idx]}'`);
    }
  });
}

console.log(`checked ${chains.length} chains (${chains.length * (maxLen - minLen + 1)} levels)`);
if (failures.length) {
  for (const f of failures.slice(0, 25)) console.error("  FAIL " + f);
  if (failures.length > 25) console.error(`  ...and ${failures.length - 25} more`);
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("all invariants hold");
