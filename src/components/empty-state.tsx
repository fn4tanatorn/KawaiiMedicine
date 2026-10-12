import { Mascot } from "./mascot";

/**
 * Illustrated placeholder for "nothing here yet" screens.
 * Ultra-minimalist and warm Kawaii, giving learners a friendly, encouraging space.
 */
export function EmptyState({
  title,
  description,
  mood = "happy",
  action,
}: {
  title: string;
  description?: string;
  mood?: React.ComponentProps<typeof Mascot>["mood"];
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-line/70 bg-surface/75 px-6 py-12 text-center shadow-soft backdrop-blur-xs">
      <Mascot mood={mood} size={96} className="mx-auto" />
      <p className="mt-4 text-base font-bold text-ink sm:text-lg">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-xs sm:text-sm text-ink-2">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

