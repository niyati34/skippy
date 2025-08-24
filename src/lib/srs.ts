// Minimal SRS helpers used by FlashCardMaker
// Simple SM-2 inspired algorithm

export interface SrsState {
  ef: number; // easiness factor
  interval: number; // days
  repetitions: number;
  due: string; // ISO date
}

export function initSrs(now = new Date()): SrsState {
  return {
    ef: 2.5,
    interval: 0,
    repetitions: 0,
    due: now.toISOString(),
  };
}

export function isDue(s: SrsState, at: Date = new Date()): boolean {
  try {
    return new Date(s.due).getTime() <= at.getTime();
  } catch {
    return true;
  }
}

// quality: 0 (again), 2 (hard), 3 (good), 4 (easy)
export function review(
  prev: SrsState,
  quality: 0 | 2 | 3 | 4,
  now = new Date()
): SrsState {
  let { ef, interval, repetitions } = prev;

  // Map to SM-2 quality (0..5)
  const q = quality === 0 ? 1 : quality === 2 ? 3 : quality === 3 ? 4 : 5;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ef);

    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (ef < 1.3) ef = 1.3;
  }

  const due = new Date(
    now.getTime() + interval * 24 * 60 * 60 * 1000
  ).toISOString();
  return { ef, interval, repetitions, due };
}
