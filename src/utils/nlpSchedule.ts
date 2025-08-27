// Lightweight natural language schedule parser for phrases like:
// "tomorrow 4.30 to 5 exam of blockchain" or "on monday 9-10 class"

export type ParsedEvent = {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (start)
  endTime?: string; // HH:MM (end)
  type: "assignment" | "study" | "exam" | "note";
};

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function toDateString(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseRelativeDate(text: string, now = new Date()): string | null {
  const s = text.toLowerCase();
  if (/\btoday\b/.test(s)) return toDateString(now);
  if (/\btomorrow\b/.test(s)) {
    const t = new Date(now);
    t.setDate(now.getDate() + 1);
    return toDateString(t);
  }

  // on <weekday> or just weekday
  const wdMatch = s.match(
    /\b(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/
  );
  if (wdMatch) {
    const target = WEEKDAYS.indexOf(wdMatch[1]);
    const cur = now.getDay();
    let delta = target - cur;
    if (delta <= 0) delta += 7; // next occurrence
    const t = new Date(now);
    t.setDate(now.getDate() + delta);
    return toDateString(t);
  }

  // dd/mm or dd-mm or yyyy-mm-dd
  const dmy = s.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if (dmy) {
    const dd = parseInt(dmy[1], 10);
    const mm = parseInt(dmy[2], 10);
    let yyyy = dmy[3] ? parseInt(dmy[3], 10) : now.getFullYear();
    if (yyyy < 100) yyyy += 2000;
    const dt = new Date(yyyy, mm - 1, dd);
    if (!isNaN(dt.getTime())) return toDateString(dt);
  }

  const iso = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  return null;
}

function normalizeTimeToken(token: string): { h: number; m: number } | null {
  const m = token.trim().toLowerCase();
  const ampm = /(am|pm)\b/.exec(m)?.[1] as "am" | "pm" | undefined;
  const core = m.replace(/\s*(am|pm)\b/, "");
  const mmatch = core.match(/^(\d{1,2})(?::|\.)?(\d{2})?$/);
  if (!mmatch) return null;
  let h = parseInt(mmatch[1], 10);
  let min = mmatch[2] ? parseInt(mmatch[2], 10) : 0;
  if (h >= 24 || min >= 60) return null;
  if (ampm) {
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
  }
  return { h, m: min };
}

function toHHMM(h: number, m: number) {
  return `${pad2(h)}:${pad2(m)}`;
}

function parseTimeRange(text: string): { start?: string; end?: string } {
  const s = text.toLowerCase();
  const range = s.match(
    /(\d{1,2}(?::|\.)?\d{0,2}\s*(?:am|pm)?)\s*(?:to|\-|–)\s*(\d{1,2}(?::|\.)?\d{0,2}\s*(?:am|pm)?)/
  );
  if (range) {
    const a = normalizeTimeToken(range[1]);
    const b = normalizeTimeToken(range[2]);
    if (a && b) return { start: toHHMM(a.h, a.m), end: toHHMM(b.h, b.m) };
  }
  const single = s.match(/\b(\d{1,2}(?::|\.)?\d{0,2}\s*(?:am|pm)?)\b/);
  if (single) {
    const a = normalizeTimeToken(single[1]);
    if (a) return { start: toHHMM(a.h, a.m) };
  }
  return {};
}

function inferType(text: string): ParsedEvent["type"] {
  const s = text.toLowerCase();
  if (/\bexam|test|quiz\b/.test(s)) return "exam";
  if (/\bclass|lecture|tutorial|seminar\b/.test(s)) return "study";
  return "assignment";
}

function extractTitle(text: string): string {
  // Try phrases like "exam of blockchain", "class on algorithms"
  const m1 = text.match(
    /\b(?:exam|class|lecture|meeting)\s+(?:of|on|about|for)\s+([^,.;\n]+)\b/i
  );
  if (m1) return `${m1[0]}`.replace(/\s+/g, " ").trim();
  // After "I have ..."
  const m2 = text.match(/\bi\s+have\s+([^,.;\n]+)\b/i);
  if (m2) return m2[1].trim();
  // Fallback: first 8 words
  return text.split(/\s+/).slice(0, 8).join(" ").trim();
}

export function parseScheduleCommand(
  text: string,
  now = new Date()
): ParsedEvent[] {
  const date = parseRelativeDate(text, now);
  const { start, end } = parseTimeRange(text);

  if (!date && !start) return [];

  const type = inferType(text);
  const title = extractTitle(text);

  return [
    {
      title: title || (type === "exam" ? "Exam" : "Event"),
      date: date || toDateString(now),
      time: start || "09:00",
      endTime: end,
      type,
    },
  ];
}
