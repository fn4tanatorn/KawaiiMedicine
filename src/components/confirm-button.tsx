"use client";

/** Submit button that asks for confirmation first (for destructive actions). */
export function ConfirmButton({
  message,
  className,
  children,
  ...rest
}: {
  message: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      {...rest}
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
