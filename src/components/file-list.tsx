import { formatBytes } from "@/lib/format";

export type FileListItem = {
  id: string;
  title: string;
  size_bytes: number | null;
};

/** Download links for course files (PDF slides). Renders nothing when empty. */
export function FileList({
  files,
  heading = "เอกสารประกอบ",
  className = "",
}: {
  files: FileListItem[];
  heading?: string;
  className?: string;
}) {
  if (files.length === 0) return null;
  return (
    <section className={className}>
      <h2 className="text-sm font-semibold text-ink-2">{heading}</h2>
      <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
        {files.map((f) => (
          <li key={f.id}>
            {/* Plain <a>: this is a route handler redirecting to a signed URL, not a page. */}
            <a
              href={`/learn/files/${f.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
            >
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-xs font-bold text-danger"
              >
                PDF
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {f.title}
              </span>
              <span className="text-xs text-ink-2">
                {formatBytes(f.size_bytes)}
              </span>
              <span className="text-sm font-medium text-brand">ดาวน์โหลด</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
