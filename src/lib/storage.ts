// Local Storage utilities for persistent data

// ---------- Buddy memory ----------
export interface BuddyMemory {
  name?: string;
  tone?: "friendly" | "formal";
  topics: string[];
  messageCount: number;
  lastSeen?: string;
  lastTasks?: Array<{ when: string; type: string; summary: string }>; // light activity log
  preferences?: {
    studyTimes?: string[];
  };
}

export const BuddyMemoryStorage = {
  load(): BuddyMemory {
    try {
      const raw = localStorage.getItem("skippy-buddy-memory");
      if (!raw) return { topics: [], messageCount: 0 };
      const parsed: any = JSON.parse(raw) || {};
      const topics = Array.isArray(parsed.topics) ? parsed.topics : [];
      const messageCount = Number(parsed.messageCount) || 0;
      const base: BuddyMemory = { topics: [], messageCount: 0 };
      const merged = { ...base, ...parsed } as BuddyMemory;
      merged.topics = topics;
      merged.messageCount = messageCount;
      return merged;
    } catch {
      return { topics: [], messageCount: 0 };
    }
  },
  save(mem: BuddyMemory) {
    try {
      localStorage.setItem("skippy-buddy-memory", JSON.stringify(mem));
    } catch (e) {
      console.warn("BuddyMemoryStorage.save failed", e);
    }
  },
  update(delta: Partial<BuddyMemory>) {
    const current = this.load();
    const next: BuddyMemory = {
      ...current,
      ...delta,
      topics: Array.from(
        new Set([...(current.topics || []), ...((delta.topics as string[]) || [])])
      ).slice(0, 50),
      messageCount:
        (current.messageCount || 0) + (delta.messageCount ? delta.messageCount : 0),
      lastSeen: new Date().toISOString(),
      preferences: {
        ...(current.preferences || {}),
        ...((delta.preferences as any) || {}),
      },
    };
    this.save(next);
    return next;
  },
  clearActivity() {
    const mem = this.load();
    const next: BuddyMemory = { ...mem, lastTasks: [] };
    this.save(next);
    return next;
  },
  addTopics(newTopics: string[]) {
    const mem = this.load();
    const set = new Set([...(mem.topics || [])]);
    newTopics
      .map((t) =>
        String(t || "")
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
      .slice(0, 20)
      .forEach((t) => set.add(t));
    const next: BuddyMemory = { ...mem, topics: Array.from(set).slice(0, 50) };
    this.save(next);
    return next;
  },
  logTask(type: string, summary: string) {
    const mem = this.load();
    const log = mem.lastTasks ? [...mem.lastTasks] : [];
    log.unshift({ when: new Date().toISOString(), type, summary });
    const next: BuddyMemory = {
      ...mem,
      lastSeen: new Date().toISOString(),
      messageCount: (mem.messageCount || 0) + 1,
      lastTasks: log.slice(0, 20),
    };
    this.save(next);
    return next;
  },
};

export interface StoredFlashcard {
  id: string;
  question: string;
  answer: string;
  category: string;
  createdAt: string;
  source?: string;
  srs?: import("./srs").SrsState; // spaced repetition state
}

export interface StoredNote {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  createdAt: string;
  tags: string[];
}

export interface StoredScheduleItem {
  id: string;
  title: string;
  time: string;
  date: string;
  type: "assignment" | "study" | "exam" | "note";
  source?: string;
  createdAt: string;
}

// Enhanced Timetable Storage for day-wise organization
export interface TimetableClass {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  room?: string;
  instructor?: string;
  day:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
  type: "class" | "lab" | "lecture" | "tutorial" | "seminar";
  source?: string;
  createdAt: string;
  recurring: boolean;
}

export interface DayWiseTimetable {
  Monday: TimetableClass[];
  Tuesday: TimetableClass[];
  Wednesday: TimetableClass[];
  Thursday: TimetableClass[];
  Friday: TimetableClass[];
  Saturday: TimetableClass[];
  Sunday: TimetableClass[];
}

// Buddy memory and preferences (see BuddyMemory interface above)

// Flashcards Storage
export const FlashcardStorage = {
  save: (flashcards: StoredFlashcard[]) => {
    try {
      localStorage.setItem("skippy-flashcards", JSON.stringify(flashcards));
    } catch (error) {
      console.error("Error saving flashcards:", error);
    }
  },

  load: (): StoredFlashcard[] => {
    try {
      const stored = localStorage.getItem("skippy-flashcards");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading flashcards:", error);
      return [];
    }
  },

  add: (flashcard: Omit<StoredFlashcard, "id" | "createdAt">) => {
    const existing = FlashcardStorage.load();
    const newCard: StoredFlashcard = {
      ...flashcard,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      srs: flashcard.srs, // optional
    };
    existing.push(newCard);
    FlashcardStorage.save(existing);
    return newCard;
  },

  addBatch: (
    flashcards: Omit<StoredFlashcard, "id" | "createdAt">[]
  ): StoredFlashcard[] => {
    const existing = FlashcardStorage.load();
    const newCards = flashcards.map((card) => ({
      ...card,
      id: (Date.now() + Math.random()).toString(),
      createdAt: new Date().toISOString(),
      srs: card.srs,
    }));
    existing.push(...newCards);
    FlashcardStorage.save(existing);
    return newCards;
  },

  remove: (id: string) => {
    const existing = FlashcardStorage.load();
    const filtered = existing.filter((card) => card.id !== id);
    FlashcardStorage.save(filtered);
  },

  upsertSrs: (id: string, srs: import("./srs").SrsState) => {
    const existing = FlashcardStorage.load();
    const idx = existing.findIndex((c) => c.id === id);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], srs };
      FlashcardStorage.save(existing);
      return existing[idx];
    }
    return null;
  },
};

