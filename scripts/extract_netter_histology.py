#!/usr/bin/env python3
"""
Netter's Histology Flash Cards — High-Precision Asset Extractor & Parser.

Extracts all 223 flashcard images (200 DPI JPEG) and parses 1,316+ question labels,
synonyms, organ-system mappings, and clinical comments into:
  - data/identify/images/netter_his_<code_slug>.jpg
  - data/identify/cards.json
  - data/identify/manifest.csv
"""

import argparse
import csv
import json
import os
import re
import sys
import time
import unicodedata
from pathlib import Path
import fitz  # PyMuPDF

DEFAULT_PDF = "/Users/tanatornonsrirot/Dev/MedEd/KawaiiMedicine/Netters Histology flashcards.pdf"
DEFAULT_OUT = "data/identify"

CHAPTER_METADATA = {
    1: {"name": "The Cell", "organ_system_slug": "general"},
    2: {"name": "Epithelium and Exocrine Glands", "organ_system_slug": "general"},
    3: {"name": "Connective Tissue", "organ_system_slug": "general"},
    4: {"name": "Muscle Tissue", "organ_system_slug": "muscular"},
    5: {"name": "Nervous Tissue", "organ_system_slug": "nervous"},
    6: {"name": "Cartilage and Bone", "organ_system_slug": "skeletal"},
    7: {"name": "Blood and Bone Marrow", "organ_system_slug": "hematology"},
    8: {"name": "Cardiovascular System", "organ_system_slug": "cardiovascular"},
    9: {"name": "Lymphoid System", "organ_system_slug": "immune"},
    10: {"name": "Endocrine System", "organ_system_slug": "endocrine"},
    11: {"name": "Integumentary System", "organ_system_slug": "integumentary"},
    12: {"name": "Upper Digestive System", "organ_system_slug": "gastrointestinal"},
    13: {"name": "Lower Digestive System", "organ_system_slug": "gastrointestinal"},
    14: {"name": "Liver, Gallbladder, and Exocrine Pancreas", "organ_system_slug": "gastrointestinal"},
    15: {"name": "Respiratory System", "organ_system_slug": "respiratory"},
    16: {"name": "Urinary System", "organ_system_slug": "renal"},
    17: {"name": "Male Reproductive System", "organ_system_slug": "reproductive"},
    18: {"name": "Female Reproductive System", "organ_system_slug": "reproductive"},
    19: {"name": "Eye and Adnexa", "organ_system_slug": "special-senses"},
    20: {"name": "Special Senses", "organ_system_slug": "special-senses"},
}

def fix_ligatures(text: str) -> str:
    """Normalize unicode and repair broken ligatures (e.g. 'fi ', 'fl ' inside words)."""
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    text = text.replace("ﬁ ", "fi").replace("ﬂ ", "fl")
    text = text.replace("ﬁ", "fi").replace("ﬂ", "fl")
    # Repair words split across ligature boundaries: e.g. 'stratifi ed' -> 'stratified'
    text = re.sub(r"(?i)\b(\w*(?:fi|fl))\s+([a-z]+)\b", r"\1\2", text)
    # Collapse multiple whitespaces
    text = re.sub(r"\s+", " ", text).strip()
    return text

def generate_synonyms(ans: str) -> tuple[str, list[str]]:
    """Clean the answer string and generate plausible clinical/histological synonyms."""
    ans_clean = fix_ligatures(ans)
    alts = set()

    # 1. Trailing acronym e.g. 'Rough endoplasmic reticulum (RER)' -> 'RER', 'Rough endoplasmic reticulum'
    m_acro = re.search(r"\(([A-Z0-9]+)\)$", ans_clean)
    if m_acro:
        alts.add(m_acro.group(1))
        alts.add(re.sub(r"\s*\([A-Z0-9]+\)$", "", ans_clean).strip())

    # 2. '(or ...)' or '(also called ...)' e.g. 'Gingiva (or gum)' -> 'Gingiva', 'Gum'
    m_or = re.search(r"\(\s*(?:or|also called)\s+([^)]+)\)", ans_clean, re.I)
    if m_or:
        alts.add(m_or.group(1).strip())
        alts.add(re.sub(r"\s*\(\s*(?:or|also called)\s+[^)]+\)", "", ans_clean).strip())

    # 3. Parentheses inside or at end: prefix (inside) suffix
    m_paren = re.search(r"^(.*?)\s*\(([^)]+)\)\s*(.*?)$", ans_clean)
    if m_paren and not m_acro and not m_or:
        prefix = m_paren.group(1).strip()
        inside = m_paren.group(2).strip()
        suffix = m_paren.group(3).strip()

        without_paren = f"{prefix} {suffix}".strip()
        if without_paren:
            alts.add(without_paren)

        if suffix:
            if " of " not in prefix:
                alts.add(f"{inside} {suffix}".strip())
            alts.add(f"{prefix} {inside} {suffix}".strip())
        else:
            alts.add(f"{prefix} {inside}".strip())

    # 4. Handle Roman / Arabic numerals (e.g. 'type I' <-> 'type 1')
    if "type I" in ans_clean:
        alts.add(ans_clean.replace("type I", "type 1"))
    elif "type II" in ans_clean:
        alts.add(ans_clean.replace("type II", "type 2"))

    # 5. Common plural / singular forms
    if ans_clean.endswith("villus"):
        alts.add(ans_clean[:-6] + "villi")
    elif ans_clean.endswith("villi"):
        alts.add(ans_clean[:-5] + "villus")

    filtered = [a for a in sorted(alts) if a.lower() != ans_clean.lower() and len(a) > 1]
    return ans_clean, filtered

