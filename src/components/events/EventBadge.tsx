interface EventBadgeProps {
  label: string;
  /** Optional secondary label shown after a separator, e.g. "12 max" */
  subLabel?: string;
  variant?: "game" | "track" | "car";
}

const variantStyles = {
  game: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  track: "bg-green-500/10 border-green-500/30 text-green-400",
  car: "bg-orange-500/10 border-orange-500/30 text-orange-400",
};

const subLabelStyles = {
  game: "text-blue-400/60",
  track: "text-green-400/60",
  car: "text-orange-400/60",
};

export default function EventBadge({ label, subLabel, variant = "game" }: EventBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]}`}
    >
      {label}
      {subLabel && (
        <>
          <span className={`${subLabelStyles[variant]} select-none`}>·</span>
          <span className={subLabelStyles[variant]}>{subLabel}</span>
        </>
      )}
    </span>
  );
}
