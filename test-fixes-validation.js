// Test both fixes: Flashcard creation from existing notes & Schedule queries

console.log("🔧 TESTING UNIVERSAL AGENT FIXES");
console.log("=".repeat(50));

// Add some test data first
function addTestData() {
  // Add test notes
  const testNotes = [
    {
      id: "note-js-1",
      title: "JavaScript Fundamentals",
      content:
        "JavaScript is a programming language. Key concepts: variables, functions, objects, promises, async/await. Used for web development.",
      category: "programming",
      tags: ["javascript", "programming"],
      createdAt: new Date().toISOString(),
      source: "Test",
    },
    {
      id: "note-react-1",
      title: "React Basics",
      content:
        "React is a JavaScript library for building user interfaces. Key concepts: components, state, props, hooks like useState and useEffect.",
      category: "programming",
      tags: ["react", "javascript", "frontend"],
      createdAt: new Date().toISOString(),
      source: "Test",
    },
  ];

  // Add test schedule
  const testSchedule = [
    {
      id: "schedule-1",
      title: "JavaScript Study Session",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // tomorrow
      time: "10:00 AM",
      type: "study",
      priority: "medium",
    },
    {
      id: "schedule-2",
      title: "React Project Review",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // tomorrow
      time: "2:00 PM",
      type: "assignment",
      priority: "high",
    },
  ];

  localStorage.setItem("skippy-notes", JSON.stringify(testNotes));
  localStorage.setItem("skippy-schedule", JSON.stringify(testSchedule));

  console.log("✅ Test data added:");
  console.log(`📝 Notes: ${testNotes.length}`);
  console.log(`📅 Schedule items: ${testSchedule.length}`);
}

// Test flashcard creation from existing notes
async function testFlashcardCreation() {
  console.log("\n🎴 TESTING: Flashcard creation from existing notes");
  console.log("-".repeat(50));

  try {
    const universalAI = new UniversalAgenticAI();

    // Test case 1: "make flashcards from my JavaScript notes"
    console.log("Test 1: 'make flashcards from my JavaScript notes'");
    const result1 = await universalAI.processAnyPrompt(
      "make flashcards from my JavaScript notes",
      {}
    );
    console.log("✅ Result:", result1.summary);
    console.log(
      "📊 Flashcards created:",
      result1.artifacts?.flashcards?.length || 0
    );

    // Test case 2: "create flashcards from my existing notes"
    console.log("\nTest 2: 'create flashcards from my existing notes'");
    const result2 = await universalAI.processAnyPrompt(
      "create flashcards from my existing notes",
      {}
    );
    console.log("✅ Result:", result2.summary);
    console.log(
      "📊 Flashcards created:",
      result2.artifacts?.flashcards?.length || 0
    );
  } catch (error) {
    console.error("❌ Flashcard test failed:", error.message);
  }
}

// Test schedule queries
async function testScheduleQueries() {
  console.log("\n📅 TESTING: Schedule queries");
  console.log("-".repeat(50));

  try {
    const universalAI = new UniversalAgenticAI();

    // Test case 1: "what's tomorrow?"
    console.log('Test 1: "what\'s tomorrow?"');
    const result1 = await universalAI.processAnyPrompt("what's tomorrow?", {});
    console.log("✅ Result:", result1.summary);

    // Test case 2: "show my schedule"
    console.log("\nTest 2: 'show my schedule'");
    const result2 = await universalAI.processAnyPrompt("show my schedule", {});
    console.log("✅ Result:", result2.summary);

    // Test case 3: "add study session Friday 3 PM"
    console.log("\nTest 3: 'add study session Friday 3 PM'");
    const result3 = await universalAI.processAnyPrompt(
      "add study session Friday 3 PM",
      {}
    );
    console.log("✅ Result:", result3.summary);
  } catch (error) {
    console.error("❌ Schedule test failed:", error.message);
  }
}

// Run all tests
async function runAllTests() {
  addTestData();
  await testFlashcardCreation();
  await testScheduleQueries();

  console.log("\n🎯 TESTS COMPLETED");
  console.log("=".repeat(50));
  console.log("If you see proper results above, the fixes are working!");
  console.log("If not, check the browser console for error details.");
}

// Auto-run if in browser
if (typeof window !== "undefined") {
  // Wait for the app to load
  setTimeout(runAllTests, 2000);
}

// Make functions available globally
if (typeof window !== "undefined") {
  window.addTestData = addTestData;
  window.testFlashcardCreation = testFlashcardCreation;
  window.testScheduleQueries = testScheduleQueries;
  window.runAllTests = runAllTests;
}

console.log("🚀 Fix validation test loaded!");
console.log("💡 Run: runAllTests() to test both fixes");
