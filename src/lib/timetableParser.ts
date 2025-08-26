// Hybrid Timetable Parser: Rule-based + AI Fallback
// Extracts schedule data using a robust grid-based parser first,
// then falls back to an AI call if the structured parsing fails.

import { TimetableClass } from "./storage";

export interface TimetableParseResult {
  classes: TimetableClass[];
  method: "grid" | "ai" | "none";
  confidence: number;
  summary: string;
}

// ---- Dictionaries ----
const DAY_HEADERS: TimetableClass["day"][] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const SUBJECT_MAPPINGS: Record<string, string> = {
  "UI/UX": "UI/UX Design",
  BT: "Biotechnology",
  NLP: "Natural Language Processing",
  DEV: "Development Workshop",
  AI: "Artificial Intelligence",
  CD: "Cloud Development",
  MP1: "Major Project I",
  DWDM: "Data Warehousing & Data Mining",
  LIBRARY: "Library Session",
};

const FACULTY_MAPPINGS: Record<string, string> = {
  PS: "Prof. Parth Shah",
  SKS: "Dr. S. K. Sharma",
  JS: "Prof. J. Shah",
  PT: "Prof. P. Taylor",
  AC: "Prof. A. Chatterjee",
  WS: "Prof. Williams",
  RP: "Prof. R. Patel",
};

// ---- Preprocessor ----
function preprocessText(raw: string): string {
  console.log("🧹 [Preprocessor] Cleaning raw text...");
  let text = (raw || "")
    .replace(/[\u2010-\u2015\u2212]/g, "-") // normalize dashes
    .replace(/\u00A0/g, " ") // nbsp -> space
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();

  // Try to reintroduce structure: split by common headers if flattened
  const parts = text.split(/\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)\b/gi);
  if (parts.length > DAY_HEADERS.length) {
    console.log(
      `🔍 [Preprocessor] Detected single-line format. Splitting into ${parts.length} parts.`
    );
    let structured = "";
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i] && parts[i + 1])
        structured += `${parts[i]} ${parts[i + 1]}\n`;
    }
    text = structured.trim();
  }

  console.log("✨ [Preprocessor] Text cleaned.");
  return text;
}

// ---- TC4-specific parser ----
function parseTC4SpecificFormat(
  content: string,
  source: string
): TimetableClass[] {
  const classes: TimetableClass[] = [];
  console.log("🎯 [TC4 Parser] Attempting TC4-specific parsing...");

  const daysOfWeek = DAY_HEADERS;

  // Normalize
  const normalized = content
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .replace(
      /\b(Sr\.?\s*No\.?|TIME|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|ALL)\b/gi,
      " "
    )
    .trim();

  // Extract time ranges across the blob and segment
  const timeRe = /(\d{1,2}:\d{2})\s*(?:to|\-|–|—)\s*(\d{1,2}:\d{2})/gi;
  const segments: Array<{ start: string; end: string; body: string }> = [];
  const hits: Array<{ start: string; end: string; idx: number; len: number }> =
    [];

  let m: RegExpExecArray | null;
  while ((m = timeRe.exec(normalized)) !== null) {
    hits.push({ start: m[1], end: m[2], idx: m.index, len: m[0].length });
  }
  console.log(`🧭 [TC4] Found ${hits.length} time ranges`);

  for (let i = 0; i < hits.length; i++) {
    const cur = hits[i];
    const next = hits[i + 1];
    const begin = cur.idx + cur.len;
    const end = next ? next.idx : normalized.length;
    segments.push({
      start: cur.start,
      end: cur.end,
      body: normalized.slice(begin, end).trim(),
    });
  }

  const SUBJECT_RE = /\b(UI\/UX|BT|NLP|DEV|AI|CD|MP1|DWDM|LIBRARY)\b/g;
  const ROOM_RE = /\b(M[AC]\d{3}[A-Z]?)\b/;
  const FACULTY_RE = /\b([A-Z]{2,3})\b/g;

  const pickFaculty = (s: string) => {
    let fm: RegExpExecArray | null;
    while ((fm = FACULTY_RE.exec(s)) !== null) {
      const code = fm[1] as keyof typeof FACULTY_MAPPINGS;
      if (FACULTY_MAPPINGS[code]) return FACULTY_MAPPINGS[code];
    }
    return "TBD";
  };

  for (const seg of segments) {
    const subjects = Array.from(
      new Set(seg.body.match(SUBJECT_RE) || [])
    ).slice(0, 5);
    if (subjects.length === 0) continue;
    const room = seg.body.match(ROOM_RE)?.[1] || "TBD";
    const instructor = pickFaculty(seg.body);

    subjects.forEach((code, i) => {
      if (i >= daysOfWeek.length) return;
      const title = SUBJECT_MAPPINGS[code] || code;
      classes.push({
        id: crypto.randomUUID(),
        title: String(title),
        time: seg.start,
        endTime: seg.end,
        room,
        instructor,
        day: daysOfWeek[i],
        type: "class",
        source,
        createdAt: new Date().toISOString(),
        recurring: true,
      });
    });
  }

  // Fallback: line-wise
  if (classes.length === 0) {
    console.log("🔄 [TC4] Trying alternative parsing approach (line-wise)...");
    const lines = content.split(/[\n\r]+/).map((l) =>
      l
        .replace(/[\u2010-\u2015\u2212]/g, "-")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );
    for (const line of lines) {
      const tm = /(\d{1,2}:\d{2})\s*(?:to|\-|–|—)\s*(\d{1,2}:\d{2})/i.exec(
        line
      );
      if (!tm) continue;
      const startTime = tm[1];
      const endTime = tm[2];
      const after = line.slice(tm.index + tm[0].length);
      const subjects = Array.from(new Set(after.match(SUBJECT_RE) || [])).slice(
        0,
        5
      );
      if (subjects.length === 0) continue;
      subjects.forEach((code, i) => {
        if (i >= daysOfWeek.length) return;
        const title = SUBJECT_MAPPINGS[code] || code;
        classes.push({
          id: crypto.randomUUID(),
          title: String(title),
          time: startTime,
          endTime,
          room: "TBD",
          instructor: "TBD",
          day: daysOfWeek[i],
          type: "class",
          source,
          createdAt: new Date().toISOString(),
          recurring: true,
        });
      });
    }
  }

  console.log(`🎯 [TC4 Parser] Extracted ${classes.length} classes`);
  return classes;
}

