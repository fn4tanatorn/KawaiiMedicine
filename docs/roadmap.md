# แผนพัฒนาฟีเจอร์ — จากผลสำรวจนักเรียน (ก.ย. 2569)

> เอกสารนี้เป็น living doc: Claude Code (agent) อ่านได้ทุกครั้งที่ทำงานในโปรเจกต์นี้
> (อ้างถึงจาก [AGENTS.md](../AGENTS.md)) และควรอัปเดต checkbox + "Log การอัปเดต"
> ทุกครั้งที่ทำงานใน phase ใด ๆ เสร็จ หรือเมื่อมีการตัดสินใจใหม่เกี่ยวกับ roadmap นี้.

## ที่มาข้อมูล

- แบบสำรวจ Google Form "(!สำคัญ) แบบสำรวจความคิดเห็นเรื่องการเรียนและการสอบ"
  — 39 responses, เก็บข้อมูล 10-11 ก.ย. 2569
- Retention: 100% ของผู้ตอบอยากเรียนต่อ → ไม่มี churn risk เร่งด่วน,
  priority ควรเน้น "เพิ่มมูลค่าการเรียน" มากกว่าการแก้ปัญหาความพึงพอใจ
- เลขที่อ้างถึงแต่ละข้อ (เช่น #18) คือลำดับแถวคำตอบในไฟล์ผลสำรวจต้นฉบับ

## สถานะภาพรวม

| Phase | เนื้อหา | สถานะ |
|---|---|---|
| 6 | Quick wins (ต่อยอดของเดิม) | 🟡 In progress (1/3 verified ready) |
| 7 | Quiz ต่อวิดีโอ + Study planner | 🔲 Not started |
| 8 | MedLexicon คลังคำศัพท์ | 🔲 Not started |
| 9 | Big bets (AI Q&A / 3D / Community) | 🔲 Not started — ยังไม่ commit ทำ |

*(อัปเดตแถวนี้ทุกครั้งที่สถานะ phase เปลี่ยน: Not started → In progress → Done)*

---

## Phase 6 — Quick wins (ต่อยอดของเดิม แทบไม่ต้องเขียนโค้ดใหม่)

- [x] **สอบแบบ self-paced window** — ใช้ `exams.opens_at` / `closes_at` / `max_attempts`
  ที่มีอยู่แล้ว (`supabase/migrations/20260913140000_exam_window_attempts.sql`)
  ยืนยันแล้วว่า UI กรอกฟิลด์พวกนี้มีพร้อมใน `src/app/admin/exams/[id]/page.tsx`
  (พร้อมแสดงสถานะปัจจุบันของ exam ด้วย) → ไม่ต้อง dev เพิ่ม เหลือแค่ใช้งาน:
  ตั้งค่าตอนสร้าง exam ครั้งหน้า + สื่อสารกับนักเรียน
  (85% ของผู้ตอบแบบสำรวจ — 33/39 — เลือกรูปแบบนี้แทน Google Meet)
- [ ] **Check-in / reminder UI** — ต่อยอด streak tracking
  (`supabase/migrations/20260914094503_add_streak_tracking.sql`)
  เพิ่ม UI เตือน/เด้งอัตโนมัติแทนต้องกดหา (ตาม #7, #20, #25)
- [ ] **หน้าคอร์สภาพรวม/roadmap** — เพิ่มภาพรวมลำดับวิดีโอ + objective
  บนหน้า `/learn/[slug]` (ตาม #17, #21, #22)

### นอก survey (คำขอจากผู้สอน / admin)

- [x] **แนบสไลด์ PDF ให้นักเรียนดาวน์โหลด** — 1 คอร์สมีหลายไฟล์, 1 ไฟล์ผูกได้หลายวิดีโอ
  (บทเรียนที่แบ่งหลายตอน), ไฟล์ละไม่เกิน 100 MB. ตาราง `course_files` + `video_files`,
  bucket private `course-files`, ดาวน์โหลดผ่าน `/learn/files/[fileId]` (signed URL อายุ 60 วิ)
  ⚠️ project ตั้ง global upload limit ไว้ที่ 50 MB → ไฟล์ 50–100 MB จะอัปไม่ผ่านจนกว่าจะเพิ่มใน
  Dashboard → Storage → Settings (ต้องใช้ Pro plan)
- [x] **สถิติเวลาเรียนต่อวิดีโอ** — `/admin/learning-time` แสดงมัธยฐาน/เฉลี่ยของ
  (A) ช่วงวันเปิดครั้งแรก→ดูจบ และ (B) จำนวนวันที่เข้ามาดูจนดูจบ, นับวันตาม Asia/Bangkok,
  ดูจบวันเดียว = 1 วัน, นับเฉพาะ role student. ข้อมูลเริ่มนับตั้งแต่ deploy
  (`video_progress.started_at/completed_at` + ตาราง `video_watch_days`)
- [x] **ภาพรวมว่านักเรียนดูวิดีโอทันการลงคลิปไหม** — `/admin/learning-time` ตัวเลือก "ทุกคอร์ส"
  (ค่าเริ่มต้น): การ์ดสรุป วิดีโอที่ลงแล้ว / ดูจบเฉลี่ย+มัธยฐานต่อนักเรียน / ยังไม่เริ่มดูเลย,
  ตารางรายคลิปเพิ่ม วันที่ลง, % ดูจบ (หารนักเรียนทั้งหมด), ยังไม่เปิด. เพิ่ม `videos.published_at`
  (trigger, วันที่เผยแพร่ครั้งแรก; คลิปเก่าใช้ `created_at`) + RPC `get_video_progress_summary()`
- [ ] **แสดง "ดูจบเฉลี่ย" ฝั่งนักเรียน** (คำขอนักเรียน ไม่ได้มาจาก survey) — การ์ดในหน้า
  `/learn/[slug]` โชว์ % ดูจบเฉลี่ยของทั้งคอร์ส (anonymous, ไม่มีข้อมูลรายคน) เทียบกับเป้า 60%
  ที่ตกลงกับนักเรียนไว้ว่าจะลงคลิปใหม่เมื่อถึง — RPC ใหม่ `get_course_progress_pace()`
  (security definer เพราะนักเรียนเห็น RLS แค่แถวตัวเอง, คืนแค่ค่าเฉลี่ยรวม ไม่มี per-student)

## Phase 7 — Medium effort, impact สูงสุดจาก survey

- [ ] **Quiz ผูกกับวิดีโอ** — ฟีเจอร์ที่ถูกขอมากที่สุด (7/39 คน: #18, #19, #26, #29, #33, #36, #40)
  ต่อยอด schema `exams` / `questions` / `choices` เดิม เพิ่มความสัมพันธ์กับ `video_id`,
  ทำ UI แบบสั้น/inline ไม่ใช่ exam เต็มรูปแบบ
- [ ] **Study planner เบื้องต้น** — ตั้งเป้าเวลาเรียน/สัปดาห์ (#16, #37)

## Phase 8 — ต้อง content investment

- [ ] **MedLexicon คลังคำศัพท์แพทย์** (#3, #9, #30) — ต้อง curate คำศัพท์เอง ไม่ auto-generate

## Phase 9 — Big bets (ประเมินความเสี่ยง/ทรัพยากรก่อนเริ่ม ทีละเคส)

- [ ] **AI Q&A** (#2, #13, #28) — ต้องมี guardrail ความถูกต้องทางการแพทย์
  ก่อนเริ่มต้องตัดสินใจเรื่อง LLM provider / cost / liability
- [ ] **3D anatomy models / disease-detective game** (#8, #11, #12, #31, #34)
  — ต้อง 3D asset, effort สูงมาก
- [ ] **Community chat** (#32, #38, #39) — ต้องมี moderation policy ก่อนเริ่ม

## Backlog (ไอเดียเดี่ยว ยังไม่ prioritize)

- Symptom checker (#8) · Minigame (#15) · Obsidian-style note linking (#6)
- PDF textbook library ที่ถูกลิขสิทธิ์ (#27) — งาน content/legal ไม่ใช่ dev

## Non-dev (แยกไปตัดสินใจต่างหาก)

- ชื่อเว็บใหม่ (branding) — ดูรายชื่อที่นักเรียนเสนอในสรุปแยก ถ้าต้องการ
- เนื้อหาจริยธรรมแพทย์เพิ่มเติม (#24) — งาน content

---

## Log การอัปเดต

- 2026-09-15 — สร้างเอกสาร วิเคราะห์จากผลสำรวจ 39 responses ครั้งแรก, ยังไม่เริ่ม phase ใด
- 2026-09-15 — verify self-paced exam window: UI พร้อมใช้แล้วใน `admin/exams/[id]`, ไม่ต้อง dev เพิ่ม, marked done — เหลือแค่ operational (ตั้งค่า + สื่อสารกับนักเรียน)
- 2026-09-17 — เพิ่มฟีเจอร์แนบสไลด์ PDF (คำขอผู้สอน ไม่ได้มาจาก survey) — PR เปิดแล้ว รอ merge + `supabase db push`
- 2026-09-17 — เพิ่มสถิติเวลาเรียนต่อวิดีโอ (คำขอ admin) — PR เปิดแล้ว รอ merge + `supabase db push`
- 2026-09-17 — merge PR #6 + #7 และ `supabase db push` แล้ว: แนบสไลด์ PDF และสถิติเวลาเรียนต่อวิดีโอใช้งานได้บน production (สถิติเริ่มนับจากวันนี้; 24 แถว video_progress เดิมไม่มี started_at จึงไม่ถูกนับ)
- 2026-09-17 — เพิ่มภาพรวม "ดูทันการลงคลิปไหม" ในหน้าเวลาเรียน (คำขอ admin) — PR เปิดแล้ว รอ merge + `supabase db push`
- 2026-09-17 — merge PR #8 และ `supabase db push` แล้ว: ภาพรวม "ทุกคอร์ส" ใช้งานได้บน production (`published_at` ของ 3 คลิปเดิม backfill จาก `created_at`)
- 2026-09-17 — พบว่าคลิป YouTube ไม่ถูกบันทึกความคืบหน้าอัตโนมัติ (นับได้แค่ตอนกดปุ่ม "ดูจบแล้ว") → แก้ตัวเล่นให้ใช้ YouTube IFrame Player API บันทึกระหว่างดู/หยุด/จบ และเล่นต่อจากจุดเดิม — PR เปิดแล้ว
- 2026-09-17 — merge PR #9: ติดตามความคืบหน้าคลิป YouTube ใช้งานบน production แล้ว (ข้อมูลก่อนหน้านี้มาจากการกดปุ่ม "ดูจบแล้ว" เท่านั้น)
- 2026-09-19 — เพิ่มการแสดง "ดูจบเฉลี่ย" ฝั่งนักเรียนที่หน้า `/learn/[slug]` เทียบกับเป้า 60% (คำขอนักเรียน) — PR เปิดแล้ว รอ merge + `supabase db push`
