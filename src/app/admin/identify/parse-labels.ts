import { toOrganSystem, type OrganSystem } from "@/lib/organ-systems";

/**
 * Parse an answer list like the Netter card back:
 *   1. Frontal bone #Musculoskeletal
 *   2. Supraorbital notch (foramen) | supraorbital foramen
 * "|" separates extra accepted answers. A trailing "(…)" also adds the
 * answer without it, so "Supraorbital notch" is accepted too. An optional
 * trailing "#Organ system" tags the answer; unknown tags are reported in
 * badTags and the label is left untagged.
 */
export function parseLabelLines(text: string) {
  const seen = new Set<number>();
  const out: {
    label_no: number;
    answer: string;
    synonyms: string[];
    organ_system: OrganSystem | null;
  }[] = [];
  const badTags: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(\d+)\s*[.)\-:]?\s*(.+?)\s*$/);
    if (!m) continue;
    const no = Number(m[1]);
    const [body, tag] = m[2].split("#", 2);
    const organ = tag?.trim() ? toOrganSystem(tag) : null;
    if (tag?.trim() && !organ) badTags.push(`${no}: ${tag.trim()}`);
    const [answer, ...alts] = body
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!answer || no <= 0 || seen.has(no)) continue;
    seen.add(no);
    const stripped = answer.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const synonyms = [...new Set([...alts, stripped])].filter(
      (s) => s && s.toLowerCase() !== answer.toLowerCase(),
    );
    out.push({ label_no: no, answer, synonyms, organ_system: organ });
  }
  return { labels: out.sort((a, b) => a.label_no - b.label_no), badTags };
}
