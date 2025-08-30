// Add sample data for testing search functionality
// Run this in browser console: addSampleData()

function addSampleData() {
  console.log("📝 Adding sample study data for testing...");

  // Add sample notes
  const sampleNotes = [
    {
      id: "note-js-1",
      title: "JavaScript Fundamentals",
      content:
        "JavaScript is a programming language that enables interactive web pages. Key concepts include variables, functions, objects, and event handling.",
      category: "programming",
      tags: ["javascript", "web development", "programming"],
      createdAt: new Date().toISOString(),
      source: "Manual",
    },
    {
      id: "note-ai-1",
      title: "Artificial Intelligence Basics",
      content:
        "AI is the simulation of human intelligence in machines. Machine learning is a subset of AI that enables computers to learn without being explicitly programmed.",
      category: "ai",
      tags: ["artificial intelligence", "machine learning", "programming"],
      createdAt: new Date().toISOString(),
      source: "Manual",
    },
    {
      id: "note-python-1",
      title: "Python Programming",
      content:
        "Python is a high-level programming language known for its simplicity and readability. It is widely used in data science, web development, and automation.",
      category: "programming",
      tags: ["python", "programming", "data science"],
      createdAt: new Date().toISOString(),
      source: "Manual",
    },
  ];

  // Add sample flashcards
  const sampleFlashcards = [
    {
      id: "card-js-1",
      question: "What is JavaScript?",
      answer:
        "JavaScript is a programming language that enables interactive web pages and is commonly used for client-side web development.",
      category: "programming",
      createdAt: new Date().toISOString(),
    },
    {
      id: "card-js-2",
      question: "What are JavaScript variables?",
      answer:
        "Variables in JavaScript are containers for storing data values. They can be declared using var, let, or const keywords.",
      category: "programming",
      createdAt: new Date().toISOString(),
    },
    {
      id: "card-ai-1",
      question: "What is Machine Learning?",
      answer:
        "Machine Learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed.",
      category: "ai",
      createdAt: new Date().toISOString(),
    },
    {
      id: "card-python-1",
      question: "What makes Python popular?",
      answer:
        "Python is popular due to its simple syntax, readability, extensive libraries, and versatility in various domains like web development, data science, and AI.",
      category: "programming",
      createdAt: new Date().toISOString(),
    },
  ];

  // Add sample schedule
  const sampleSchedule = [
    {
      id: "schedule-1",
      title: "JavaScript Study Session",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // Tomorrow
      time: "10:00",
      type: "study",
      priority: "high",
    },
    {
      id: "schedule-2",
      title: "Python Programming Practice",
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // Day after tomorrow
      time: "14:00",
      type: "study",
      priority: "medium",
    },
  ];

  try {
    // Get existing data
    const existingNotes = JSON.parse(
      localStorage.getItem("skippy-notes") || "[]"
    );
    const existingFlashcards = JSON.parse(
      localStorage.getItem("skippy-flashcards") || "[]"
    );
    const existingSchedule = JSON.parse(
      localStorage.getItem("skippy-schedule") || "[]"
    );

    // Merge with sample data (avoid duplicates)
    const mergedNotes = [...existingNotes];
    sampleNotes.forEach((note) => {
      if (!existingNotes.find((n) => n.title === note.title)) {
        mergedNotes.push(note);
      }
    });

    const mergedFlashcards = [...existingFlashcards];
    sampleFlashcards.forEach((card) => {
      if (!existingFlashcards.find((c) => c.question === card.question)) {
        mergedFlashcards.push(card);
      }
    });

    const mergedSchedule = [...existingSchedule];
    sampleSchedule.forEach((item) => {
      if (!existingSchedule.find((s) => s.title === item.title)) {
        mergedSchedule.push(item);
      }
    });

    // Save to localStorage
    localStorage.setItem("skippy-notes", JSON.stringify(mergedNotes));
    localStorage.setItem("skippy-flashcards", JSON.stringify(mergedFlashcards));
    localStorage.setItem("skippy-schedule", JSON.stringify(mergedSchedule));

    console.log("✅ Sample data added successfully!");
    console.log(`📝 Total notes: ${mergedNotes.length}`);
    console.log(`🎴 Total flashcards: ${mergedFlashcards.length}`);
    console.log(`📅 Total schedule items: ${mergedSchedule.length}`);

    console.log("\n🧪 Now try these search commands:");
    console.log('• "find all my programming materials"');
    console.log('• "what notes do I have about JavaScript"');
    console.log('• "search for AI flashcards"');
    console.log('• "show me my Python content"');
  } catch (error) {
    console.error("❌ Error adding sample data:", error);
  }
}

// Test search after adding data
function testSearchWithData() {
  console.log("\n🔍 Testing search with sample data...");

  if (typeof universalAI !== "undefined") {
    console.log('Testing: "find all my programming materials"');
    universalAI
      .processAnyPrompt({ text: "find all my programming materials" })
      .then((result) => {
        console.log("✅ Search result:", result);
      })
      .catch((error) => {
        console.error("❌ Search failed:", error);
      });
  } else {
    console.log(
      "❌ universalAI not available. Make sure you are on the Skippy AI page."
    );
  }
}

// Make functions available globally
window.addSampleData = addSampleData;
window.testSearchWithData = testSearchWithData;

console.log("📊 Sample data helper loaded!");
console.log("🚀 Run: addSampleData() to add test data");
console.log("🔍 Run: testSearchWithData() to test search");
