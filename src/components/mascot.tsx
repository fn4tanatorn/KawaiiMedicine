import Image from "next/image";

export type Mood = "happy" | "cheer" | "sleepy" | "oops";

const MASCOT_MAP: Record<Mood, string> = {
  happy: "/mascot/happy.png",
  cheer: "/mascot/happy.png",
  sleepy: "/mascot/happy.png",
  oops: "/mascot/happy.png",
};

/**
 * KawaiiMedicine's mascot. Renders clean, friendly artwork with a subtle
 * interactive hover bounce.
 */
export function Mascot({
  mood = "happy",
  className = "",
  size = 128,
}: {
  mood?: Mood;
  className?: string;
  size?: number;
}) {
  const src = MASCOT_MAP[mood] ?? "/mascot/happy.png";

  return (
    <Image
      src={src}
      alt="Kawaii mascot"
      width={size}
      height={size}
      priority={false}
      className={`object-contain transition-transform duration-300 hover:scale-105 active:scale-95 ${className}`}
    />
  );
}

