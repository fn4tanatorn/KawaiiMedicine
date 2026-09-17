"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerCourseFile } from "@/app/admin/actions";
import { btn, input, label } from "@/components/ui";

/** Matches the course-files bucket's file_size_limit. */
const MAX_BYTES = 100 * 1024 * 1024;

/** Uploads a PDF straight from the browser to the private `course-files` bucket, then registers the row. */
export function CourseFileUpload({ courseId }: { courseId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [publish, setPublish] = useState(true);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "saving" | "error"
  >("idle");
  const [msg, setMsg] = useState<string | null>(null);

  function onPick() {
    const file = fileRef.current?.files?.[0];
    if (file && !title.trim()) setTitle(file.name.replace(/\.pdf$/i, ""));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setMsg("กรุณาเลือกไฟล์ PDF");
    if (!title.trim()) return setMsg("กรุณากรอกชื่อเอกสาร");
    if (file.type !== "application/pdf") {
      setStatus("error");
      return setMsg("รองรับเฉพาะไฟล์ PDF");
    }
    if (file.size > MAX_BYTES) {
      setStatus("error");
      return setMsg("ไฟล์ใหญ่เกิน 100 MB");
    }

    setMsg(null);
    setStatus("uploading");
    const supabase = createClient();
    const path = `${courseId}/${crypto.randomUUID()}.pdf`;

    const { error } = await supabase.storage
      .from("course-files")
      .upload(path, file, { contentType: "application/pdf", upsert: false });
    if (error) {
      setStatus("error");
      setMsg(
        /exceeded|too large|payload/i.test(error.message)
          ? "ไฟล์ใหญ่เกินขีดจำกัดของระบบจัดเก็บไฟล์ ลองบีบอัด PDF หรือแจ้งผู้ดูแลให้เพิ่มขีดจำกัด"
          : `อัปโหลดไม่สำเร็จ: ${error.message}`,
      );
      return;
    }

    setStatus("saving");
    const res = await registerCourseFile({
      courseId,
      title: title.trim(),
      storagePath: path,
      sizeBytes: file.size,
      isPublished: publish,
    });
    if (!res.ok) {
      setStatus("error");
      setMsg("บันทึกข้อมูลเอกสารไม่สำเร็จ (ไฟล์อัปโหลดแล้ว) กรุณาแจ้งผู้ดูแล");
      return;
    }
    setStatus("idle");
    setTitle("");
    if (fileRef.current) fileRef.current.value = "";
    setMsg(
      'เพิ่มเอกสารแล้ว เลือกวิดีโอที่ใช้เอกสารนี้ได้ในเมนู "แก้ไข" ของแต่ละวิดีโอ',
    );
    router.refresh();
  }

  const busy = status === "uploading" || status === "saving";
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className={label}>
        <span>ไฟล์ PDF (ไม่เกิน 100 MB)</span>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          required
          onChange={onPick}
          className={`${input} file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-2 file:py-1 file:text-xs`}
          disabled={busy}
        />
      </label>
      <label className={label}>
        <span>ชื่อเอกสาร</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={input}
          disabled={busy}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
          disabled={busy}
        />{" "}
        เผยแพร่ทันที
      </label>
      {msg && (
        <p
          className={`text-sm ${status === "error" ? "text-danger" : "text-mint"}`}
        >
          {msg}
        </p>
      )}
      <button type="submit" disabled={busy} className={`${btn.primary} w-full`}>
        {status === "uploading"
          ? "กำลังอัปโหลด… (อย่าปิดหน้านี้)"
          : status === "saving"
            ? "กำลังบันทึก…"
            : "อัปโหลดเอกสาร"}
      </button>
    </form>
  );
}
