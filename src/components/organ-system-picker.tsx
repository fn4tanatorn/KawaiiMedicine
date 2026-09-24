export type OrganSystem = { id: number; name_th: string; name_en: string };

/** Checkbox group submitting `organ_system` ids; works in plain server forms. */
export function OrganSystemPicker({
  systems,
  selected = [],
  checked,
  onToggle,
  disabled,
}: {
  systems: OrganSystem[];
  selected?: number[];
  /** Controlled mode (client components): current selection + toggle handler. */
  checked?: number[];
  onToggle?: (id: number) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-1" disabled={disabled}>
      <legend className="text-sm font-medium">ระบบอวัยวะ (organ system)</legend>
      <div className="flex flex-wrap gap-2">
        {systems.map((s) => (
          <label
            key={s.id}
            title={s.name_th}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs has-[:checked]:border-ink has-[:checked]:bg-surface-2"
          >
            <input
              type="checkbox"
              name="organ_system"
              value={s.id}
              {...(checked
                ? {
                    checked: checked.includes(s.id),
                    onChange: () => onToggle?.(s.id),
                  }
                : { defaultChecked: selected.includes(s.id) })}
            />
            {s.name_en}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
