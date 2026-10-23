/**
 * Every advertisement must carry the project's RERA registration — a legal
 * requirement for Indian real estate ads and a hard rule in the workforce
 * spec. The generation prompts are *asked* to include it; this stamp
 * *guarantees* it on the way to the database.
 */
export function stampRera(text: string | null | undefined, reraNumber: string | null | undefined): string | null {
  if (!text) return text ?? null;
  if (!reraNumber) return text;
  if (text.toLowerCase().includes(reraNumber.toLowerCase())) return text;
  return `${text.trimEnd()}\nRERA: ${reraNumber}`;
}
