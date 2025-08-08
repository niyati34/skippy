// Local Storage utilities for persistent data

export interface StoredFlashcard {
  id: string;
  question: string;
  answer: string;
  category: string;
  createdAt: string;
  source?: string;
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
