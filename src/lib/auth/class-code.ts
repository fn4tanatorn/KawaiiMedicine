/**
 * Class Invitation Code management.
 * Students must provide this code (shared strictly inside the LINE OpenChat note)
 * to unlock full student access to the class.
 */

export const DEFAULT_CLASS_CODE = "KAWAII2026";

/** Retrieves the active class invitation passcode. */
export function getActiveClassCode(): string {
  return (
    process.env.CLASS_INVITATION_CODE?.trim() ||
    process.env.NEXT_PUBLIC_CLASS_INVITATION_CODE?.trim() ||
    DEFAULT_CLASS_CODE
  );
}

/** Case-insensitive, whitespace-trimmed passcode verification. */
export function isValidClassCode(inputCode: string): boolean {
  if (!inputCode) return false;
  const cleanInput = inputCode.trim().toUpperCase().replace(/[\s-_]+/g, "");
  const cleanSecret = getActiveClassCode().trim().toUpperCase().replace(/[\s-_]+/g, "");
  return cleanInput === cleanSecret;
}
