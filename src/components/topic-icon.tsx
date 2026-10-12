import Image from "next/image";

/**
 * Clean Kawaii topic icon resolution.
 * Maps known topic tags/keywords to icons deterministically without regex bloat.
 */
const ICON_BY_SLUG: Record<string, string> = {
  heart: "/icons/heart.png",
  cardio: "/icons/heart.png",
  lung: "/icons/lungs.png",
  resp: "/icons/lungs.png",
  brain: "/icons/brain.png",
  neuro: "/icons/brain.png",
  blood: "/icons/blood-cell.png",
  hemat: "/icons/blood-cell.png",
  gi: "/icons/stomach.png",
  stomach: "/icons/stomach.png",
  skelet: "/icons/skeletal.png",
  bone: "/icons/skeletal.png",
  immune: "/icons/lymphatic-immune.png",
  lymph: "/icons/lymphatic-immune.png",
  pharma: "/icons/capsule.png",
  exam: "/icons/clipboard.png",
  learn: "/icons/books.png",
};

export function getTopicIconSrc(titleOrKey?: string): string {
  if (!titleOrKey) return "/icons/stethoscope.png";
  const lower = titleOrKey.toLowerCase();
  for (const [key, path] of Object.entries(ICON_BY_SLUG)) {
    if (lower.includes(key)) return path;
  }
  return "/icons/stethoscope.png";
}

/** Backward compatibility helper */
export function topicIconSrc(): string {
  return "/icons/stethoscope.png";
}

export function topicIconFor(title: string): string {
  return getTopicIconSrc(title);
}


/**
 * Cute, rounded tile with a soft pastel tint and topic icon inside.
 * Used on course and exam cards with Warm Zen minimal styling.
 */
export function TopicIcon({
  index = 0,
  title,
  icon,
  size = 48,
  variant,
  className = "",
}: {
  index?: number;
  title?: string;
  icon?: string;
  size?: number;
  variant?: "brand" | "pink" | "mint" | "lemon";
  className?: string;
}) {
  const src = icon || getTopicIconSrc(title);

  // Soft semantic Kawaii pastel tint
  const tintClass =
    variant === "pink"
      ? "bg-pink-soft text-pink"
      : variant === "mint"
      ? "bg-mint-soft text-mint"
      : variant === "lemon"
      ? "bg-lemon-soft text-lemon"
      : index % 2 === 1
      ? "bg-pink-soft text-pink"
      : "bg-brand-soft text-brand";

  return (
    <span
      className={`topic-tile flex shrink-0 items-center justify-center rounded-2xl ${tintClass} transition-transform duration-200 hover:scale-105 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="h-[72%] w-[72%] object-contain"
      />
    </span>
  );
}

