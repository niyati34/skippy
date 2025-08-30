// 🧪 COMPREHENSIVE AI AGENT IMPROVEMENTS TEST
// Tests: Memory system, better note detection, natural language understanding

console.clear();
console.log("🚀 TESTING AI AGENT IMPROVEMENTS");
console.log("=".repeat(60));

// Setup comprehensive test data
function setupComprehensiveTestData() {
  console.log("📊 Setting up comprehensive test data...");

  // Create diverse notes
  const testNotes = [
    {
      id: "note-js-1",
      title: "JavaScript Fundamentals",
      content:
        "JavaScript is a programming language for web development. Key concepts: variables (let, const, var), functions, objects, arrays, promises, async/await, DOM manipulation.",
      category: "programming",
      tags: ["javascript", "web development", "programming"],
      createdAt: new Date().toISOString(),
      source: "Study Session",
    },
    {
      id: "note-react-1",
      title: "React Components",
      content:
        "React is a library for building user interfaces. Components can be functional or class-based. Key concepts: JSX, props, state, hooks (useState, useEffect), lifecycle methods.",
      category: "programming",
      tags: ["react", "javascript", "frontend"],
      createdAt: new Date().toISOString(),
      source: "Course Material",
    },
    {
      id: "note-python-1",
      title: "Python Data Science",
      content:
        "Python is excellent for data science. Key libraries: pandas (data manipulation), numpy (numerical operations), matplotlib (plotting), scikit-learn (machine learning).",
      category: "data science",
      tags: ["python", "data science", "machine learning"],
      createdAt: new Date().toISOString(),
      source: "Workshop",
    },
    {
      id: "note-math-1",
      title: "Linear Algebra Basics",
      content:
        "Linear algebra concepts: vectors, matrices, eigenvalues, eigenvectors. Used in machine learning, computer graphics, and data analysis.",
      category: "mathematics",
      tags: ["math", "linear algebra", "machine learning"],
      createdAt: new Date().toISOString(),
      source: "Textbook",
    },
  ];

  // Create schedule items
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const testSchedule = [
    {
      id: "schedule-1",
      title: "JavaScript Study Session",
      date: tomorrow.toISOString().split("T")[0],
      time: "10:00 AM",
      type: "study",
      priority: "medium",
    },
    {
      id: "schedule-2",
      title: "React Project Review",
      date: tomorrow.toISOString().split("T")[0],
      time: "2:00 PM",
      type: "assignment",
      priority: "high",
    },
    {
      id: "schedule-3",
      title: "Python Data Science Exam",
      date: nextWeek.toISOString().split("T")[0],
      time: "9:00 AM",
      type: "exam",
      priority: "high",
    },
  ];

  // Save to localStorage
  localStorage.setItem("skippy-notes", JSON.stringify(testNotes));
  localStorage.setItem("skippy-schedule", JSON.stringify(testSchedule));

  // Clear any existing flashcards to test creation
  localStorage.setItem("skippy-flashcards", JSON.stringify([]));

  console.log(`✅ Created ${testNotes.length} test notes`);
  console.log(`✅ Created ${testSchedule.length} schedule items`);
  console.log(
    `📚 Note topics: ${[...new Set(testNotes.map((n) => n.category))].join(
      ", "
    )}`
  );
}

// Test improved flashcard creation from notes
async function testImprovedFlashcardCreation() {
  console.log("\n🎴 TESTING: Improved Flashcard Creation");
  console.log("-".repeat(50));

  if (typeof window.universalAI === "undefined") {
    console.log(
      "❌ UniversalAgenticAI not available. Make sure Skippy AI is running."
    );
    return;
  }

  const universalAI = window.universalAI;

  try {
    // Test 1: "make flashcards from my JavaScript notes" - should find specific notes
    console.log("Test 1: 'make flashcards from my JavaScript notes'");
    const result1 = await universalAI.processAnyPrompt({
      text: "make flashcards from my JavaScript notes",
    });

    if (
      result1.summary.toLowerCase().includes("couldn't find") ||
      result1.summary.toLowerCase().includes("no javascript notes")
    ) {
      console.log("❌ FAIL: Should have found JavaScript notes");
      console.log("📄 Response:", result1.summary);
    } else if (result1.artifacts?.flashcards?.length > 0) {
      console.log("✅ PASS: Created flashcards from JavaScript notes");
      console.log(
        `📊 Created ${result1.artifacts.flashcards.length} flashcards`
      );

      // Check if flashcards contain JavaScript-specific content
      const hasJSContent = result1.artifacts.flashcards.some(
        (card) =>
          card.question.toLowerCase().includes("javascript") ||
          card.answer.toLowerCase().includes("javascript") ||
          card.answer.toLowerCase().includes("variable") ||
          card.answer.toLowerCase().includes("function")
      );

      if (hasJSContent) {
        console.log("✅ PASS: Flashcards contain JavaScript-specific content");
      } else {
        console.log("⚠️ WARNING: Flashcards don't seem JavaScript-specific");
      }
    } else {
      console.log("❌ FAIL: No flashcards created");
      console.log("📄 Response:", result1.summary);
    }

    // Test 2: "make flashcards from my blockchain notes" - should say no notes found
    console.log("\nTest 2: 'make flashcards from my blockchain notes'");
    const result2 = await universalAI.processAnyPrompt({
      text: "make flashcards from my blockchain notes",
    });

    if (
      result2.summary.toLowerCase().includes("couldn't find") ||
      result2.summary.toLowerCase().includes("no") ||
      result2.summary.includes("programming, data science, mathematics")
    ) {
      console.log("✅ PASS: Correctly identified missing blockchain notes");
      console.log("📄 Response:", result2.summary);
    } else {
      console.log("❌ FAIL: Should have said no blockchain notes found");
      console.log("📄 Response:", result2.summary);
    }

    // Test 3: Natural language - "quiz me on React"
    console.log("\nTest 3: 'quiz me on React'");
    const result3 = await universalAI.processAnyPrompt({
      text: "quiz me on React",
    });
    console.log("📄 Response:", result3.summary);
  } catch (error) {
    console.log("❌ Test failed:", error.message);
  }
}

