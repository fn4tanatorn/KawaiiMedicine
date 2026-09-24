"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btn, card, input, label } from "@/components/ui";
import { createIdCard } from "./actions";
import { parseLabelLines } from "./parse-labels";
import {
  OrganSystemPicker,
  type OrganSystem,
} from "@/components/organ-system-picker";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;
const PLACEHOLDER = `1. Frontal bone
2. Supraorbital notch (foramen)
3. Nasal bone | nasal`;

export function CardForm({ organSystems }: { organSystems: OrganSystem[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("anatomy");
  const [file, setFile] = useState<File | null>(null);
  const [labels, setLabels] = useState("");
  const [systemIds, setSystemIds] = useState<number[]>([]);
  const [openAll, setOpenAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const parsed = parseLabelLines(labels);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setMsg({ ok: false, text: "กรุณาเลือกรูป" });
    if (file.size > MAX_BYTES)
      return setMsg({ ok: false, text: "ไฟล์ใหญ่เกิน 10MB" });
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `identify/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("question-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setBusy(false);
      return setMsg({ ok: false, text: error.message });
    }
    const res = await createIdCard({
      title,
      subject,
      imagePath: path,
      labels,
      organSystemIds: systemIds,
      openAll,
    });
    setBusy(false);
    if (!res.ok) {
      await supabase.storage.from("question-images").remove([path]);
      return setMsg({ ok: false, text: res.error });
    }
    setTitle("");
    setSystemIds([]);
    setLabels("");
    setFile(null);
    (e.target as HTMLFormElement).reset();
    setMsg(
      res.warning
        ? { ok: false, text: res.warning }
        : { ok: true, text: "เพิ่มการ์ดแล้ว" },
    );
    router.refresh();
  }

  return (
    <form onSubmit={submit} className={`${card} h-fit space-y-4`}>
      <h2 className="font-semibold">เพิ่มการ์ด</h2>
      <label className={label}>
        <span>ชื่อการ์ด</span>
        <input
          className={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Skull — anterior view"
          required
        />
      </label>
      <label className={label}>
        <span>หมวด</span>
        <select
          className={input}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="anatomy">Anatomy</option>
          <option value="histology">Histology</option>
        </select>
      </label>
      <OrganSystemPicker
        systems={organSystems}
        legend="ระบบอวัยวะ (ใช้กับทุกข้อ แก้รายข้อได้ทีหลัง)"
        checked={systemIds}
        onToggle={(id) =>
          setSystemIds((ids) =>
            ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
          )
        }
      />
      <label className={label}>
        <span>รูป (มีเลขกำกับบนรูปแล้ว)</span>
        <input
          type="file"
          accept={ACCEPT}
          className={input}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
      </label>
      <label className={label}>
        <span>เฉลย (บรรทัดละข้อ, ใช้ | คั่นคำตอบอื่นที่รับได้)</span>
        <textarea
          className={`${input} min-h-48 font-mono`}
          value={labels}
          onChange={(e) => setLabels(e.target.value)}
          placeholder={PLACEHOLDER}
          required
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={openAll}
          onChange={(e) => setOpenAll(e.target.checked)}
          className="mt-1"
        />
        <span>
          เปิดให้นักศึกษาทำทุกข้อทันที
          <span className="block text-xs font-normal text-ink-2">
            ไม่ติ๊ก = ซ่อนทุกข้อไว้ก่อน แล้วเลือกเปิดทีละข้อในรายการการ์ด
          </span>
        </span>
      </label>
      <p className="text-xs text-ink-2">
        อ่านได้ {parsed.length} ตำแหน่ง
        {parsed.length > 0 && `: ${parsed.map((l) => l.label_no).join(", ")}`}
      </p>
      {msg && (
        <p className={msg.ok ? "text-sm text-mint" : "text-sm text-danger"}>
          {msg.text}
        </p>
      )}
      <button className={`${btn.primary} w-full`} disabled={busy}>
        {busy ? "กำลังบันทึก…" : "บันทึกการ์ด"}
      </button>
    </form>
  );
}
