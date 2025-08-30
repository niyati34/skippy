// Quick Search Test - Run in browser console on Skippy AI app

console.clear();
console.log("🔍 QUICK SEARCH TEST");
console.log("=".repeat(30));

// Add test data if not present
function setupTestData() {
  const testNotes = [
    {
      id: "test-js-1",
      title: "JavaScript Fundamentals",
      content:
        "JavaScript is a programming language for web development. Key concepts include variables, functions, and objects.",
      category: "programming",
      tags: ["javascript", "programming", "web development"],
      createdAt: new Date().toISOString(),
      source: "Test",
    },
    {
      id: "test-python-1",
      title: "Python Basics",
      content:
        "Python is a programming language known for its simplicity and readability. Used in data science and automation.",
      category: "programming",
      tags: ["python", "programming", "data science"],
      createdAt: new Date().toISOString(),
      source: "Test",
    },
  ];

  const testFlashcards = [
    {
      id: "test-card-1",
      question: "What is JavaScript?",
      answer: "JavaScript is a programming language used for web development.",
      category: "programming",
      createdAt: new Date().toISOString(),
    },
    {
      id: "test-card-2",
      question: "What is Python used for?",
      answer:
        "Python is used for data science, web development, and automation.",
      category: "programming",
      createdAt: new Date().toISOString(),
    },
  ];

  localStorage.setItem("skippy-notes", JSON.stringify(testNotes));
  localStorage.setItem("skippy-flashcards", JSON.stringify(testFlashcards));

  console.log("✅ Test data added:");
  console.log(`📝 ${testNotes.length} notes`);
  console.log(`🎴 ${testFlashcards.length} flashcards`);
}

// Test search functionality
async function testSearch() {
  console.log("\n🧪 Testing search...");

  if (typeof universalAI === "undefined") {
    console.log(
      "❌ universalAI not found. Make sure you are on the Skippy AI page."
    );
    return;
  }

  try {
    console.log('🔍 Searching for "JavaScript"...');
    const result = await universalAI.processAnyPrompt({
      text: "what notes do I have about JavaScript",
    });

    console.log("✅ Search completed!");
    console.log("📊 Result:", result);

    if (result.summary) {
      console.log("📝 Summary:", result.summary);
    }

    if (result.artifacts) {
      const { notes, flashcards } = result.artifacts;
      if (notes && notes.length > 0) {
        console.log(`📝 Found ${notes.length} notes about JavaScript`);
      }
      if (flashcards && flashcards.length > 0) {
        console.log(
          `🎴 Found ${flashcards.length} flashcards about JavaScript`
        );
      }
    }
  } catch (error) {
    console.log("❌ Search failed:", error);
  }
}

// Auto-run test
setupTestData();
setTimeout(() => {
  testSearch();
}, 1000);

// Make functions available
window.setupTestData = setupTestData;
window.testSearch = testSearch;

console.log("\n💡 Functions available:");
console.log("- setupTestData() - Add test notes and flashcards");
console.log("- testSearch() - Test search functionality");
console.log(
  '\n🎯 Now try: "what notes do I have about JavaScript" in the chat!'
);
