export type MoodType =
  | "battery_full"
  | "battery_low"
  | "coffee"
  | "need_rest"
  | "fire";

export interface MoodOption {
  key: MoodType;
  label: string;
  emoji: string;
  colorClass: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { key: "battery_full", label: "พร้อมลุย", emoji: "🔋", colorClass: "bg-mint-soft text-mint border-mint/20" },
  { key: "battery_low", label: "แบต 10%", emoji: "🪫", colorClass: "bg-lemon-soft text-lemon border-lemon/20" },
  { key: "coffee", label: "เติมกาแฟ", emoji: "☕", colorClass: "bg-brand-soft text-brand border-brand/20" },
  { key: "need_rest", label: "อยากพักผ่อน", emoji: "🛋️", colorClass: "bg-lavender-soft text-lavender border-lavender/20" },
  { key: "fire", label: "ไฟลุก", emoji: "🔥", colorClass: "bg-pink-soft text-pink border-pink/20" },
];

export const CUTE_ALIASES = [
  { name: "แมวส้มอ่านหนังสือ", icon: "🐱" },
  { name: "เพนกวินง่วงนอน", icon: "🐧" },
  { name: "คุณนากพักใจ", icon: "🦦" },
  { name: "คาปิบาร่าชิลๆ", icon: "🦫" },
  { name: "กระต่ายเคี้ยวแครอท", icon: "🐰" },
  { name: "หมีขาวจิบชา", icon: "🐻‍❄️" },
  { name: "แพนด้าน้อยขี้เซา", icon: "🐼" },
  { name: "ลูกเจี๊ยบสู้ชีวิต", icon: "🐥" },
  { name: "ชิบะสะพายเป้", icon: "🐕" },
  { name: "โคอาล่ากอดต้นไม้", icon: "🐨" },
  { name: "ทานตะวันสดใส", icon: "🌻" },
  { name: "เจ้าวาฬอารมณ์ดี", icon: "🐳" },
] as const;

export const REACTION_EMOJIS = [
  { emoji: "🤍", label: "ส่งใจ" },
  { emoji: "🫂", label: "กอดๆ" },
  { emoji: "☕", label: "เติมพลัง" },
  { emoji: "💪", label: "สู้ไปด้วยกัน" },
] as const;

export interface PostReactionSummary {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export interface LoungePostItem {
  id: string;
  content: string;
  mood: MoodType | null;
  isAnonymous: boolean;
  authorName: string;
  isMine: boolean;
  createdAt: string;
  reactions: PostReactionSummary[];
}
