// Quick fix for users with duplicate notes
// Run this in browser console: cleanMyNotes()

function cleanMyNotes() {
  const existing = JSON.parse(localStorage.getItem("skippy-notes") || "[]");
  console.log("Before cleanup:", existing.length, "notes");

  const seen = new Set();
  const unique = existing.filter((note) => {
    const key = `${note.title}-${note.source}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  localStorage.setItem("skippy-notes", JSON.stringify(unique));
  console.log("After cleanup:", unique.length, "notes");
  console.log("Removed", existing.length - unique.length, "duplicates");

  // Reload the page to see changes
  window.location.reload();
}

// Make it available globally
window.cleanMyNotes = cleanMyNotes;

console.log("💡 To clean duplicate notes, run: cleanMyNotes()");
