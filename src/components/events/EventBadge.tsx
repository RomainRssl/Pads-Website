interface EventBadgeProps {
  label: string;
  variant?: "game" | "track" | "car";
}

const variantStyles = {
  game: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  track: "bg-green-500/10 border-green-500/30 text-green-400",
  car: "bg-orange-500/10 border-orange-500/30 text-orange-400",
};

export default function EventBadge({ label, variant = "game" }: EventBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]}`}
    >
      {label}
    </span>
  );
}
