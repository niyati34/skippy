// Entity Resolver - map vague references to concrete IDs with confidence
import { FlashcardStorage } from "@/lib/storage";

export interface ResolutionCandidate<T> {
  id: string;
  item: T;
  score: number;
}
export type ResolutionResult<T> =
  | { status: "resolved"; candidate: ResolutionCandidate<T> }
  | { status: "ambiguous"; candidates: ResolutionCandidate<T>[] }
  | { status: "empty" };

function normalize(s: string): string {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const A = normalize(a),
    B = normalize(b);
  if (!A && !B) return 1;
  const dist = levenshtein(A, B);
  const maxLen = Math.max(A.length, B.length) || 1;
  return 1 - dist / maxLen;
}

function recencyBoost(isoDate?: string): number {
  if (!isoDate) return 0;
  const ageDays =
    (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
  if (Number.isNaN(ageDays)) return 0;
  return Math.max(0, 1 - Math.min(ageDays / 30, 1)); // within ~30 days gets boost
}

export async function resolveFlashcardRef(
  query: string,
  timeframe?: string
): Promise<ResolutionResult<any>> {
  try {
    const cards = FlashcardStorage.load();
    if (!cards || cards.length === 0) return { status: "empty" };

    const q = normalize(query);
    const candidates = cards
      .map((c: any) => {
        const text = `${c.question || ""} ${c.answer || ""} ${
          c.category || ""
        }`;
        const sim = similarity(q, text);
        const rec = recencyBoost(c.createdAt);
        // basic topic match bonus
        const topicBonus =
          c.category && q.includes(normalize(c.category)) ? 0.1 : 0;
        const score = 0.6 * sim + 0.3 * rec + topicBonus;
        return { id: String(c.id), item: c, score } as ResolutionCandidate<any>;
      })
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) return { status: "empty" };

    const top = candidates[0];
    const gap = top.score - (candidates[1]?.score ?? 0);
    if (top.score >= 0.55 && gap >= 0.15) {
      return { status: "resolved", candidate: top };
    }
    return { status: "ambiguous", candidates: candidates.slice(0, 5) };
  } catch (err) {
    console.warn("Entity resolution failed:", err);
    return { status: "empty" };
  }
}
