#!/usr/bin/env python3
"""
scripts/curate_identify_answers.py

Comprehensive Medical Answer Curation & Synonym Enrichment for KawaiiMedicine Identify Flashcards.
Cleans raw textbook captions into concise primary anatomical/histological terms and enriches
synonyms with medical acronyms, eponyms, singular/plural variants, and histological flexibilities.
Ensures zero intra-card collisions.
"""

import json
import re
import sys
from pathlib import Path
from collections import defaultdict

CARDS_JSON = Path("data/identify/cards.json")

# 1. High-Priority Curated Overrides for Complex / Textbook Captions
# Format: { (card_title, label_no): (clean_primary, [extra_synonyms]) }
EXPLICIT_OVERRIDES = {
    # Composite or sentence captions
    ("Ear", 3): (
        "Vestibular apparatus",
        ["Membranous labyrinth", "Semicircular ducts", "Ampullae", "Utricle and saccule", "Utricle", "Saccule"]
    ),
    ("Bronchus", 3): (
        "Hyaline cartilage plate",
        ["Hyaline cartilage", "Cartilage plate", "Cartilage", "Hyaline cartilage plate surrounded by perichondrium"]
    ),
    ("Middle Ear and Auditory Tube", 4): (
        "Pseudostratified ciliated columnar epithelium",
        ["Respiratory epithelium", "Pseudostratified columnar epithelium", "Pseudostratified epithelium"]
    ),
    ("Bone Marrow", 3): (
        "Venous sinusoid",
        ["Sinusoid", "Vascular sinusoid", "Bone marrow sinusoid", "Venous sinusoid filled with erythrocytes"]
    ),
    ("Renal Corpuscle and Podocytes", 1): (
        "Glomerular endothelial cell",
        ["Endothelial cell", "Glomerular endothelium", "Fenestrated endothelial cell", "Attenuated glomerular endothelial cell with fenestrae"]
    ),
    ("Palate", 4): (
        "Myoepithelial cell",
        ["Myoepithelial cells", "Myoepithelial cell at the base of a mucous acinus"]
    ),
    ("Palate", 6): (
        "Columnar epithelial cell",
        ["Columnar cell", "Duct cell", "Columnar epithelial cell of duct of palatine gland"]
    ),
    ("Portal Tract and Central Vein", 5): (
        "Erythrocytes",
        ["Erythrocyte", "Red blood cells", "Red blood cell", "RBC", "Erythrocytes in hepatic sinusoid"]
    ),
    ("Blood-brain Barrier", 3): (
        "Tight junction",
        ["Zonula occludens", "Intercellular junction", "Tight junction between endothelial cells"]
    ),
    ("Megakaryocyte", 3): (
        "Demarcation membrane system",
        ["Demarcation channels", "Platelet demarcation channels", "Demarcation channels between forming platelets"]
    ),
    ("Enteric Nervous System", 5): (
        "Ganglion cells",
        ["Ganglion cell", "Myenteric ganglion cells", "Myenteric ganglion", "Ganglion cells of myenteric plexus"]
    ),
    ("Esophago-Gastric Junction", 6): (
        "Stratified squamous nonkeratinized epithelium",
        ["Stratified squamous epithelium", "Nonkeratinized stratified squamous epithelium", "Esophageal epithelium"]
    ),
    ("Rectoanal Junction", 6): (
        "Stratified squamous epithelium",
        ["Stratified squamous epithelium of anal canal", "Anal epithelium"]
    ),
    ("Biliary Duct System", 1): (
        "Simple columnar epithelium",
        ["Bile duct epithelium", "Simple columnar epithelium of bile duct"]
    ),
    ("Biliary Duct System", 5): (
        "Nucleus of duct cell",
        ["Nucleus", "Euchromatin", "Nucleus of simple cuboidal epithelial duct cell"]
    ),
    ("Endometrium", 5): (
        "Mitotic figure",
        ["Mitosis", "Mitotic cell", "Mitotic figure in epithelium of uterine gland"]
    ),
    ("Eyelid", 1): (
        "Stratified squamous keratinized epithelium",
        ["Keratinized stratified squamous epithelium", "Epidermis", "Stratified squamous epithelium"]
    ),
    ("Eyelid", 6): (
        "Stratified columnar epithelium",
        ["Palpebral conjunctiva epithelium", "Stratified columnar epithelium of palpebral conjunctiva"]
    ),
    ("Olfactory Mucosa", 3): (
        "Olfactory epithelium",
        ["Pseudostratified olfactory epithelium", "Olfactory mucosa", "Olfactory epithelium in superior concha of nasal cavity"]
    ),
    ("Taste Buds", 4): (
        "Stratified squamous epithelium",
        ["Oral epithelium", "Stratified squamous epithelium of oral mucosa"]
    ),
    ("Cutaneous Receptors", 3): (
        "Stratified squamous epithelium",
        ["Epidermis", "Stratified squamous epithelium of epidermis"]
    ),
    ("Corpora Aranacea", 2): (
        "Corpora arenacea",
        ["Brain sand", "Corpora aranacea", "Pineal sand"]
    ),
    ("Pineal", 2): (
        "Corpora arenacea",
        ["Brain sand", "Corpora aranacea", "Pineal sand"]
    ),
    ("Lip", 1): (
        "Cutaneous lip",
        ["Outer lip", "Skin of lip", "Outer cutaneous part of lip"]
    ),
    ("Lip", 3): (
        "Orbicularis oris muscle",
        ["Orbicularis oris", "Skeletal muscle"]
    ),
    ("Chief Cells", 2): (
        "Nucleus of chief cell",
        ["Nucleus", "Chief cell nucleus", "Nucleus of gastric chief cell"]
    ),
    ("Enteroendocrine Cells", 5): (
        "Nucleus of enteroendocrine cell",
        ["Nucleus", "Enteroendocrine cell nucleus"]
    ),
    ("Merkel Cells", 6): (
        "Nucleus of keratinocyte",
        ["Nucleus", "Keratinocyte nucleus"]
    ),
    ("Carotid Body and Carotid Sinus", 6): (
        "Nucleus of glomus cell",
        ["Nucleus", "Glomus cell nucleus"]
    ),
    ("Proximal Tubule", 1): (
        "Proximal convoluted tubule",
        ["Proximal tubule", "PCT"]
    ),
    ("Proximal Tubule", 6): (
        "Microvilli",
        ["Brush border", "Microvillus", "Striated border"]
    ),
    ("Proximal Tubule", 7): (
        "Bowman's space",
        ["Bowman space", "Urinary space", "Capsular space"]
    ),
    ("Collecting Duct", 5): (
        "Nucleus of principal cell",
        ["Nucleus", "Principal cell nucleus"]
    ),
    ("Collecting Duct", 6): (
        "Mitochondrion in intercalated cell",
        ["Mitochondrion", "Mitochondria", "Intercalated cell"]
    ),
    ("Uterine (fallopian) Tubes", 5): (
        "Simple columnar epithelium",
        ["Tubal epithelium", "Ciliated columnar epithelium"]
    ),
    ("Cornea", 2): (
        "Anterior chamber",
        ["Anterior eye chamber", "Anterior chamber filled with aqueous humor"]
    ),
    ("Iris", 3): (
        "Anterior chamber",
        ["Anterior eye chamber", "Anterior chamber filled with aqueous humor"]
    ),
    ("Ciliary Body", 3): (
        "Posterior chamber",
        ["Posterior eye chamber", "Posterior chamber filled with aqueous humor"]
    ),
    ("Canal of Schlemm and Aqueous Humor", 3): (
        "Angle of anterior chamber",
        ["Iridocorneal angle", "Anterior chamber angle"]
    ),
    ("Cochlea", 4): (
        "Scala vestibuli",
        ["Vestibular duct", "Scala vestibuli filled with perilymph"]
    ),
    ("External Acoustic Meatus", 2): (
        "Tympanic membrane",
        ["Eardrum", "Pars tensa", "Pars tensa of tympanic membrane"]
    ),
    ("Middle Ear and Auditory Tube", 1): (
        "Tympanic membrane",
        ["Eardrum"]
    ),
    ("Ear", 4): (
        "Cochlear duct",
        ["Scala media"]
    ),
    ("Cochlea", 2): (
        "Cochlear duct",
        ["Scala media"]
    ),
    ("Ear", 5): (
        "Pharyngotympanic tube",
        ["Auditory tube", "Eustachian tube"]
    ),
    ("Classification of Epithelia", 1): (
        "Simple squamous epithelium",
        ["Simple squamous"]
    ),
    ("Classification of Epithelia", 2): (
        "Simple cuboidal epithelium",
        ["Simple cuboidal"]
    ),
    ("Classification of Epithelia", 3): (
        "Simple columnar epithelium",
        ["Simple columnar"]
    ),
    ("Classification of Epithelia", 4): (
        "Pseudostratified columnar epithelium",
        ["Pseudostratified columnar", "Pseudostratified epithelium"]
    ),
    ("Classification of Epithelia", 5): (
        "Stratified squamous nonkeratinized epithelium",
        ["Stratified squamous nonkeratinized", "Nonkeratinized stratified squamous epithelium"]
    ),
    ("Classification of Epithelia", 6): (
        "Stratified squamous keratinized epithelium",
        ["Stratified squamous keratinized", "Keratinized stratified squamous epithelium"]
    ),
    ("Classification of Epithelia", 7): (
        "Stratified cuboidal epithelium",
        ["Stratified cuboidal"]
    ),
    ("Classification of Epithelia", 8): (
        "Stratified columnar epithelium",
        ["Stratified columnar"]
    ),
    ("Classification of Epithelia", 9): (
        "Transitional epithelium",
        ["Transitional", "Urothelium"]
    ),
    ("Thyroid", 4): (
        "Parafollicular cell",
        ["C cell", "C cells", "Parafollicular cells", "Clear cell"]
    ),
    ("Dense Connective Tissue", 4): (
        "Tendon",
        ["Dense regular connective tissue", "Dense regular connective tissue tendon"]
    ),
    ("Cells of Bone", 4): (
        "Osteoid",
        ["Newly synthesized bone", "Unmineralized bone matrix"]
    ),
    ("Nails", 3): (
        "Hyponychium",
        ["Nail bed"]
    ),
    ("Nails", 4): (
        "Distal phalanx",
        ["Bone", "Terminal phalanx"]
    ),
    ("Bone Marrow", 6): (
        "Adipocytes",
        ["Adipocyte", "Fat cells", "Fat cell"]
    ),
    ("Parathyroid", 4): (
        "Adipocytes",
        ["Adipocyte", "Fat cells", "Fat cell"]
    ),
    ("Female Reproductive System", 1): (
        "Fallopian tube",
        ["Uterine tube", "Oviduct", "Salpinx"]
    ),
    ("Female Reproductive System", 6): (
        "Graafian follicle",
        ["Mature follicle", "Mature ovarian follicle", "Tertiary follicle"]
    ),
    ("Uterine (fallopian) Tubes", 2): (
        "Ampulla of uterine tube",
        ["Ampulla of fallopian tube", "Ampulla", "Ampulla of oviduct"]
    ),
    ("Umbilical Cord", 5): (
        "Wharton's jelly",
        ["Wharton jelly", "Mucous connective tissue"]
    ),
    ("Urethra and Penis", 2): (
        "Bulbourethral gland",
        ["Cowper gland", "Cowper's gland"]
    ),
    ("Salivary Glands", 2): (
        "Parotid duct",
        ["Stensen duct", "Stensen's duct"]
    ),
    ("Esophagus", 5): (
        "Myenteric plexus",
        ["Auerbach plexus", "Auerbach's plexus"]
    ),
    ("Enteric Nervous System", 2): (
        "Myenteric plexus",
        ["Auerbach plexus", "Auerbach's plexus"]
    ),
    ("Enteric Nervous System", 3): (
        "Submucosal plexus",
        ["Meissner plexus", "Meissner's plexus"]
    ),
    ("Duodenum", 3): (
        "Brunner's gland",
        ["Brunner gland", "Brunner glands", "Duodenal gland", "Duodenal glands", "Submucosal gland"]
    ),
    ("Duodenum", 6): (
        "Crypt of Lieberkuhn",
        ["Crypts of Lieberkuhn", "Intestinal crypt", "Intestinal crypts", "Intestinal gland"]
    ),
    ("Jejunum", 2): (
        "Crypts of Lieberkuhn",
        ["Crypt of Lieberkuhn", "Intestinal crypts", "Intestinal crypt", "Intestinal glands"]
    ),
    ("Pancreas", 2): (
        "Main pancreatic duct",
        ["Pancreatic duct", "Duct of Wirsung"]
    ),
    ("Eyeball", 6): (
        "Sclera",
        ["Dense fibrous connective tissue", "Sclera of eyeball"]
    ),
    ("Trachea", 2): (
        "Hyaline cartilage",
        ["Tracheal cartilage", "Tracheal ring"]
    ),
    ("Trachea", 3): (
        "Respiratory epithelium",
        ["Pseudostratified ciliated columnar epithelium", "Pseudostratified epithelium"]
    ),
    ("Bronchus", 1): (
        "Respiratory epithelium",
        ["Pseudostratified ciliated columnar epithelium", "Pseudostratified epithelium"]
    ),
    ("Respiratory Mucosa", 1): (
        "Respiratory epithelium",
        ["Pseudostratified ciliated columnar epithelium", "Pseudostratified epithelium"]
    ),
}

