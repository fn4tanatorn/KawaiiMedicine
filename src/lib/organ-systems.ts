/** Allowed id_card_labels.organ_system values (mirrors the DB check constraint). */
export const ORGAN_SYSTEMS = [
  "General histology",
  "Musculoskeletal",
  "Nervous",
  "Cardiovascular",
  "Respiratory",
  "Gastrointestinal",
  "Renal",
  "Reproductive",
  "Endocrine",
  "Integumentary",
  "Hematologic & Lymphoid",
  "Special senses",
] as const;

export type OrganSystem = (typeof ORGAN_SYSTEMS)[number];

/** Case-insensitive lookup of a tag typed by an admin. */
export function toOrganSystem(tag: string): OrganSystem | null {
  const t = tag.trim().toLowerCase();
  return ORGAN_SYSTEMS.find((s) => s.toLowerCase() === t) ?? null;
}
