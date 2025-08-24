// Minimal spaced repetition utilities (SM-2 inspired)
// Quality: 0(Again), 2(Hard), 3(Good), 4(Easy)

export interface SrsState {
  reps: number; // successful repetitions count
  intervalDays: number; // next interval in days
  ease: number; // ease factor
  dueAt: string; // ISO datetime for next review
  lastReviewedAt?: string; // ISO datetime of last review
  lapses?: number; // times failed
}

export const DEFAULT_EASE = 2.5;

export function initSrs(now: Date = new Date()): SrsState {
  return {
    reps: 0,
    intervalDays: 0,
    ease: DEFAULT_EASE,
    dueAt: now.toISOString(),
    lastReviewedAt: undefined,
    lapses: 0,
  };
}

export function isDue(s: SrsState, now: Date = new Date()): boolean {
  try {
    return new Date(s.dueAt).getTime() <= now.getTime();
  } catch {
    return true;
  }
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.max(0, Math.round(days)));
  return d;
}

export function review(
  prev: SrsState,
  quality: 0 | 1 | 2 | 3 | 4,
  now: Date = new Date()
): SrsState {
  // Map 1 -> 0 (treat as Again)
  const q = quality === 1 ? 0 : quality;
  let { reps, intervalDays, ease, lapses = 0 } = prev;

  if (q < 2) {
    // Failure resets reps and sets short interval
    reps = 0;
    lapses += 1;
    intervalDays = 1; // immediate next day
  } else {
    // Success
    if (reps === 0) {
      intervalDays = 1;
    } else if (reps === 1) {
      intervalDays = 3;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * ease));
    }
    reps += 1;

    // Ease factor update (SM-2 inspired)
    // easy: +0.15, good: +0.0, hard: -0.15
    if (q === 4) ease += 0.15;
    if (q === 3) ease += 0.0;
    if (q === 2) ease -= 0.15;
    ease = Math.max(1.3, Math.min(2.8, Number(ease.toFixed(2))));
  }

  const dueAt = addDays(now, intervalDays).toISOString();
  return {
    reps,
    intervalDays,
    ease,
    dueAt,
    lastReviewedAt: now.toISOString(),
    lapses,
  };
}