# 2. Universal Acronym Mapping
ACRONYMS = {
    "rough endoplasmic reticulum": ["RER", "Rough ER"],
    "smooth endoplasmic reticulum": ["SER", "Smooth ER"],
    "red blood cell": ["RBC", "Erythrocyte"],
    "red blood cells": ["RBC", "Erythrocytes"],
    "white blood cell": ["WBC", "Leukocyte"],
    "white blood cells": ["WBC", "Leukocytes"],
    "outer mitochondrial membrane": ["OMM"],
    "inner mitochondrial membrane": ["IMM"],
    "central nervous system": ["CNS"],
    "peripheral nervous system": ["PNS"],
    "cerebrospinal fluid": ["CSF"],
    "gut-associated lymphatic tissue": ["GALT", "Gut-associated lymphoid tissue"],
    "gut-associated lymphoid tissue": ["GALT"],
    "bronchiolar associated lymphatic tissue": ["BALT", "Bronchus-associated lymphoid tissue"],
    "bronchus-associated lymphoid tissue": ["BALT"],
    "mucosa-associated lymphoid tissue": ["MALT"],
    "transmission electron microscope": ["TEM"],
    "transmission electron micrograph": ["TEM"],
    "scanning electron microscope": ["SEM"],
    "scanning electron micrograph": ["SEM"],
    "light microscope": ["LM"],
    "light micrograph": ["LM"],
    "proximal convoluted tubule": ["PCT"],
    "distal convoluted tubule": ["DCT"],
}

