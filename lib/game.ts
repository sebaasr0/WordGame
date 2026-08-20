import chainsData from "./chains.json";

export type Level = {
  /** The one word that counts as correct for this round. */
  answer: string;
  /** Three letters that are not in the answer. */
  distractors: string[];
  /** Letters of the previous answer, sorted. Empty on round 1. */
  carried: string[];
  /** answer letters + distractors, pre-shuffled at generation time. */
  pool: string[];
};

export type Chain = {
  id: number;
  words: string[];
  levels: Level[];
};

export type ChainsFile = {
  generated: number;
  minLen: number;
  maxLen: number;
  distractors: number;
  chains: Chain[];
};

const data = chainsData as ChainsFile;

export const CHAINS = data.chains;
export const TOTAL_ROUNDS = data.maxLen - data.minLen + 1;
export const TOTAL_HINTS = 3;

/** The three hints, in the fixed order the board specified. */
export type HintKind = "remove-distractor" | "first-letter" | "second-letter";
export const HINT_ORDER: HintKind[] = ["remove-distractor", "first-letter", "second-letter"];

export const HINT_LABELS: Record<HintKind, string> = {
  "remove-distractor": "Remove a distractor",
  "first-letter": "Reveal the first letter",
  "second-letter": "Reveal the second letter",
};

export function randomChain(): Chain {
  return CHAINS[Math.floor(Math.random() * CHAINS.length)];
}

/**
 * Marks which pool positions hold a letter carried over from the previous
 * answer, so the board can highlight them the way the chalkboard did.
 *
 * `carried` is a multiset, so each carried letter claims one pool slot: a level
 * whose answer has two E's but whose previous answer had one must light up
 * exactly one E.
 */
export function carriedMask(level: Level): boolean[] {
  const mask = new Array(level.pool.length).fill(false);
  const remaining = new Map<string, number>();
  for (const c of level.carried) remaining.set(c, (remaining.get(c) ?? 0) + 1);

  level.pool.forEach((letter, i) => {
    const left = remaining.get(letter) ?? 0;
    if (left > 0) {
      mask[i] = true;
      remaining.set(letter, left - 1);
    }
  });
  return mask;
}

/**
 * Picks a pool position holding a distractor that is still in play, preferring
 * one the player has not already dragged into a slot. If every remaining
 * distractor is sitting in a slot we still return one — the caller clears the
 * slot — so the hint never silently does nothing.
 */
export function pickDistractorToRemove(
  level: Level,
  removed: number[],
  usedPoolIndices: number[]
): number | null {
  const isDistractor = distractorMask(level);
  const free: number[] = [];
  const inUse: number[] = [];
  for (let i = 0; i < level.pool.length; i++) {
    if (!isDistractor[i]) continue;
    if (removed.includes(i)) continue;
    (usedPoolIndices.includes(i) ? inUse : free).push(i);
  }
  const candidates = free.length ? free : inUse;
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Which pool positions are distractors. Distractors are generated as letters
 * absent from the answer, so a letter match is enough to identify them.
 */
export function distractorMask(level: Level): boolean[] {
  const answerLetters = new Set(level.answer);
  return level.pool.map((letter) => !answerLetters.has(letter));
}
