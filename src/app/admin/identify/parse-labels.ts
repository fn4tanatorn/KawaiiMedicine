/**
 * Parse an answer list like the Netter card back:
 *   1. Frontal bone
 *   2. Supraorbital notch (foramen) | supraorbital foramen
 * "|" separates extra accepted answers. A trailing "(…)" also adds the
 * answer without it, so "Supraorbital notch" is accepted too.
 */
export function parseLabelLines(text: string) {
  const seen = new Set<number>();
  const out: { label_no: number; answer: string; synonyms: string[] }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(\d+)\s*[.)\-:]?\s*(.+?)\s*$/);
    if (!m) continue;
    const no = Number(m[1]);
    const [rawAnswer, ...alts] = m[2]
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!rawAnswer || no <= 0 || seen.has(no)) continue;
    seen.add(no);
    const withoutParens = rawAnswer
      .replace(/\s*\([^)]*\)/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const withInside = rawAnswer
      .replace(/\(([^)]+)\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    const primary = withoutParens || rawAnswer;

    const candidateSyns = [...alts, rawAnswer, withInside];
    const synonyms = [...new Set(candidateSyns)].filter(
      (s) => s && s.toLowerCase() !== primary.toLowerCase(),
    );
    out.push({ label_no: no, answer: primary, synonyms });
  }
  return out.sort((a, b) => a.label_no - b.label_no);
}