# 3. Universal Eponym Rules
EPONYM_PATTERNS = [
    (r"\bpeyer\'?s?\s+patch(es)?\b", ["Peyer patch", "Peyer patches", "Peyer's patch", "Peyer's patches"]),
    (r"\bkupffer\'?s?\s+cell(s)?\b", ["Kupffer cell", "Kupffer cells", "Kupffer's cell"]),
    (r"\bhassall\'?s?\s+corpuscle(s)?\b", ["Hassall corpuscle", "Hassall corpuscles", "Hassall's corpuscle", "Thymic corpuscle"]),
    (r"\bbowman\'?s?\s+capsule\b", ["Bowman capsule", "Bowman's capsule", "Glomerular capsule"]),
    (r"\bbowman\'?s?\s+(urinary\s+)?space\b", ["Bowman space", "Bowman's space", "Urinary space"]),
    (r"\bcrypt(s)?\s+of\s+lieberk[uü]hn\b", ["Crypt of Lieberkuhn", "Crypts of Lieberkuhn", "Intestinal crypt", "Intestinal crypts"]),
    (r"\bbrunner\'?s?\s+gland(s)?\b", ["Brunner gland", "Brunner glands", "Brunner's gland", "Duodenal gland"]),
    (r"\bislet(s)?\s+of\s+langerhans\b", ["Pancreatic islet", "Pancreatic islets", "Islet of Langerhans", "Islets of Langerhans"]),
    (r"\bauerbach\'?s?\s+plexus\b", ["Myenteric plexus", "Auerbach plexus", "Auerbach's plexus"]),
    (r"\bmeissner\'?s?\s+plexus\b", ["Submucosal plexus", "Meissner plexus", "Meissner's plexus"]),
    (r"\b(canal\s+of\s+schlemm|schlemm\'?s?\s+canal)\b", ["Canal of Schlemm", "Schlemm's canal", "Scleral venous sinus"]),
    (r"\bnode(s)?\s+of\s+ranvier\b", ["Node of Ranvier", "Nodes of Ranvier"]),
    (r"\bschwann\'?s?\s+cell(s)?\b", ["Schwann cell", "Schwann cells", "Schwann's cell", "Neurolemmocyte"]),
    (r"\bsertoli\'?s?\s+cell(s)?\b", ["Sertoli cell", "Sertoli cells", "Sustentacular cell"]),
    (r"\bleydig\'?s?\s+cell(s)?\b", ["Leydig cell", "Leydig cells", "Interstitial cell of Leydig"]),
    (r"\bpaneth\'?s?\s+cell(s)?\b", ["Paneth cell", "Paneth cells"]),
    (r"\bito\s+cell(s)?\b", ["Ito cell", "Ito cells", "Hepatic stellate cell"]),
    (r"\brathke\'?s?\s+(pouch|cyst(s)?)\b", ["Rathke pouch", "Rathke's pouch", "Rathke cyst", "Rathke's cyst"]),
    (r"\bgraafian\s+follicle(s)?\b", ["Graafian follicle", "Graafian follicles", "Mature follicle", "Tertiary follicle"]),
    (r"\bwharton\'?s?\s+jelly\b", ["Wharton jelly", "Wharton's jelly"]),
    (r"\bvon\s+ebner\'?s?\s+gland(s)?\b", ["Von Ebner gland", "Von Ebner's gland", "Serous lingual gland"]),
    (r"\bcowper\'?s?\s+gland(s)?\b", ["Cowper gland", "Cowper's gland", "Bulbourethral gland"]),
    (r"\bstensen\'?s?\s+duct\b", ["Stensen duct", "Stensen's duct", "Parotid duct"]),
    (r"\bwharton\'?s?\s+duct\b", ["Wharton duct", "Wharton's duct", "Submandibular duct"]),
    (r"\b(main\s+)?pancreatic\s+duct\s*\(wirsung\)\b", ["Main pancreatic duct", "Pancreatic duct", "Duct of Wirsung"]),
    (r"\bspace(s)?\s+of\s+disse\b", ["Space of Disse", "Spaces of Disse", "Perisinusoidal space"]),
    (r"\bcanal(s)?\s+of\s+hering\b", ["Canal of Hering", "Canals of Hering", "Intrahepatic bile ductule"]),
]

