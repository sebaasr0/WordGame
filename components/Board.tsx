"use client";

export type Slot = {
  letter: string;
  /** Index into the level's pool, or -1 for a letter placed by a hint. */
  poolIndex: number;
  locked: boolean;
};

type Props = {
  slots: (Slot | null)[];
  status: "playing" | "correct" | "wrong";
  onRemove: (slotIndex: number) => void;
};

export default function Board({ slots, status, onRemove }: Props) {
  return (
    <div
      className={`flex justify-center gap-2 ${status === "wrong" ? "shake" : ""}`}
      role="group"
      aria-label="Your word"
    >
      {slots.map((slot, i) => {
        const filled = slot !== null;
        const border =
          status === "correct"
            ? "var(--correct)"
            : status === "wrong"
              ? "var(--wrong)"
              : filled
                ? "var(--gray-tile-border)"
                : "#283136";

        return (
          <button
            key={i}
            type="button"
            disabled={!filled || slot.locked || status === "correct"}
            onClick={() => onRemove(i)}
            aria-label={filled ? `Letter ${slot.letter.toUpperCase()}, tap to remove` : "Empty slot"}
            className={`grid h-14 w-12 place-items-center rounded-md border-2 text-2xl font-bold uppercase transition-colors sm:h-16 sm:w-14 sm:text-3xl ${
              filled && !slot.locked && status !== "correct"
                ? "cursor-pointer hover:brightness-125"
                : "cursor-default"
            } ${status === "correct" ? "flip" : ""}`}
            style={{
              borderColor: border,
              background:
                status === "correct"
                  ? "rgba(91,168,95,0.16)"
                  : filled
                    ? "var(--gray-tile)"
                    : "transparent",
              color: slot?.locked ? "var(--carried)" : "var(--chalk)",
              animationDelay: status === "correct" ? `${i * 60}ms` : undefined,
            }}
          >
            {slot?.letter.toUpperCase() ?? ""}
          </button>
        );
      })}
    </div>
  );
}
