// Test file command parsing for "make notes and flashcard"
// Run this in browser console to debug the issue

console.log("🧪 Testing File Command Parsing");
console.log("=".repeat(50));

// Test the TaskUnderstanding directly
async function testFileCommand() {
  try {
    const { TaskUnderstanding } = await import(
      "./src/lib/taskUnderstanding.ts"
    );

    const testCommands = [
      "make notes and flashcard",
      "make notes and flashcards",
      "create notes and flashcards",
      "make flashcards and notes",
    ];

    for (const command of testCommands) {
      console.log(`\n📝 Testing: "${command}"`);
      const result = TaskUnderstanding.understandRequest(command);
      console.log(
        "Actions:",
        result.actions.map((a) => `${a.type} ${a.target}`)
      );
      console.log("Full result:", JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Also test if there are actually notes in storage
function checkStorage() {
  try {
    const notes = JSON.parse(localStorage.getItem("skippy-notes") || "[]");
    const flashcards = JSON.parse(
      localStorage.getItem("skippy-flashcards") || "[]"
    );

    console.log(`\n📊 Current Storage Status:`);
    console.log(`Notes: ${notes.length} items`);
    console.log(`Flashcards: ${flashcards.length} items`);

    if (notes.length > 0) {
      console.log(
        "Recent notes:",
        notes.slice(0, 2).map((n) => n.title)
      );
    }
    if (flashcards.length > 0) {
      console.log(
        "Recent flashcards:",
        flashcards.slice(0, 2).map((f) => f.question.substring(0, 50) + "...")
      );
    }
  } catch (error) {
    console.error("Storage check error:", error);
  }
}

// Run tests
testFileCommand();
checkStorage();

// Make functions available globally
window.testFileCommand = testFileCommand;
window.checkStorage = checkStorage;

console.log("\n💡 Functions available: testFileCommand(), checkStorage()");