# 4. Standard Histological Term Synonyms
HISTOLOGY_SYNONYMS = {
    "golgi complex": ["Golgi apparatus", "Golgi body", "Golgi"],
    "golgi apparatus": ["Golgi complex", "Golgi body", "Golgi"],
    "nuclear envelope": ["Nuclear membrane"],
    "nuclear membrane": ["Nuclear envelope"],
    "basement membrane": ["Basal lamina"],
    "basal lamina": ["Basement membrane"],
    "plasma membrane": ["Cell membrane", "Plasmalemma"],
    "cell membrane": ["Plasma membrane", "Plasmalemma"],
    "desmosome": ["Macula adherens", "Desmosomes"],
    "desmosomes": ["Macula adherens", "Desmosome"],
    "hemidesmosome": ["Hemidesmosomes"],
    "hemidesmosomes": ["Hemidesmosome"],
    "tight junction": ["Zonula occludens"],
    "tight junctions": ["Zonulae occludentes", "Tight junction"],
    "intermediate junction": ["Zonula adherens", "Adherens junction"],
    "adherens junction": ["Zonula adherens", "Intermediate junction"],
    "gap junction": ["Communicating junction", "Nexus"],
    "communicating junction": ["Gap junction", "Nexus"],
    "mesothelium": ["Mesothelial cells", "Mesothelial cell"],
    "endothelium": ["Endothelial cells", "Endothelial cell"],
    "peroxisome": ["Peroxisomes"],
    "peroxisomes": ["Peroxisome"],
    "lysosome": ["Lysosomes"],
    "lysosomes": ["Lysosome"],
    "ribosome": ["Ribosomes"],
    "ribosomes": ["Ribosome"],
    "polyribosome": ["Polyribosomes", "Polysome", "Polysomes"],
    "polyribosomes": ["Polyribosome", "Polysome", "Polysomes"],
    "centriole": ["Centrioles"],
    "centrioles": ["Centriole"],
    "microtubule": ["Microtubules"],
    "microtubules": ["Microtubule"],
    "microfilament": ["Microfilaments", "Actin filament", "Actin filaments"],
    "microfilaments": ["Microfilament", "Actin filaments"],
    "caveola": ["Caveolae"],
    "caveolae": ["Caveola"],
    "crista": ["Cristae", "Mitochondrial cristae"],
    "cristae": ["Crista", "Mitochondrial cristae"],
    "haversian canal": ["Central canal"],
    "central canal": ["Haversian canal"],
    "osteon": ["Haversian system"],
    "haversian system": ["Osteon"],
    "volkmann's canal": ["Perforating canal", "Volkmann canal"],
    "volkmann canal": ["Perforating canal", "Volkmann's canal"],
    "isogenous group": ["Isogenous nest", "Isogenous groups"],
    "isogenous nest": ["Isogenous group", "Isogenous nests"],
    "hyaline cartilage": ["Hyaline cartilage tissue"],
    "elastic cartilage": ["Elastic cartilage tissue"],
    "fibrocartilage": ["Fibrous cartilage"],
    "perichondrium": ["Perichondrial layer"],
    "periosteum": ["Periosteal layer"],
    "endosteum": ["Endosteal layer"],
    "submucosa": ["Submucosal layer"],
    "muscularis mucosae": ["Muscularis mucosa"],
    "muscularis mucosa": ["Muscularis mucosae"],
    "muscularis externa": ["Muscularis propria"],
    "muscularis propria": ["Muscularis externa"],
    "tunica adventitia": ["Adventitia"],
    "adventitia": ["Tunica adventitia"],
    "tunica serosa": ["Serosa"],
    "serosa": ["Tunica serosa"],
    "tunica intima": ["Intima"],
    "intima": ["Tunica intima"],
    "tunica media": ["Media"],
    "media": ["Tunica media"],
    "glycogen rosettes": ["Glycogen", "Glycogen granules"],
}