// ---- Grid parser (generic) ----
function enhancedGridParser(
  lines: string[],
  source: string
): TimetableParseResult {
  const classes: TimetableClass[] = [];

  // TC4 first
  const tc4 = parseTC4SpecificFormat(lines.join("\n"), source);
  if (tc4.length > 0) {
    return {
      classes: tc4,
      method: "grid",
      confidence: 0.95,
      summary: `Successfully extracted ${tc4.length} classes using TC4-specific parser.`,
    };
  }

  // Very simple generic fallback: 09:00-10:00 Title – FAC – ROOM
  const timeRange = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
  for (const line of lines) {
    const tm = timeRange.exec(line);
    if (!tm) continue;
    const startTime = tm[1];
    const endTime = tm[2];
    const rest = line.slice(tm.index + tm[0].length).trim();
    const m = /([A-Za-z/ &]+)\s*[–-]\s*([A-Z]{2,3})\s*[–-]\s*(\w+)/.exec(rest);
    if (!m) continue;
    const title = m[1].trim();
    const faculty = FACULTY_MAPPINGS[m[2]] || m[2];
    const room = m[3];

    // Assign cyclically to days (best-effort)
    const day = DAY_HEADERS[classes.length % DAY_HEADERS.length];
    classes.push({
      id: crypto.randomUUID(),
      title,
      time: startTime,
      endTime,
      room,
      instructor: faculty,
      day,
      type: "class",
      source,
      createdAt: new Date().toISOString(),
      recurring: true,
    });
  }

  if (classes.length > 0) {
    return {
      classes,
      method: "grid",
      confidence: 0.6,
      summary: `Extracted ${classes.length} items using generic fallback`,
    };
  }

  return {
    classes: [],
    method: "none",
    confidence: 0,
    summary: "Grid parser did not find any matching class structure.",
  };
}

// ---- Public API ----
export async function extractTimetable(
  content: string,
  source: string
): Promise<TimetableParseResult> {
  console.log("🚀 [Hybrid Parser] Starting timetable extraction...");
  const cleaned = preprocessText(content);
  const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);

  const grid = enhancedGridParser(lines, source);
  if (grid.classes.length > 0) return grid;

  console.warn(
    "⚠️ [Hybrid Parser] Grid parser failed. Suggesting AI fallback."
  );
  return {
    classes: [],
    method: "none",
    confidence: 0,
    summary: "No classes extracted by grid parser; consider AI fallback.",
  };
}

// ---- Compatibility exports for existing callers ----
export type ParsedTimetableClass = TimetableClass;

export function parseTC4Schedule(
  text: string,
  source: string = "TC4 Upload"
): TimetableClass[] {
  const cleaned = preprocessText(text);
  const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);
  return enhancedGridParser(lines, source).classes;
}

export function parseTimetableFast(
  text: string,
  source: string = "Text Upload"
): { classes: TimetableClass[]; confidence: number; summary: string } {
  const cleaned = preprocessText(text);
  const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);
  const res = enhancedGridParser(lines, source);
  return {
    classes: res.classes,
    confidence: res.confidence,
    summary: res.summary,
  };
}