// Notes Storage
export const NotesStorage = {
  save: (notes: StoredNote[]) => {
    try {
      localStorage.setItem("skippy-notes", JSON.stringify(notes));
    } catch (error) {
      console.error("Error saving notes:", error);
    }
  },

  load: (): StoredNote[] => {
    try {
      const stored = localStorage.getItem("skippy-notes");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading notes:", error);
      return [];
    }
  },

  add: (note: Omit<StoredNote, "id" | "createdAt">) => {
    const existing = NotesStorage.load();
    const newNote: StoredNote = {
      ...note,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    existing.push(newNote);
    NotesStorage.save(existing);
    return newNote;
  },

  addBatch: (notes: Omit<StoredNote, "id" | "createdAt">[]): StoredNote[] => {
    const existing = NotesStorage.load();

    // Check for duplicates by comparing title and source
    const existingSet = new Set(
      existing.map((note) => `${note.title}-${note.source}`)
    );
    const uniqueNotes = notes.filter(
      (note) => !existingSet.has(`${note.title}-${note.source}`)
    );

    if (uniqueNotes.length === 0) {
      return []; // No new notes to add
    }

    const newNotes = uniqueNotes.map((note) => ({
      ...note,
      id: (Date.now() + Math.random()).toString(),
      createdAt: new Date().toISOString(),
    }));

    existing.push(...newNotes);
    NotesStorage.save(existing);
    return newNotes;
  },

  remove: (id: string) => {
    const existing = NotesStorage.load();
    const filtered = existing.filter((note) => note.id !== id);
    NotesStorage.save(filtered);
  },

  // Remove duplicate notes based on title and source
  removeDuplicates: () => {
    const existing = NotesStorage.load();
    const seen = new Set<string>();
    const unique = existing.filter((note) => {
      const key = `${note.title}-${note.source}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    if (unique.length !== existing.length) {
      NotesStorage.save(unique);
      console.log(`Removed ${existing.length - unique.length} duplicate notes`);
    }
    return unique;
  },
};

// Schedule Storage
export const ScheduleStorage = {
  save: (items: StoredScheduleItem[]) => {
    try {
      localStorage.setItem("skippy-schedule", JSON.stringify(items));
    } catch (error) {
      console.error("Error saving schedule:", error);
    }
  },

  load: (): StoredScheduleItem[] => {
    try {
      const stored = localStorage.getItem("skippy-schedule");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading schedule:", error);
      return [];
    }
  },

  add: (item: Omit<StoredScheduleItem, "id" | "createdAt">) => {
    const existing = ScheduleStorage.load();
    const newItem: StoredScheduleItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    existing.push(newItem);
    ScheduleStorage.save(existing);
    return newItem;
  },

  addBatch: (
    items: Omit<StoredScheduleItem, "id" | "createdAt">[]
  ): StoredScheduleItem[] => {
    const existing = ScheduleStorage.load();
    const newItems = items.map((item) => ({
      ...item,
      id: (Date.now() + Math.random()).toString(),
      createdAt: new Date().toISOString(),
    }));
    existing.push(...newItems);
    ScheduleStorage.save(existing);
    return newItems;
  },

  remove: (id: string) => {
    const existing = ScheduleStorage.load();
    const filtered = existing.filter((item) => item.id !== id);
    ScheduleStorage.save(filtered);
  },
};

// File Processing History
export interface ProcessedFile {
  id: string;
  fileName: string;
  fileType: string;
  processedAt: string;
  contentType: string;
  flashcardsGenerated: number;
  notesGenerated: number;
  scheduleItemsGenerated: number;
}

export const FileHistoryStorage = {
  save: (files: ProcessedFile[]) => {
    try {
      localStorage.setItem("skippy-file-history", JSON.stringify(files));
    } catch (error) {
      console.error("Error saving file history:", error);
    }
  },

  load: (): ProcessedFile[] => {
    try {
      const stored = localStorage.getItem("skippy-file-history");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading file history:", error);
      return [];
    }
  },

  add: (file: Omit<ProcessedFile, "id" | "processedAt">) => {
    const existing = FileHistoryStorage.load();
    const newFile: ProcessedFile = {
      ...file,
      id: Date.now().toString(),
      processedAt: new Date().toISOString(),
    };
    existing.push(newFile);
    FileHistoryStorage.save(existing);
    return newFile;
  },
};

// Simple cache for AI outputs by content hash
export const AICache = {
  get(key: string): any | null {
    try {
      const raw = localStorage.getItem(`skippy-ai-cache:${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("AICache get failed", e);
      return null;
    }
  },
  set(key: string, value: any) {
    try {
      localStorage.setItem(`skippy-ai-cache:${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn("AICache set failed", e);
    }
  },
  hash(text: string): string {
    // Lightweight, non-crypto hash
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0).toString(36);
  },
};

// Day-wise Timetable Storage
export const TimetableStorage = {
  save: (timetable: DayWiseTimetable) => {
    try {
      localStorage.setItem("skippy-timetable", JSON.stringify(timetable));
      console.log("💾 Timetable saved:", timetable);
    } catch (error) {
      console.error("Error saving timetable:", error);
    }
  },

  load: (): DayWiseTimetable => {
    try {
      const stored = localStorage.getItem("skippy-timetable");
      if (stored) {
        return JSON.parse(stored);
      }
      return TimetableStorage.getEmptyTimetable();
    } catch (error) {
      console.error("Error loading timetable:", error);
      return TimetableStorage.getEmptyTimetable();
    }
  },

  getEmptyTimetable: (): DayWiseTimetable => ({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  }),

  addClasses: (classes: TimetableClass[]) => {
    const timetable = TimetableStorage.load();

    classes.forEach((newClass) => {
      // Check if class already exists for this day
      const existingClasses = timetable[newClass.day];
      const duplicate = existingClasses.find(
        (existing) =>
          existing.title === newClass.title &&
          existing.time === newClass.time &&
          existing.day === newClass.day
      );

      if (!duplicate) {
        timetable[newClass.day].push(newClass);
        console.log(
          `📅 Added class: ${newClass.title} on ${newClass.day} at ${newClass.time}`
        );
      } else {
        console.log(
          `⚠️ Duplicate class skipped: ${newClass.title} on ${newClass.day}`
        );
      }
    });

    TimetableStorage.save(timetable);
    return timetable;
  },

  removeClass: (classId: string) => {
    const timetable = TimetableStorage.load();
    let removed = false;

    Object.keys(timetable).forEach((day) => {
      const dayKey = day as keyof DayWiseTimetable;
      const originalLength = timetable[dayKey].length;
      timetable[dayKey] = timetable[dayKey].filter((cls) => cls.id !== classId);
      if (timetable[dayKey].length < originalLength) {
        removed = true;
        console.log(`🗑️ Removed class from ${day}`);
      }
    });

    if (removed) {
      TimetableStorage.save(timetable);
    }
    return timetable;
  },

  clearDay: (day: keyof DayWiseTimetable) => {
    const timetable = TimetableStorage.load();
    timetable[day] = [];
    TimetableStorage.save(timetable);
    console.log(`🧹 Cleared all classes for ${day}`);
    return timetable;
  },

  clearAll: () => {
    const emptyTimetable = TimetableStorage.getEmptyTimetable();
    TimetableStorage.save(emptyTimetable);
    console.log("🧹 Cleared entire timetable");
    return emptyTimetable;
  },

  getClassesForDay: (day: keyof DayWiseTimetable): TimetableClass[] => {
    const timetable = TimetableStorage.load();
    return timetable[day] || [];
  },

  getAllClasses: (): TimetableClass[] => {
    const timetable = TimetableStorage.load();
    return Object.values(timetable).flat();
  },
};

// BuddyMemoryStorage methods defined above

// Calendar utils: detect time overlaps within a single day
export type CalendarConflict = {
  aId: string;
  bId: string;
  titleA: string;
  titleB: string;
  date: string;
  startA: string;
  endA?: string;
  startB: string;
  endB?: string;
};

function toMinutes(hhmm: string | undefined) {
  if (!hhmm) return undefined;
  const t = hhmm.replace(/[^\d:]/g, "");
  const [h, m] = t.split(":").map((n) => parseInt(n || "0", 10));
  return (h || 0) * 60 + (m || 0);
}

export function detectConflicts(
  items: Array<{
    id: string;
    title: string;
    date: string;
    time?: string;
    endTime?: string;
  }>
): CalendarConflict[] {
  const conflicts: CalendarConflict[] = [];
  // group by date
  const byDate = new Map<string, typeof items>();
  for (const it of items) {
    const k = it.date;
    const arr = byDate.get(k) || [];
    arr.push(it);
    byDate.set(k, arr);
  }

  for (const [date, dayItems] of byDate.entries()) {
    // sort by start time
    const sorted = [...dayItems].sort(
      (a, b) => (toMinutes(a.time) || 0) - (toMinutes(b.time) || 0)
    );
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const A = sorted[i];
        const B = sorted[j];
        const aStart = toMinutes(A.time) || 0;
        const aEnd = toMinutes(A.endTime) ?? aStart + 60; // assume 1h if missing
        const bStart = toMinutes(B.time) || 0;
        const bEnd = toMinutes(B.endTime) ?? bStart + 60;
        const overlap = Math.max(
          0,
          Math.min(aEnd, bEnd) - Math.max(aStart, bStart)
        );
        if (overlap > 0) {
          conflicts.push({
            aId: A.id,
            bId: B.id,
            titleA: A.title,
            titleB: B.title,
            date,
            startA: A.time || "",
            endA: A.endTime,
            startB: B.time || "",
            endB: B.endTime,
          });
        }
      }
    }
  }
  return conflicts;
}
