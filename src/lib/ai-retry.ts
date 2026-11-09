export const AI_BUSY_MESSAGE =
  "The AI service is busy right now. Please try again in a few minutes or choose a different model.";

const RETRY_DELAYS_MS = [1000, 3000];
const RATE_LIMITED = 429;
const OVERLOAD_STATUSES = new Set([RATE_LIMITED, 500, 502, 503, 504]);

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs a Gemini call, retrying short overloads. If Gemini stays unavailable
 * (or the quota is used up, where retrying cannot help) it switches to the
 * fallback, and reports a plain message if that fails too. Other errors, such
 * as a bad request, are passed through unchanged.
 */
export async function withGeminiRecovery<T>(
  callGemini: () => Promise<T>,
  callFallback: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = wait
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await callGemini();
    } catch (error) {
      const status = statusOf(error);
      if (status === undefined || !OVERLOAD_STATUSES.has(status)) throw error;
      console.warn(`Gemini unavailable (${status}), attempt ${attempt + 1}.`);
      if (status === RATE_LIMITED || attempt === RETRY_DELAYS_MS.length) break;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  try {
    return await callFallback();
  } catch (error) {
    console.error("Fallback model failed:", error);
    throw new Error(AI_BUSY_MESSAGE);
  }
}