def parse_toc_titles(doc: fitz.Document) -> dict[str, str]:
    """Extract canonical card titles from Table of Contents pages."""
    toc_indices = [9, 10, 11, 12, 161, 162, 163, 164, 165, 166, 167]
    card_code_re = re.compile(r"^(\d+-\d+)$")
    toc_titles = {}

    for p in toc_indices:
        if p >= len(doc):
            continue
        page = doc[p]
        lines = [l.strip() for l in page.get_text().split("\n") if l.strip()]
        i = 0
        while i < len(lines):
            line = lines[i]
            # Pattern: '11-11 Sebaceous Gland'
            m_inline = re.match(r"^(\d+-\d+)\s+(.+)$", line)
            if m_inline:
                toc_titles[m_inline.group(1)] = fix_ligatures(m_inline.group(2))
                i += 1
                continue
            # Pattern: '8-1\nAtrium'
            m_code = card_code_re.match(line)
            if m_code:
                code = m_code.group(1)
                if i + 1 < len(lines):
                    next_line = lines[i + 1]
                    if not card_code_re.match(next_line) and "Section" not in next_line:
                        toc_titles[code] = fix_ligatures(next_line)
                        i += 2
                        continue
            i += 1

    return toc_titles

def extract_all(pdf_path: str, out_dir: str, dpi: int = 200, quality: int = 90, limit: int | None = None):
    print(f"📖 Opening PDF: {pdf_path}")
    doc = fitz.open(pdf_path)
    print(f"📄 Total PDF pages: {len(doc)}")

    out_path = Path(out_dir)
    img_dir = out_path / "images"
    img_dir.mkdir(parents=True, exist_ok=True)

    print("📑 Parsing Table of Contents for official titles...")
    toc_titles = parse_toc_titles(doc)
    print(f"✓ Found {len(toc_titles)} titles in TOC")

    card_code_re = re.compile(r"^(\d+-\d+)$")
    cards = []
    manifest_rows = []

    front_pages = []
    for p_idx in range(len(doc)):
        page = doc[p_idx]
        lines = [l.strip() for l in page.get_text().split("\n") if l.strip()]
        if any(card_code_re.match(l) for l in lines) and page.get_images():
            front_pages.append(p_idx)

    print(f"🎯 Identified {len(front_pages)} flashcard front pages.")

    if limit is not None:
        front_pages = front_pages[:limit]
        print(f"⚠️ Limited to first {limit} cards.")

    t0 = time.time()
    for idx, p_front in enumerate(front_pages):
        front_page = doc[p_front]
        back_page = doc[p_front + 1]

        # Extract card code (e.g. '8-1')
        front_lines = [l.strip() for l in front_page.get_text().split("\n") if l.strip()]
        code = [l for l in front_lines if card_code_re.match(l)][0]
        ch_num = int(code.split("-")[0])

        ch_meta = CHAPTER_METADATA.get(ch_num, {"name": f"Chapter {ch_num}", "organ_system_slug": "general"})
        raw_title = toc_titles.get(code, front_lines[0] if front_lines else f"Card {code}")
        # Clean title
        title = fix_ligatures(raw_title)

        # 1. Render front image
        img_filename = f"netter_his_{code.replace('-', '_')}.jpg"
        img_filepath = img_dir / img_filename
        
        pix = front_page.get_pixmap(dpi=dpi)
        pix.save(str(img_filepath), jpg_quality=quality)

        # 2. Parse back page answers & comment
        back_text = back_page.get_text()
        raw_lines = [l.strip() for l in back_text.split("\n") if l.strip()]

        labels_dict = {}
        curr_no = None
        curr_text = []
        comment_lines = []
        is_comment = False

        for line in raw_lines:
            if line.startswith("Comment:"):
                is_comment = True
                comment_lines.append(line[len("Comment:"):].strip())
                continue
            if is_comment:
                comment_lines.append(line)
                continue

            m = re.match(r"^(\d+)\s*\.\s*(.*)$", line)
            if m:
                if curr_no is not None:
                    labels_dict[curr_no] = " ".join(curr_text).strip()
                curr_no = int(m.group(1))
                curr_text = [m.group(2).strip()] if m.group(2).strip() else []
            elif curr_no is not None:
                if line.startswith("See Book") or line.startswith("Figure ") or line.startswith("Page "):
                    continue
                curr_text.append(line)

        if curr_no is not None:
            labels_dict[curr_no] = " ".join(curr_text).strip()

        # Build clean labels with synonyms
        parsed_labels = []
        for num in sorted(labels_dict.keys()):
            raw_ans = labels_dict[num]
            clean_ans, syns = generate_synonyms(raw_ans)
            parsed_labels.append({
                "label_no": num,
                "answer": clean_ans,
                "synonyms": syns,
            })

        # Disambiguate / deduplicate synonyms within the same card
        all_answers_lower = {l["answer"].lower().strip(): l["label_no"] for l in parsed_labels}
        from collections import Counter
        synonym_counts = Counter()
        for l in parsed_labels:
            for s in l["synonyms"]:
                synonym_counts[s.lower().strip()] += 1

        for l in parsed_labels:
            valid_syns = []
            for s in l["synonyms"]:
                s_lower = s.lower().strip()
                if s_lower in all_answers_lower and all_answers_lower[s_lower] != l["label_no"]:
                    continue
                if synonym_counts[s_lower] > 1:
                    continue
                valid_syns.append(s)
            l["synonyms"] = valid_syns

        comment = fix_ligatures(" ".join(comment_lines))

        card_entry = {
            "code": code,
            "chapter": ch_num,
            "chapter_name": ch_meta["name"],
            "title": title,
            "display_title": f"{title} ({code})",
            "subject": "histology",
            "organ_system_slug": ch_meta["organ_system_slug"],
            "image_filename": img_filename,
            "front_page": p_front + 1,
            "back_page": p_front + 2,
            "labels_count": len(parsed_labels),
            "labels": parsed_labels,
            "comment": comment,
        }
        cards.append(card_entry)

        manifest_rows.append({
            "code": code,
            "chapter": ch_num,
            "chapter_name": ch_meta["name"],
            "organ_system": ch_meta["organ_system_slug"],
            "title": title,
            "labels_count": len(parsed_labels),
            "image_filename": img_filename,
            "front_page": p_front + 1,
            "back_page": p_front + 2,
        })

        if (idx + 1) % 25 == 0 or idx == len(front_pages) - 1:
            print(f"  Processed {idx + 1}/{len(front_pages)} cards ({code}: {title})")

    t1 = time.time()
    print(f"⏱️ Finished extraction in {t1 - t0:.2f} seconds.")

    # Save cards.json
    json_path = out_path / "cards.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    print(f"💾 Saved JSON metadata to: {json_path}")

    # Save manifest.csv
    csv_path = out_path / "manifest.csv"
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        fieldnames = ["code", "chapter", "chapter_name", "organ_system", "title", "labels_count", "image_filename", "front_page", "back_page"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(manifest_rows)
    print(f"📊 Saved manifest CSV to: {csv_path}")

    total_labels = sum(c["labels_count"] for c in cards)
    print(f"\n🎉 Extraction Complete! Total Cards: {len(cards)}, Total Question Labels: {total_labels}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract Netter's Histology flashcards")
    parser.add_argument("--pdf", default=DEFAULT_PDF, help="Path to input PDF")
    parser.add_argument("--out", default=DEFAULT_OUT, help="Output directory")
    parser.add_argument("--dpi", type=int, default=200, help="Image DPI (default 200)")
    parser.add_argument("--quality", type=int, default=90, help="JPEG quality (default 90)")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of cards")
    args = parser.parse_args()

    extract_all(args.pdf, args.out, dpi=args.dpi, quality=args.quality, limit=args.limit)