# 5. Suffix / Morphological Variations
PLURAL_PAIRS = [
    ("villus", "villi"),
    ("microvillus", "microvilli"),
    ("cilium", "cilia"),
    ("mitochondrion", "mitochondria"),
    ("nucleus", "nuclei"),
    ("alveolus", "alveoli"),
    ("acinus", "acini"),
    ("follicle", "follicles"),
    ("duct", "ducts"),
    ("ductule", "ductules"),
    ("artery", "arteries"),
    ("vein", "veins"),
    ("capillary", "capillaries"),
    ("sinusoid", "sinusoids"),
    ("trabecula", "trabeculae"),
    ("lamella", "lamellae"),
    ("crypt", "crypts"),
    ("fiber", "fibers"),
    ("fold", "folds"),
    ("layer", "layers"),
    ("gland", "glands"),
    ("nerve", "nerves"),
    ("vessel", "vessels"),
    ("vesicle", "vesicles"),
    ("granule", "granules"),
    ("bundle", "bundles"),
    ("cord", "cords"),
    ("band", "bands"),
    ("disc", "discs"),
    ("disk", "disks"),
]

def clean_primary_and_generate_synonyms(card_title: str, label_no: int, raw_answer: str, existing_synonyms: list[str]) -> tuple[str, list[str]]:
    # Check explicit override first
    if (card_title, label_no) in EXPLICIT_OVERRIDES:
        clean_pri, add_syns = EXPLICIT_OVERRIDES[(card_title, label_no)]
        all_syns = set(existing_synonyms) | set(add_syns)
        # also add raw_answer if different
        if raw_answer.lower() != clean_pri.lower():
            all_syns.add(raw_answer)
        filtered = sorted([s for s in all_syns if s.strip() and s.lower() != clean_pri.lower()])
        return clean_pri, filtered

    ans = raw_answer.strip()
    syns = set(s.strip() for s in existing_synonyms if s.strip())

    # 1. Parentheses Handling
    # Middle: 'Plasma (cell) membrane' -> 'Plasma membrane'
    m_plasma = re.match(r"^Plasma\s*\(cell\)\s*membrane$", ans, re.I)
    if m_plasma:
        ans = "Plasma membrane"
        syns.update(["Cell membrane", "Plasma cell membrane"])

    m_gap = re.match(r"^Gap\s*\(communicating\)\s*junction$", ans, re.I)
    if m_gap:
        ans = "Gap junction"
        syns.update(["Communicating junction", "Gap communicating junction"])

    m_hydro = re.match(r"^Hydrophilic\s+channel\s*\(pore\)$", ans, re.I)
    if m_hydro:
        ans = "Hydrophilic channel"
        syns.update(["Pore", "Hydrophilic pore", "Channel"])

    m_conn = re.match(r"^Connexon\s*\(hexamer\)$", ans, re.I)
    if m_conn:
        ans = "Connexon"
        syns.add("Connexon hexamer")

    m_npore = re.match(r"^Nuclear\s+pore\s*\(complex\)$", ans, re.I)
    if m_npore:
        ans = "Nuclear pore"
        syns.add("Nuclear pore complex")

    m_nuc_hetero = re.match(r"^Nucleus\s*\(with\s+heterochromatin\)$", ans, re.I)
    if m_nuc_hetero:
        ans = "Nucleus"
        syns.update(["Heterochromatin", "Nucleus with heterochromatin"])

    m_cyto_cytosol = re.match(r"^Cytoplasm\s*\(Cytosol\)$", ans, re.I)
    if m_cyto_cytosol:
        ans = "Cytoplasm"
        syns.add("Cytosol")

    m_paren = re.search(r"^(.*?)\s*\(([^)]+)\)\s*(.*?)$", ans)
    if m_paren and "(" in ans:
        prefix = m_paren.group(1).strip()
        inside = m_paren.group(2).strip()
        suffix = m_paren.group(3).strip()

        # Acronym inside: e.g. 'Rough endoplasmic reticulum (RER)'
        if re.match(r"^[A-Z0-9]+$", inside):
            base = f"{prefix} {suffix}".strip()
            ans = base
            syns.add(inside)
        # 'or ...' / 'also called ...'
        elif re.match(r"^(?:or|also called)\s+", inside, re.I):
            alt_name = re.sub(r"^(?:or|also called)\s+", "", inside, flags=re.I).strip()
            base = f"{prefix} {suffix}".strip()
            ans = base
            syns.add(alt_name)
        # descriptive/context: e.g. 'Tendon (dense regular connective tissue)'
        elif not suffix and len(inside.split()) <= 4 and not re.match(r"^(?:of|in|with|at)\b", inside, re.I):
            # inside is an alternative name: e.g. 'Urothelium', 'adipocytes'
            base = prefix
            ans = base
            syns.add(inside)
        else:
            base = f"{prefix} {suffix}".strip()
            ans = base
            if not re.match(r"^(?:of|in|with|at)\b", inside, re.I) and len(inside.split()) <= 3:
                syns.add(inside)

    # 2. General Acronym Enrichment
    ans_lower = ans.lower()
    for full_term, acro_list in ACRONYMS.items():
        if full_term in ans_lower:
            for acro in acro_list:
                syns.add(acro)
                # also try replacing in answer if phrase: e.g. 'Cisterna of rough endoplasmic reticulum' -> 'Cisterna of RER'
                if full_term != ans_lower:
                    syns.add(re.sub(re.escape(full_term), acro, ans, flags=re.I))

    # 3. Universal Eponym Enrichment
    for pattern, e_syns in EPONYM_PATTERNS:
        if re.search(pattern, ans, re.I):
            for es in e_syns:
                syns.add(es)

    # 4. Epithelium flexibility:
    # If ends with 'epithelium', add version without 'epithelium' (e.g. 'Simple cuboidal epithelium' -> 'Simple cuboidal')
    if ans.lower().endswith(" epithelium"):
        without_ep = ans[:-11].strip()
        if len(without_ep) >= 5:
            syns.add(without_ep)
    # If starts with 'Simple ' or 'Stratified ' or 'Pseudostratified ' but without 'epithelium':
    elif re.match(r"^(?:Simple|Stratified|Pseudostratified|Transitional)\s+(?:squamous|cuboidal|columnar)", ans, re.I):
        syns.add(f"{ans} epithelium")

    # Nonkeratinized vs Non-keratinized
    if "nonkeratinized" in ans.lower():
        syns.add(re.sub(r"nonkeratinized", "non-keratinized", ans, flags=re.I))
    elif "non-keratinized" in ans.lower():
        syns.add(re.sub(r"non-keratinized", "nonkeratinized", ans, flags=re.I))

    # 5. Cell / Cells (Singular <-> Plural)
    if ans.lower().endswith(" cell"):
        syns.add(ans + "s")
    elif ans.lower().endswith(" cells"):
        syns.add(ans[:-1])

    # -cyte <-> -cytes, -blast <-> -blasts, -clast <-> -clasts
    for stem in ["cyte", "blast", "clast"]:
        if ans.lower().endswith(stem):
            syns.add(ans + "s")
        elif ans.lower().endswith(stem + "s"):
            syns.add(ans[:-1])

    # Common anatomical plural pairs
    for sing, plur in PLURAL_PAIRS:
        if ans.lower().endswith(sing):
            syns.add(ans[:-len(sing)] + plur)
        elif ans.lower().endswith(plur):
            syns.add(ans[:-len(plur)] + sing)

    # 6. Eponym apostrophe flexibility (e.g. "Peyer's patch" <-> "Peyer patch")
    if "'s" in ans or "’s" in ans:
        syns.add(re.sub(r"['’]s\b", "", ans))
    elif re.search(r"\b(Peyer|Kupffer|Hassall|Bowman|Brunner|Schwann|Sertoli|Leydig|Paneth|Rathke|Wharton|Cowper|Stensen)\b", ans):
        # try adding 's
        syns.add(re.sub(r"\b(Peyer|Kupffer|Hassall|Bowman|Brunner|Schwann|Sertoli|Leydig|Paneth|Rathke|Wharton|Cowper|Stensen)\b", r"\1's", ans))

    # 7. Standard Histology Dictionary Synonyms
    if ans.lower() in HISTOLOGY_SYNONYMS:
        for hs in HISTOLOGY_SYNONYMS[ans.lower()]:
            syns.add(hs)

    # 8. Pattern "Lumen of [X]" -> "[X] lumen", "[X]"
    m_lumen = re.match(r"^Lumen\s+of\s+(.+)$", ans, re.I)
    if m_lumen:
        target = m_lumen.group(1).strip()
        syns.add(f"{target} lumen")
        syns.add(target)
        syns.add("Lumen")

    # 10. Pattern "[A] or [B]" in answer -> add [A] and [B]
    m_or = re.search(r"^(.+?)\s+or\s+(.+)$", ans, re.I)
    if m_or:
        syns.add(m_or.group(1).strip())
        syns.add(m_or.group(2).strip())

    # 11. Gland morphological classifications
    if re.match(r"^(?:Simple|Compound)\s+(?:tubular|acinar|tubulo-acinar|alveolar)", ans, re.I):
        syns.add(f"{ans} gland")
        syns.add(f"{ans} glands")

    # 12. Monomer / Polymer: e.g. "Connexin monomer" -> "Connexin"
    if ans.lower().endswith(" monomer"):
        syns.add(ans[:-8].strip())

    # 13. Fibrils / Droplets / Leukocytes / Nucleolus
    if ans.lower().endswith(" fibril"):
        syns.add(ans + "s")
        syns.add(ans[:-7] + " fiber")
        syns.add(ans[:-7] + " fibers")
    elif ans.lower().endswith(" droplet"):
        syns.add(ans + "s")
    elif ans.lower().endswith(" droplets"):
        syns.add(ans[:-1])

    if ans.lower() == "nucleolus":
        syns.add("Nucleoli")
    elif ans.lower() == "nucleoli":
        syns.add("Nucleolus")

    if ans.lower() in ["eosinophil", "basophil", "neutrophil", "monocyte", "lymphocyte"]:
        syns.add(ans + "s")
    elif ans.lower() in ["eosinophils", "basophils", "neutrophils", "monocytes", "lymphocytes"]:
        syns.add(ans[:-1])

    if ans.lower() == "collagen":
        syns.update(["Collagen fibers", "Collagen fiber"])

    if "trans-surface of golgi" in ans.lower() or "trans surface of golgi" in ans.lower():
        syns.update(["Trans Golgi network", "Trans face of Golgi", "Trans-Golgi"])
    elif "cis-surface of golgi" in ans.lower() or "cis surface of golgi" in ans.lower():
        syns.update(["Cis face of Golgi", "Cis-Golgi"])

    # Clean up syns: remove empty, remove duplicates matching primary (case-insensitively)
    final_syns = []
    seen = {ans.lower()}
    for s in sorted(syns):
        s_clean = s.strip()
        if len(s_clean) >= 2 and s_clean.lower() not in seen:
            seen.add(s_clean.lower())
            final_syns.append(s_clean)

    return ans, final_syns

