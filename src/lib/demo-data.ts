/**
 * Mock data & configuration for the Public Class Demo (/demo).
 * Designed for zero-login prospective learners to sample KawaiiMedicine
 * before filling out the Google Form to join the class.
 */

export const REGISTRATION_FORM_URL =
  process.env.NEXT_PUBLIC_CLASS_REGISTRATION_URL ||
  "https://forms.gle/KawaiiMedicineClass";

export interface DemoIdentifyCard {
  id: string;
  title: string;
  subject: string;
  category: string;
  description: string;
  labels: {
    labelNo: number;
    answer: string;
    synonyms: string[];
    hint?: string;
  }[];
  svgType: "bone" | "stomach" | "heart";
}

export const DEMO_IDENTIFY_CARDS: DemoIdentifyCard[] = [
  {
    id: "demo-bone",
    title: "โครงสร้าง Osteon (Compact Bone)",
    subject: "Histology",
    category: "Skeletal System",
    description: "ระบบฮาเวอร์เชียน (Haversian system) ซึ่งเป็นหน่วยโครงสร้างพื้นฐานของกระดูกแข็ง",
    svgType: "bone",
    labels: [
      {
        labelNo: 1,
        answer: "Haversian canal",
        synonyms: ["Central canal", "Haversian", "Central", "ท่อฮาเวอร์เชียน"],
        hint: "ท่อตรงกลางที่มีหลอดเลือดและเส้นประสาททอดผ่าน",
      },
      {
        labelNo: 2,
        answer: "Osteocyte",
        synonyms: ["Osteocytes", "Lacuna", "Lacunae", "เซลล์กระดูก"],
        hint: "เซลล์กระดูกที่ฝังตัวอยู่ในช่อง Lacuna",
      },
      {
        labelNo: 3,
        answer: "Canaliculi",
        synonyms: ["Canaliculus", "คานาลิคูลัส"],
        hint: "ท่อแขนงจิ๋วที่เชื่อมต่อระหว่าง Lacunae เพื่อแลกเปลี่ยนสารอาหาร",
      },
      {
        labelNo: 4,
        answer: "Concentric lamellae",
        synonyms: ["Lamellae", "Lamella", "Concentric lamella"],
        hint: "ชั้นของเนื้อกระดูกที่เรียงตัวซ้อนกันเป็นวงกลมรอบท่อกลาง",
      },
    ],
  },
  {
    id: "demo-stomach",
    title: "ต่อมในกระเพาะอาหาร (Gastric Gland)",
    subject: "Histology",
    category: "Gastrointestinal",
    description: "เซลล์สำคัญในชั้นเยื่อเมือกของกระเพาะอาหารส่วน Fundus และ Body",
    svgType: "stomach",
    labels: [
      {
        labelNo: 1,
        answer: "Parietal cell",
        synonyms: ["Oxyntic cell", "Parietal", "Oxyntic"],
        hint: "เซลล์ทรงพีระมิดติดสีแดงชมพู (Eosinophilic) ทำหน้าที่หลั่ง HCl และ Intrinsic factor",
      },
      {
        labelNo: 2,
        answer: "Chief cell",
        synonyms: ["Peptic cell", "Zymogenic cell", "Chief"],
        hint: "เซลล์ติดสีม่วงเข้ม (Basophilic) อยู่ส่วนก้นต่อม ทำหน้าที่หลั่ง Pepsinogen",
      },
      {
        labelNo: 3,
        answer: "Mucous neck cell",
        synonyms: ["Mucous cell", "Neck cell"],
        hint: "เซลล์ที่อยู่บริเวณคอต่อม ทำหน้าที่หลั่งเมือกปกป้องผนังกระเพาะ",
      },
    ],
  },
  {
    id: "demo-heart",
    title: "ระบบนำไฟฟ้าหัวใจ (Cardiac Conduction)",
    subject: "Physiology",
    category: "Cardiovascular",
    description: "ทางเดินกระแสประสาทกระตุ้นการเต้นของหัวใจแบบเป็นจังหวะ",
    svgType: "heart",
    labels: [
      {
        labelNo: 1,
        answer: "SA node",
        synonyms: ["Sinoatrial node", "Sinus node"],
        hint: "เครื่องกระตุ้นจังหวะธรรมชาติ (Primary pacemaker) อยู่บริเวณขั้ว Superior vena cava",
      },
      {
        labelNo: 2,
        answer: "AV node",
        synonyms: ["Atrioventricular node"],
        hint: "ชุมทางหน่วงสัญญาณไฟฟ้าประมาณ 0.1 วินาที เพื่อให้ห้องบนบีบเลือดลงห้องล่างก่อน",
      },
      {
        labelNo: 3,
        answer: "Bundle of His",
        synonyms: ["AV bundle", "Atrioventricular bundle"],
        hint: "มัดเส้นใยนำไฟฟ้าที่เจาะทะลุผ่าน Fibrous skeleton เข้าสู่ Interventricular septum",
      },
      {
        labelNo: 4,
        answer: "Purkinje fibers",
        synonyms: ["Purkinje fiber", "Purkinje"],
        hint: "เส้นใยปลายทางที่นำกระแสไฟฟ้ารวดเร็วไปยังกล้ามเนื้อหัวใจห้องล่าง",
      },
    ],
  },
];

