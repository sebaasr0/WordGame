"use client";

type Props = {
  pool: string[];
  carried: boolean[];
  usedIndices: number[];
  removedIndices: number[];
  disabled: boolean;
  onPick: (poolIndex: number) => void;
};

/**
 * The tray of available letters. Letters carried over from the previous answer
 * are tinted; everything else — the new letter and the distractors — stays gray,
 * so the player cannot tell the new letter from a distractor.
 */
export default function LetterPool({
  pool,
  carried,
  usedIndices,
  removedIndices,
  disabled,
  onPick,
}: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Available letters">
      {pool.map((letter, i) => {
        const removed = removedIndices.includes(i);
        const used = usedIndices.includes(i);
        const isCarried = carried[i];

        if (removed) {
          return (
            <span
              key={i}
              aria-hidden="true"
              className="grid h-12 w-11 place-items-center rounded-md border-2 border-dashed text-xl font-bold uppercase opacity-25 sm:h-14 sm:w-12"
              style={{ borderColor: "var(--gray-tile-border)", color: "var(--muted)" }}
            >
              {letter.toUpperCase()}
            </span>
          );
        }

        return (
          <button
            key={i}
            type="button"
            disabled={used || disabled}
            onClick={() => onPick(i)}
            aria-label={`Letter ${letter.toUpperCase()}${isCarried ? ", carried over" : ""}`}
            className={`grid h-12 w-11 place-items-center rounded-md border-2 text-xl font-bold uppercase transition sm:h-14 sm:w-12 ${
              used ? "opacity-30" : "cursor-pointer hover:-translate-y-0.5 hover:brightness-125"
            } ${disabled && !used ? "cursor-default" : ""}`}
            style={{
              borderColor: isCarried ? "var(--carried)" : "var(--gray-tile-border)",
              background: isCarried ? "var(--carried-soft)" : "var(--gray-tile)",
              color: isCarried ? "var(--carried)" : "var(--chalk)",
            }}
          >
            {letter.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