def main():
    if not CARDS_JSON.exists():
        print(f"File not found: {CARDS_JSON}")
        sys.exit(1)

    with open(CARDS_JSON, "r") as f:
        cards = json.load(f)

    print(f"Loaded {len(cards)} cards from {CARDS_JSON}")

    # Track metrics
    total_labels = 0
    cleaned_primary_count = 0
    enriched_synonyms_count = 0
    zero_syn_before = 0
    zero_syn_after = 0
    intra_card_collisions_resolved = 0

    for card in cards:
        card_title = card.get("title", "")
        labels = card.get("labels", [])
        total_labels += len(labels)

        # 1. Clean primary and generate candidate synonyms
        new_labels = []
        for l in labels:
            raw_ans = l["answer"]
            raw_syns = l.get("synonyms", [])
            if len(raw_syns) == 0:
                zero_syn_before += 1

            clean_ans, clean_syns = clean_primary_and_generate_synonyms(
                card_title, l["label_no"], raw_ans, raw_syns
            )

            if clean_ans != raw_ans:
                cleaned_primary_count += 1
            if len(clean_syns) > len(raw_syns):
                enriched_synonyms_count += 1

            new_labels.append({
                "label_no": l["label_no"],
                "answer": clean_ans,
                "synonyms": clean_syns
            })

        # 2. Intra-card Collision Resolution:
        # If two labels on the same card have the same answer or share a synonym, prune colliding synonyms!
        card_answers_lower = {l["answer"].lower(): l["label_no"] for l in new_labels}

        # Check each label's synonyms
        for i, l in enumerate(new_labels):
            pruned_syns = []
            for s in l["synonyms"]:
                s_lower = s.lower()
                # Check collision with other labels' primary answer on this card
                if s_lower in card_answers_lower and card_answers_lower[s_lower] != l["label_no"]:
                    intra_card_collisions_resolved += 1
                    continue
                # Check collision with other labels' synonyms on this card
                collides_with_other = False
                for other in new_labels:
                    if other["label_no"] != l["label_no"]:
                        if s_lower in [os.lower() for os in other["synonyms"]]:
                            collides_with_other = True
                            break
                if collides_with_other:
                    intra_card_collisions_resolved += 1
                    continue

                pruned_syns.append(s)
            l["synonyms"] = pruned_syns

            if len(l["synonyms"]) == 0:
                zero_syn_after += 1

        card["labels"] = new_labels

    print("\n--- CURATION RESULTS ---")
    print(f"Total Cards: {len(cards)}")
    print(f"Total Labels: {total_labels}")
    print(f"Cleaned Primary Answers: {cleaned_primary_count}")
    print(f"Enriched Synonyms Count: {enriched_synonyms_count}")
    print(f"Intra-card Synonym Collisions Pruned: {intra_card_collisions_resolved}")
    print(f"Labels with Zero Synonyms BEFORE: {zero_syn_before} ({zero_syn_before/total_labels*100:.1f}%)")
    print(f"Labels with Zero Synonyms AFTER:  {zero_syn_after} ({zero_syn_after/total_labels*100:.1f}%)")

    # Save to cards.json
    with open(CARDS_JSON, "w") as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)
    print(f"\n✓ Successfully updated {CARDS_JSON} with curated answers & synonyms.")

if __name__ == "__main__":
    main()