export interface DemoExamQuestion {
  id: number;
  stem: string;
  subject: string;
  choices: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  clinicalPearl: string;
}

export const DEMO_EXAM_QUESTIONS: DemoExamQuestion[] = [
  {
    id: 1,
    subject: "Cardiovascular Pharmacology",
    stem: "ผู้ป่วยชายอายุ 58 ปี มาตรวจสุขภาพประจำปี ตรวจพบระดับความดันโลหิต 152/94 mmHg แพทย์วินิจฉัยเป็น Essential hypertension และเริ่มให้การรักษาด้วยยาลดความดันกลุ่ม ACE inhibitor (Enalapril) หลังจากรับประทานยาได้ 2 สัปดาห์ ผู้ป่วยกลับมาด้วยอาการไอแห้งๆ (dry cough) ต่อเนื่อง ไม่มีไข้ ไม่มีเสมหะ กลไกใดอธิบายสาเหตุของอาการไอในผู้ป่วยรายนี้ได้ถูกต้องที่สุด?",
    choices: [
      {
        id: "A",
        text: "การคั่งของ Bradykinin และ Substance P ในทางเดินหายใจ",
        isCorrect: true,
        explanation:
          "ถูกต้อง! ACE (Angiotensin-Converting Enzyme) ทำหน้าที่สลาย Bradykinin และ Substance P ด้วย เมื่อถูกยับยั้ง สารเหล่านี้จะสะสมในทางเดินหายใจ กระตุ้น C-fibers จนเกิดอาการไอแห้ง (พบได้ 5-20% ของผู้ใช้ ACEi)",
      },
      {
        id: "B",
        text: "การลดลงของ Angiotensin II ทำให้หลอดลมตีบตัว",
        isCorrect: false,
        explanation:
          "ผิด — การลดลงของ Angiotensin II ช่วยขยายหลอดเลือดและลดความดันโลหิต ไม่ได้เป็นสาเหตุของการกระตุ้นให้หลอดลมระคายเคืองจนไอ",
      },
      {
        id: "C",
        text: "การยับยั้ง Aldosterone ส่งผลให้เกิด Hyperkalemia กระตุ้นทางเดินหายใจ",
        isCorrect: false,
        explanation:
          "ผิด — แม้ ACE inhibitor จะลด Aldosterone และอาจทำให้โพแทสเซียมในเลือดสูงได้ แต่ภาวะนี้ไม่ได้เป็นสาเหตุของอาการไอแห้ง",
      },
      {
        id: "D",
        text: "การกระตุ้น Beta-2 adrenergic receptors ที่กล้ามเนื้อเรียบหลอดลม",
        isCorrect: false,
        explanation:
          "ผิด — การกระตุ้น Beta-2 receptor จะทำให้หลอดลมขยายตัว (Bronchodilation) มักใช้เป็นยารักษาโรคหอบหืด ไม่ได้ทำให้ไอ",
      },
      {
        id: "E",
        text: "การหลั่ง Histamine ปริมาณมากจาก Mast cell ในถุงลมปอด",
        isCorrect: false,
        explanation:
          "ผิด — อาการไอจาก ACEi ไม่ได้เกิดจากปฏิกิริยาแพ้ Type I ที่ผ่าน Histamine หากผู้ป่วยทนอาการไอไม่ได้ ทางเลือกมาตรฐานคือเปลี่ยนไปใช้ยาตระกูล ARB (เช่น Losartan)",
      },
    ],
    clinicalPearl:
      "Clinical Pearl: หากผู้ป่วยเกิด dry cough จาก ACE inhibitor ให้สลับไปใช้ยากลุ่ม ARB (Angiotensin Receptor Blocker) ซึ่งไม่ออกฤทธิ์ขัดขวางการสลายตัวของ Bradykinin จึงไม่ทำให้เกิดอาการไอ",
  },
  {
    id: 2,
    subject: "Pulmonary Pathology",
    stem: "ชายอายุ 65 ปี ประวัติสูบบุหรี่จัด 40 pack-years มาพบแพทย์ด้วยอาการไอเรื้อรังและไอเป็นเลือด (Hemoptysis) น้ำหนักลด 5 kg ใน 2 เดือน ผล CT chest พบก้อนเนื้อบริเวณขั้วปอดด้านขวา (Central hilar mass) ขนาด 4.5 cm แพทย์ส่องกล้องตัดชิ้นเนื้อ (Bronchoscopic biopsy) ตรวจพบเซลล์มะเร็งเรียงตัวเป็นกลุ่ม มี Keratin pearls และ Intercellular bridges ชัดเจน การวินิจฉัยข้อใดถูกต้องที่สุด?",
    choices: [
      {
        id: "A",
        text: "Squamous cell carcinoma",
        isCorrect: true,
        explanation:
          "ถูกต้อง! ลักษณะจำเพาะ (Pathognomonic) ของ Squamous cell carcinoma ของปอดคือ: (1) สัมพันธ์กับประวัติสูบบุหรี่สูง, (2) ตำแหน่งมักอยู่ส่วนกลางขั้วปอด (Central mass), (3) จุลพยาธิวิทยาพบ Keratinization / Keratin pearls และ Intercellular bridges (Desmosomes) อย่างชัดเจน",
      },
      {
        id: "B",
        text: "Adenocarcinoma",
        isCorrect: false,
        explanation:
          "ผิด — Adenocarcinoma มักเกิดบริเวณชายปอด (Peripheral) และจุลพยาธิวิทยาจะพบการสร้างท่อต่อม (Gland formation) หรือหลั่ง Mucin (Mucin positive)",
      },
      {
        id: "C",
        text: "Small cell lung carcinoma",
        isCorrect: false,
        explanation:
          "ผิด — Small cell carcinoma จะพบเซลล์กลมเล็ก นิวเคลียสแน่นเกือบชิดขอบ (High N:C ratio), Salt-and-pepper chromatin และเกิด Crush artifact ได้บ่อย ไม่พบ Keratin pearls",
      },
      {
        id: "D",
        text: "Large cell carcinoma",
        isCorrect: false,
        explanation:
          "ผิด — เป็นมะเร็งชนิด Undifferentiated ที่ไม่มีลักษณะจำเพาะของทั้ง Glandular หรือ Squamous differentiation",
      },
      {
        id: "E",
        text: "Carcinoid tumor",
        isCorrect: false,
        explanation:
          "ผิด — Carcinoid tumor เป็น Neuroendocrine neoplasm เซลล์เรียงตัวเป็น Trabecular/Nests ที่ดูเรียบร้อย (Uniform cells) มักไม่สัมพันธ์กับการสูบบุหรี่",
      },
    ],
    clinicalPearl:
      "Mnemonic จำง่าย: \"S for Central\": Squamous cell carcinoma และ Small cell carcinoma มักเป็นก้อนส่วนกลาง (Central hilar) และสัมพันธ์กับการสูบบุหรี่จัด (Smoking)",
  },
];

export const DEMO_LOUNGE_POSTS = [
  {
    alias: "แมวส้มอ่านหนังสือ",
    avatar: "🐱",
    mood: "พร้อมลุย 💪",
    text: "อ่านเรื่อง Histology Bone จบแล้ว ระบบ Identify ช่วยจำภาพง่ายขึ้นเยอะเลย เป็นกำลังใจให้ทุกคนนะ!",
    reactions: { love: 18, hug: 12, coffee: 25, fight: 34 },
  },
  {
    alias: "เพนกวินง่วงนอน",
    avatar: "🐧",
    mood: "เติมกาแฟ ☕",
    text: "แก้วที่ 2 ของวันแล้วครับ วิดีโอสรุปพาโถย่อยง่ายดี สู้ไปด้วยกันนะเพื่อนๆ",
    reactions: { love: 22, hug: 15, coffee: 40, fight: 29 },
  },
];
