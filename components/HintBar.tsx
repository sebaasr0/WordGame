"use client";

import { HINT_LABELS, HINT_ORDER, TOTAL_HINTS } from "@/lib/game";

type Props = {
  hintsUsed: number;
  disabled: boolean;
  onHint: () => void;
};

/**
 * Three hints for the whole game, always spent in the same order:
 * remove a distractor, then the first letter, then the second letter.
 */
export default function HintBar({ hintsUsed, disabled, onHint }: Props) {
  const remaining = TOTAL_HINTS - hintsUsed;
  const next = HINT_ORDER[hintsUsed];

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onHint}
        disabled={disabled || remaining === 0}
        className="rounded-full border-2 px-6 py-2 text-sm font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-35 enabled:hover:brightness-125"
        style={{ borderColor: "var(--gray-tile-border)", background: "var(--panel)" }}
      >
        Hint ({remaining})
      </button>
      <p className="h-4 text-xs" style={{ color: "var(--muted)" }}>
        {remaining === 0 ? "No hints left" : `Next: ${HINT_LABELS[next]}`}
      </p>
    </div>
  );
}
