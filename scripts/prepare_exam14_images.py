#!/usr/bin/env python3
"""
Crop 7 high-resolution question images for Exam-14 (Skeletal System) from
Netter's Histology flashcards PDF, removing title headers and chapter footers.
"""

from pathlib import Path
import fitz

PDF_PATH = "/Users/tanatornonsrirot/Dev/MedEd/KawaiiMedicine/Netters Histology flashcards.pdf"
OUT_DIR = Path("data/exam14_images")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# 7 cards for Exam-14 (positions 3 to 9)
CARDS = [
    {
        "card_code": "6-2",
        "page_idx": 123,
        "name": "q04_hyaline_cartilage_isogenous_group",
        "crop_rect": (10, 49, 278, 398),
    },
    {
        "card_code": "6-3",
        "page_idx": 125,
        "name": "q05_fibrocartilage_nucleus_pulposus",
        "crop_rect": (10, 49, 278, 398),
    },
    {
        "card_code": "6-4",
        "page_idx": 127,
        "name": "q06_elastic_cartilage_chondrocyte",
        "crop_rect": (10, 49, 278, 398),
    },
    {
        "card_code": "6-5",
        "page_idx": 129,
        "name": "q07_chondrocyte_em_rer",
        "crop_rect": (10, 49, 278, 398),
    },
    {
        "card_code": "6-7",
        "page_idx": 133,
        "name": "q08_spongy_bone_osteoclast",
        "crop_rect": (10, 49, 278, 398),
    },
    {
        "card_code": "6-8",
        "page_idx": 135,
        "name": "q09_cells_of_bone_osteoblast",
        "crop_rect": (10, 49, 278, 398),
    },
    {
        "card_code": "6-10",
        "page_idx": 139,
        "name": "q10_synovium_meniscus",
        "crop_rect": (10, 49, 278, 398),
    },
]

def main():
    doc = fitz.open(PDF_PATH)
    for c in CARDS:
        page = doc[c["page_idx"]]
        rect = fitz.Rect(*c["crop_rect"])
        pix = page.get_pixmap(clip=rect, dpi=250)
        out_path = OUT_DIR / f"{c['name']}.png"
        pix.save(str(out_path))
        print(f"Rendered {c['name']} -> {out_path} ({pix.width}x{pix.height})")

if __name__ == "__main__":
    main()
