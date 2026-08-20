"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Board, { type Slot } from "@/components/Board";
import HintBar from "@/components/HintBar";
import LetterPool from "@/components/LetterPool";
import {
  type Chain,
  HINT_ORDER,
  TOTAL_HINTS,
  TOTAL_ROUNDS,
  carriedMask,
  pickDistractorToRemove,
  randomChain,
} from "@/lib/game";

type Status = "playing" | "correct" | "wrong";

export default function Page() {
  // Chosen after mount so the server and client markup agree.
  const [chain, setChain] = useState<Chain | null>(null);
  const [round, setRound] = useState(0);
  const [slots, setSlots] = useState<(Slot | null)[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [status, setStatus] = useState<Status>("playing");
  const [won, setWon] = useState(false);

  const level = chain?.levels[round] ?? null;

  // Pending "advance to the next round" timer, so restarting mid-celebration
  // cannot drop us into a round of the old chain.
  const advanceTimer = useRef<number | null>(null);

  const startGame = useCallback(() => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    const next = randomChain();
    setChain(next);
    setRound(0);
    setSlots(new Array(next.levels[0].answer.length).fill(null));
    setRemoved([]);
    setHintsUsed(0);
    setStatus("playing");
    setWon(false);
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

  const carried = useMemo(() => (level ? carriedMask(level) : []), [level]);
  const usedIndices = useMemo(
    () => slots.filter((s): s is Slot => s !== null).map((s) => s.poolIndex),
    [slots]
  );

  // -------------------------------------------------------------------------
  // Placing and removing letters
  // -------------------------------------------------------------------------

  const pick = useCallback(
    (poolIndex: number) => {
      if (status === "correct" || won) return;
      setStatus("playing");
      setSlots((prev) => {
        if (prev.some((s) => s?.poolIndex === poolIndex)) return prev;
        const target = prev.findIndex((s) => s === null);
        if (target === -1) return prev;
        const next = [...prev];
        next[target] = { letter: level!.pool[poolIndex], poolIndex, locked: false };
        return next;
      });
    },
    [level, status, won]
  );

  const removeSlot = useCallback(
    (slotIndex: number) => {
      if (status === "correct" || won) return;
      setStatus("playing");
      setSlots((prev) => {
        if (prev[slotIndex]?.locked) return prev;
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
    },
    [status, won]
  );

  /** Backspace clears the last letter the player placed, skipping hint letters. */
  const backspace = useCallback(() => {
    if (status === "correct" || won) return;
    setStatus("playing");
    setSlots((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i] && !prev[i]!.locked) {
          const next = [...prev];
          next[i] = null;
          return next;
        }
      }
      return prev;
    });
  }, [status, won]);

  /** Typing a letter grabs a matching tile from the pool, if one is free. */
  const typeLetter = useCallback(
    (letter: string) => {
      if (!level || status === "correct" || won) return;
      const taken = new Set(usedIndices);
      for (let i = 0; i < level.pool.length; i++) {
        if (level.pool[i] !== letter) continue;
        if (taken.has(i) || removed.includes(i)) continue;
        pick(i);
        return;
      }
    },
    [level, pick, removed, status, usedIndices, won]
  );

  // -------------------------------------------------------------------------
  // Checking — the moment the last box is filled, no submit step
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!chain || !level || won) return;
    // Only judge a fresh, complete board. After a wrong guess the status parks
    // at "wrong" so this cannot fire again until the player changes a letter.
    if (status !== "playing") return;
    if (slots.length === 0 || slots.some((s) => s === null)) return;

    const guess = slots.map((s) => s!.letter).join("");
    if (guess !== level.answer) {
      setStatus("wrong");
      return;
    }

    setStatus("correct");
    const isLast = round === TOTAL_ROUNDS - 1;
    // Deliberately not cleaned up on re-run: setting the status above retriggers
    // this effect, and a cleanup would cancel the advance before it fires.
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null;
      if (isLast) {
        setWon(true);
        return;
      }
      const nextRound = round + 1;
      setRound(nextRound);
      setSlots(new Array(chain.levels[nextRound].answer.length).fill(null));
      setRemoved([]);
      setStatus("playing");
    }, 900);
  }, [chain, level, round, slots, status, won]);

  // Drop any pending advance if the component goes away.
  useEffect(() => {
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Hints — three for the whole game, spent in a fixed order
  // -------------------------------------------------------------------------

  const useHint = useCallback(() => {
    if (!level || hintsUsed >= TOTAL_HINTS || status === "correct" || won) return;
    const kind = HINT_ORDER[hintsUsed];

    if (kind === "remove-distractor") {
      const target = pickDistractorToRemove(level, removed, usedIndices);
      if (target === null) return;
      setRemoved((prev) => [...prev, target]);
      // If the player had already placed that distractor, take it back off the board.
      setSlots((prev) => prev.map((s) => (s && s.poolIndex === target ? null : s)));
      setHintsUsed((n) => n + 1);
      return;
    }

    const slotIndex = kind === "first-letter" ? 0 : 1;
    if (slotIndex >= level.answer.length) return;
    const letter = level.answer[slotIndex];

    setSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;

      // Claim a pool tile for the revealed letter. If the player already has the
      // only matching tile in another slot, take it from there — otherwise the
      // letter would appear twice on the board but once in the pool.
      const claimed = new Map<number, number>();
      next.forEach((s, i) => {
        if (s) claimed.set(s.poolIndex, i);
      });

      let poolIndex = -1;
      for (let i = 0; i < level.pool.length; i++) {
        if (level.pool[i] !== letter || removed.includes(i)) continue;
        if (!claimed.has(i)) {
          poolIndex = i;
          break;
        }
        if (poolIndex === -1) poolIndex = i; // fall back to stealing this one
      }
      const stolenFrom = poolIndex === -1 ? undefined : claimed.get(poolIndex);
      if (stolenFrom !== undefined) next[stolenFrom] = null;

      next[slotIndex] = { letter, poolIndex, locked: true };
      return next;
    });
    setHintsUsed((n) => n + 1);
    setStatus("playing");
  }, [hintsUsed, level, removed, status, usedIndices, won]);

  // -------------------------------------------------------------------------
  // Keyboard
  // -------------------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        typeLetter(e.key.toLowerCase());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [backspace, typeLetter]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!chain || !level) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </main>
    );
  }

  const solved = chain.words.slice(0, won ? TOTAL_ROUNDS : round);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-7 px-4 py-8">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">WordGame</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Every letter of your answer carries into the next round, plus one new one.
        </p>
      </header>

      {/* The ladder of words already solved, as drawn on the board */}
      {solved.length > 0 && (
        <ol className="flex flex-col items-center gap-1.5">
          {solved.map((word, i) => (
            <li key={i} className="flex gap-1">
              {[...word].map((c, j) => (
                <span
                  key={j}
                  className="grid h-7 w-6 place-items-center rounded text-xs font-bold uppercase"
                  style={{ background: "var(--carried-soft)", color: "var(--carried)" }}
                >
                  {c}
                </span>
              ))}
            </li>
          ))}
        </ol>
      )}

      {won ? (
        <section className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-xl font-bold" style={{ color: "var(--correct)" }}>
            Chain complete
          </h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            You finished all {TOTAL_ROUNDS} rounds using {hintsUsed} of {TOTAL_HINTS} hints.
          </p>
          <button
            type="button"
            onClick={startGame}
            className="rounded-full border-2 px-6 py-2 text-sm font-semibold uppercase tracking-wide transition hover:brightness-125"
            style={{ borderColor: "var(--correct)", background: "var(--panel)" }}
          >
            Play again
          </button>
        </section>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Round {round + 1} of {TOTAL_ROUNDS} — {level.answer.length} letters
          </p>

          <Board slots={slots} status={status} onRemove={removeSlot} />

          <LetterPool
            pool={level.pool}
            carried={carried}
            usedIndices={usedIndices}
            removedIndices={removed}
            disabled={status === "correct"}
            onPick={pick}
          />

          <p className="h-4 text-xs" style={{ color: status === "wrong" ? "var(--wrong)" : "var(--muted)" }}>
            {status === "wrong"
              ? "Not the word we're after — change a letter."
              : "Tap letters or use your keyboard. Backspace to undo."}
          </p>

          <HintBar hintsUsed={hintsUsed} disabled={status === "correct"} onHint={useHint} />

          <button
            type="button"
            onClick={startGame}
            className="text-xs underline underline-offset-4 transition hover:brightness-125"
            style={{ color: "var(--muted)" }}
          >
            New chain
          </button>
        </>
      )}
    </main>
  );
}
