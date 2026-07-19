"use client";

interface RankBadgeProps {
  rank: number;
}

export default function RankBadge({ rank }: RankBadgeProps) {
  const bg =
    rank === 1
      ? "var(--accent)"
      : rank <= 3
        ? "rgba(28, 78, 216, 0.15)"
        : "var(--faint)";
  const color = rank === 1 ? "#fff" : rank <= 3 ? "var(--accent)" : "var(--muted)";

  return (
    <div
      className="flex items-center justify-center rounded-full text-[11px] font-medium"
      style={{
        width: 24,
        height: 24,
        background: bg,
        color,
      }}
    >
      #{rank}
    </div>
  );
}
