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
    const [answer, ...alts] = m[2]
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!answer || no <= 0 || seen.has(no)) continue;
    seen.add(no);
    const stripped = answer.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const synonyms = [...new Set([...alts, stripped])].filter(
      (s) => s && s.toLowerCase() !== answer.toLowerCase(),
    );
    out.push({ label_no: no, answer, synonyms });
  }
  return out.sort((a, b) => a.label_no - b.label_no);
}
