import Image from "next/image";
import { cardTint } from "./ui";

/** The 8 decorative topic icons in public/icons/. */
type TopicIconName =
  | "brain"
  | "stethoscope"
  | "lungs"
  | "heart"
  | "microscope"
  | "syringe"
  | "blood-cell"
  | "capsule"
  | "stomach"
  | "study";

/** Title keywords (Thai + English) mapped to a specific icon, checked in order. */
const KEYWORD_ICONS: [RegExp, TopicIconName][] = [
  [/heart|cardio|หัวใจ|หลอดเลือด/i, "heart"],
  [/lung|resp|ปอด|หายใจ|ทางเดินหายใจ/i, "lungs"],
  [/brain|neuro|สมอง|ประสาท/i, "brain"],
  [/blood|hemat|เลือด|โลหิต/i, "blood-cell"],
  [/pharm|drug|medicat|ยา|เภสัช/i, "capsule"],
  [/inject|vaccine|syringe|ฉีด|วัคซีน/i, "syringe"],
  [/gastro|intestin|stomach|digest|gi|ทางเดินอาหาร|กระเพาะ|ลำไส้|ย่อย/i, "stomach"],
  [/learn|study|ทบทวน|เทคนิค|เรียน/i, "study"],
  [/lab|micro|histolog|จุลชีพ|จุลกาย|ห้องปฏิบัติการ/i, "microscope"],
];

/**
 * Icons that don't depict a specific organ or system, cycled by index for
 * cards whose title matches no keyword. Organ icons (lungs, heart, brain…)
 * are keyword-only, so e.g. a GI course never shows lungs.
 */
const GENERIC_ICONS: TopicIconName[] = ["stethoscope", "microscope"];

function iconSrc(name: TopicIconName): string {
  return `/icons/${name}.png`;
}

export function topicIconSrc(index: number): string {
  return iconSrc(GENERIC_ICONS[index % GENERIC_ICONS.length]);
}

/** Best-guess icon for a title (keyword match), falling back to index rotation. */
export function topicIconFor(title: string, index: number): string {
  for (const [pattern, name] of KEYWORD_ICONS) {
    if (pattern.test(title)) return iconSrc(name);
  }
  return topicIconSrc(index);
}

/** Tinted rounded tile with a topic icon inside — used on course/exam cards. */
export function TopicIcon({
  index,
  title,
  size = 48,
  className = "",
}: {
  index: number;
  /** When given, tries a keyword match on the title before falling back to rotation. */
  title?: string;
  size?: number;
  className?: string;
}) {
  const tint = cardTint(index);
  const src = title ? topicIconFor(title, index) : topicIconSrc(index);
  return (
    <span
      className={`topic-tile flex shrink-0 items-center justify-center rounded-2xl ${tint.bg} ${tint.text} ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="h-[70%] w-[70%] object-contain"
      />
    </span>
  );
}