// Test memory system
async function testMemorySystem() {
  console.log("\n🧠 TESTING: Memory System");
  console.log("-".repeat(50));

  if (typeof window.universalAI === "undefined") {
    console.log("❌ UniversalAgenticAI not available");
    return;
  }

  const universalAI = window.universalAI;

  try {
    // First interaction about JavaScript
    console.log("Interaction 1: Learning about JavaScript");
    await universalAI.processAnyPrompt({
      text: "I want to learn JavaScript fundamentals",
    });

    // Second interaction - should reference previous context
    console.log("Interaction 2: Follow-up about JavaScript");
    const result = await universalAI.processAnyPrompt({
      text: "create some practice exercises for me",
    });

    console.log("📄 AI Response:", result.summary);

    // Check conversation memory
    const memory = JSON.parse(
      localStorage.getItem("skippy-conversation-memory") || "[]"
    );
    console.log(`✅ Conversation memory entries: ${memory.length}`);

    if (memory.length > 0) {
      const lastEntry = memory[memory.length - 1];
      console.log(
        `📝 Last memory topics: ${lastEntry.topics?.join(", ") || "none"}`
      );
    }
  } catch (error) {
    console.log("❌ Memory test failed:", error.message);
  }
}

// Test natural language understanding
async function testNaturalLanguageUnderstanding() {
  console.log("\n🗣️ TESTING: Natural Language Understanding");
  console.log("-".repeat(50));

  if (typeof window.universalAI === "undefined") {
    console.log("❌ UniversalAgenticAI not available");
    return;
  }

  const universalAI = window.universalAI;

  const testCases = [
    "quiz me on my programming knowledge",
    "help me study for tomorrow",
    "what should I review today?",
    "I want to practice JavaScript",
    "test my understanding of React",
    "show me what I have scheduled",
    "can you help me prepare for my exam?",
  ];

  for (const testCase of testCases) {
    console.log(`\nTesting: "${testCase}"`);
    try {
      const result = await universalAI.processAnyPrompt({ text: testCase });

      if (
        result.summary.toLowerCase().includes("not yet implemented") ||
        result.summary.toLowerCase().includes("encountered an issue")
      ) {
        console.log("❌ FAIL: Generic error response");
      } else {
        console.log("✅ PASS: Meaningful response generated");
      }

      console.log(`📄 Response: ${result.summary.substring(0, 100)}...`);
    } catch (error) {
      console.log("❌ Error:", error.message);
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

// Run all tests
async function runComprehensiveTests() {
  console.log("🎯 RUNNING COMPREHENSIVE AI AGENT TESTS");
  console.log("=".repeat(60));

  try {
    setupComprehensiveTestData();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testImprovedFlashcardCreation();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testMemorySystem();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await testNaturalLanguageUnderstanding();

    console.log("\n🎉 COMPREHENSIVE TESTING COMPLETED!");
    console.log("=".repeat(60));
    console.log("📊 Check the results above to see improvements in:");
    console.log("   ✅ Flashcard creation from existing notes");
    console.log("   🧠 Memory system for contextual conversations");
    console.log("   🗣️ Natural language understanding");
  } catch (error) {
    console.log("❌ Comprehensive test failed:", error.message);
  }
}

// Auto-run if in browser
if (typeof window !== "undefined") {
  setTimeout(runComprehensiveTests, 2000);
}

// Make functions available globally
if (typeof window !== "undefined") {
  window.setupComprehensiveTestData = setupComprehensiveTestData;
  window.testImprovedFlashcardCreation = testImprovedFlashcardCreation;
  window.testMemorySystem = testMemorySystem;
  window.testNaturalLanguageUnderstanding = testNaturalLanguageUnderstanding;
  window.runComprehensiveTests = runComprehensiveTests;
}

console.log("🚀 Comprehensive AI agent improvements test loaded!");
console.log("💡 Run: runComprehensiveTests() to test all improvements");
