// Best-effort extraction & one-shot repair of JSON returned by the model
// (section 18). We try a direct parse, then strip code fences / surrounding
// prose, then balance braces. If all fail the caller marks the run invalid.

export function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function extractBracedObject(text: string): string | null {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}

/**
 * Parse model output into an object, attempting one repair pass.
 * Returns the parsed value plus whether a repair was needed.
 */
export function parseModelJson(raw: string): {
  value: unknown | null;
  repaired: boolean;
} {
  const direct = tryParseJson(raw);
  if (direct !== null) return { value: direct, repaired: false };

  const candidates = [stripCodeFences(raw)];
  const braced = extractBracedObject(raw);
  if (braced) candidates.push(braced);

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate);
    if (parsed !== null) return { value: parsed, repaired: true };
  }

  return { value: null, repaired: true };
}
