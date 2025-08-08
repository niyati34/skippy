import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./debug.ts";

// Auto-cleanup for existing users
const cleanDuplicateNotes = () => {
  try {
    const existing = JSON.parse(localStorage.getItem("skippy-notes") || "[]");
    if (existing.length === 0) return;

    const seen = new Set();
    const unique = existing.filter((note: any) => {
      const key = `${note.title}-${note.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (unique.length !== existing.length) {
      localStorage.setItem("skippy-notes", JSON.stringify(unique));
      console.log(
        `🧹 Cleaned ${existing.length - unique.length} duplicate notes`
      );
    }
  } catch (error) {
    console.error("Error cleaning notes:", error);
  }
};

// Run cleanup on app start
cleanDuplicateNotes();

createRoot(document.getElementById("root")!).render(<App />);
