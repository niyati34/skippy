// Quick search test for debugging
// Run this in browser console to test search functionality

function testSearchDebug() {
  console.log("🔍 SEARCH FUNCTIONALITY DEBUG TEST");
  console.log("================================");

  try {
    // Check if universalAI is available
    if (typeof universalAI !== "undefined") {
      console.log("✅ universalAI found");

      // Test search for JavaScript
      console.log('\n🧪 Testing search for "JavaScript"...');
      universalAI
        .processAnyPrompt({ text: "find all my programming materials" })
        .then((result) => {
          console.log("✅ Search completed successfully");
          console.log("📊 Result:", result);
        })
        .catch((error) => {
          console.log("❌ Search failed:", error);
        });
    } else {
      console.log("❌ universalAI not found");
      console.log("💡 Make sure you are on the Skippy AI page");
    }

    // Also check what data you have
    const notes = JSON.parse(localStorage.getItem("skippy-notes") || "[]");
    const flashcards = JSON.parse(
      localStorage.getItem("skippy-flashcards") || "[]"
    );
    const schedule = JSON.parse(
      localStorage.getItem("skippy-schedule") || "[]"
    );

    console.log("\n📊 YOUR CURRENT DATA:");
    console.log(`📝 Notes: ${notes.length}`);
    console.log(`🎴 Flashcards: ${flashcards.length}`);
    console.log(`📅 Schedule: ${schedule.length}`);

    if (notes.length > 0) {
      console.log("\n📝 Sample notes:");
      notes.slice(0, 3).forEach((note, i) => {
        console.log(
          `${i + 1}. ${note.title || "Untitled"} - ${
            note.category || "No category"
          }`
        );
      });
    }

    if (flashcards.length > 0) {
      console.log("\n🎴 Sample flashcards:");
      flashcards.slice(0, 3).forEach((card, i) => {
        console.log(`${i + 1}. Q: ${card.question || "No question"}`);
      });
    }
  } catch (error) {
    console.log("❌ Test failed:", error);
  }
}

// Make it available globally
window.testSearchDebug = testSearchDebug;

console.log("🔧 Search debug loaded. Run: testSearchDebug()");
