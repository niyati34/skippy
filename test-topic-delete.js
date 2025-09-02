import { TaskUnderstanding } from "./src/lib/taskUnderstanding.ts";
import { TaskExecutor } from "./src/lib/taskExecutor.ts";
import { NotesStorage, FlashcardStorage } from "./src/lib/storage.ts";

console.log("Seed some items and test topic-scoped delete...");

// Seed data
const notes = [
  {
    title: "Superman origins",
    content: "About Superman",
    source: "seed",
    category: "comics",
    tags: ["superman"],
  },
  {
    title: "Batman gadgets",
    content: "Utility belt",
    source: "seed",
    category: "comics",
    tags: ["batman"],
  },
  {
    title: "Chess openings",
    content: "Sicilian Defense",
    source: "seed",
    category: "games",
    tags: ["chess"],
  },
];

const flashcards = [
  {
    question: "What is Sicilian Defense?",
    answer: "A chess opening",
    category: "chess",
  },
  { question: "Who is Clark Kent?", answer: "Superman", category: "comics" },
  {
    question: "What is Ruy Lopez?",
    answer: "A chess opening",
    category: "chess",
  },
];

NotesStorage.save(
  notes.map((n, i) => ({
    ...n,
    id: String(100 + i),
    createdAt: new Date().toISOString(),
  }))
);
FlashcardStorage.save(
  flashcards.map((c, i) => ({
    ...c,
    id: String(200 + i),
    createdAt: new Date().toISOString(),
  }))
);

console.log("Before delete:", {
  notes: NotesStorage.load().length,
  flashcards: FlashcardStorage.load().length,
});

const cmd = "delete flashcard related chess and remove notes about superman";
const parse = TaskUnderstanding.understandRequest(cmd);
console.log("Parse:", JSON.stringify(parse, null, 2));

const run = await TaskExecutor.executeTask(parse);
console.log("Results:", run);

console.log("After delete:", {
  notes: NotesStorage.load().length,
  flashcards: FlashcardStorage.load().length,
});
