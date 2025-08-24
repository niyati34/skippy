export type IntentType = "flashcards" | "notes" | "schedule" | "fun" | "none";

export interface ParsedIntent {
  type: IntentType;
  content: string; // user-provided topic/body after the command
  funKind?: string; // for fun intents like story/quiz/poem
}

// Simple, robust intent parser for chat commands
export function parseIntent(raw: string): ParsedIntent {
  const s = (raw || "").trim();
  if (!s) return { type: "none", content: "" };

  const after = (re: RegExp) => (s.match(re)?.[1] || s).trim();

  // Flashcards
  if (/(make|create|generate)\s+(some\s+)?flashcards?\b/i.test(s)) {
    const content = after(
      /flashcards?\s*(?:from|about|on|for)?\s*[:\-]?\s*(.*)$/i
    );
    return { type: "flashcards", content };
  }

  // Notes
  if (/(make|create|generate)\s+(study\s+)?notes?\b/i.test(s)) {
    const content =
      after(/notes?\s*(?:from|about|on|for)?\s*[:\-]?\s*(.*)$/i) || s;
    return { type: "notes", content };
  }

  // Schedule
  if (
    /(make|create|generate|build)\s+.*(schedule|timetable|calendar)\b/i.test(s)
  ) {
    const content =
      after(
        /(?:schedule|timetable|calendar)\s*(?:from|about|on|for)?\s*[:\-]?\s*(.*)$/i
      ) || s;
    return { type: "schedule", content };
  }

  // Fun learning
  const funMatch = s.match(/(story|quiz|poem|song|rap|riddle|game)/i);
  if (funMatch && /(make|create|generate)\b/i.test(s)) {
    const kind = funMatch[1].toLowerCase();
    const content =
      after(
        new RegExp(`${kind}\\s*(?:about|from|on|for)?\\s*[:\\-]?\\s*(.*)$`, "i")
      ) || s;
    return { type: "fun", content, funKind: kind };
  }

  return { type: "none", content: s };
}
