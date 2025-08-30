// Check Your Saved Study Data
// Run this in browser console to see what you have stored

console.log("🔍 CHECKING YOUR SAVED STUDY DATA");
console.log("=================================");

// Check Notes
try {
  const notes = JSON.parse(localStorage.getItem("skippy-notes") || "[]");
  console.log(`\n📝 NOTES (${notes.length} found):`);
  if (notes.length > 0) {
    notes.forEach((note, i) => {
      console.log(`${i + 1}. ${note.title || "Untitled"}`);
      console.log(`   Category: ${note.category || "No category"}`);
      console.log(`   Content: ${(note.content || "").substring(0, 100)}...`);
      console.log(`   Created: ${note.createdAt || "Unknown"}`);
      console.log(`   Tags: ${note.tags ? note.tags.join(", ") : "None"}`);
      console.log("");
    });
  } else {
    console.log(
      "   No notes found. Try saying: 'create notes about JavaScript'"
    );
  }
} catch (error) {
  console.log("   Error reading notes:", error.message);
}

// Check Flashcards
try {
  const flashcards = JSON.parse(
    localStorage.getItem("skippy-flashcards") || "[]"
  );
  console.log(`\n🎴 FLASHCARDS (${flashcards.length} found):`);
  if (flashcards.length > 0) {
    flashcards.slice(0, 5).forEach((card, i) => {
      console.log(`${i + 1}. Q: ${card.question || "No question"}`);
      console.log(`   A: ${(card.answer || "No answer").substring(0, 80)}...`);
      console.log(`   Category: ${card.category || "No category"}`);
      console.log("");
    });
    if (flashcards.length > 5) {
      console.log(`   ... and ${flashcards.length - 5} more flashcards`);
    }
  } else {
    console.log(
      "   No flashcards found. Try saying: 'make 10 flashcards about AI'"
    );
  }
} catch (error) {
  console.log("   Error reading flashcards:", error.message);
}

// Check Schedule
try {
  const schedule = JSON.parse(localStorage.getItem("skippy-schedule") || "[]");
  console.log(`\n📅 SCHEDULE (${schedule.length} found):`);
  if (schedule.length > 0) {
    schedule.slice(0, 5).forEach((item, i) => {
      console.log(`${i + 1}. ${item.title || "Untitled"}`);
      console.log(`   Date: ${item.date || "No date"}`);
      console.log(`   Time: ${item.time || "No time"}`);
      console.log(`   Type: ${item.type || "No type"}`);
      console.log("");
    });
  } else {
    console.log(
      "   No schedule items found. Try saying: 'what's my schedule tomorrow?'"
    );
  }
} catch (error) {
  console.log("   Error reading schedule:", error.message);
}

// Check Memory
try {
  const memory = JSON.parse(localStorage.getItem("buddy-memory") || "{}");
  console.log(`\n🧠 BUDDY MEMORY:`);
  console.log(
    `   Topics: ${memory.topics ? memory.topics.join(", ") : "None"}`
  );
  console.log(`   Message Count: ${memory.messageCount || 0}`);
  console.log(`   Last Seen: ${memory.lastSeen || "Never"}`);
} catch (error) {
  console.log("   Error reading memory:", error.message);
}

console.log(`\n💡 USAGE TIPS:`);
console.log(`================`);
console.log(`• Try: "find my notes about JavaScript"`);
console.log(`• Try: "search flashcards containing algorithm"`);
console.log(`• Try: "what's my schedule this week?"`);
console.log(`• Try: "give me study recommendations"`);
console.log(`• Try: "create 15 flashcards about machine learning"`);

// Make this function available globally
window.checkMyData = () => {
  const script = document.createElement("script");
  script.textContent = `(${arguments.callee.toString()})()`;
  document.head.appendChild(script);
  document.head.removeChild(script);
};

console.log(`\n🔄 To run this again, type: checkMyData()`);
