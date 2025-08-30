// Comprehensive AI Agent Testing Commands
// Test every possible interaction with your study buddy

console.log("🤖 COMPREHENSIVE AGENTIC AI TESTING SUITE");
console.log("==========================================");

// Import the universal AI agent
import { universalAI } from "./src/lib/universalAgent.js";

// Test Categories: Notes, Flashcards, Schedule, Search, Social, Commands

const testCommands = {
  // NOTES COMMANDS
  notes: [
    "create notes about machine learning basics",
    "make notes on JavaScript promises and async await",
    "write notes about blockchain technology fundamentals",
    "generate notes from my uploaded PDF",
    "create detailed notes on React hooks and state management",
    "make notes about data structures and algorithms",
    "write comprehensive notes on artificial intelligence",
    "create study notes for my upcoming exam",
    "make notes on database design principles",
    "generate notes about cybersecurity best practices",
  ],

  // FLASHCARD COMMANDS
  flashcards: [
    "create 20 flashcards about Python programming",
    "make 15 flashcards on data science concepts",
    "generate 30 flashcards from my JavaScript notes",
    "create flashcards about machine learning algorithms",
    "make 25 flashcards on computer networks",
    "create flashcards using my existing notes on AI",
    "generate 10 flashcards about web development",
    "make flashcards for my chemistry exam",
    "create 50 flashcards on operating systems",
    "generate flashcards about software engineering principles",
  ],

  // SCHEDULE COMMANDS
  schedule: [
    "what's my schedule today?",
    "show me tomorrow's classes",
    "what do I have this week?",
    "when is my next exam?",
    "add study session for Friday 3 PM",
    "schedule a meeting for Monday 10 AM",
    "what's coming up next week?",
    "show my upcoming deadlines",
    "when is my next assignment due?",
    "schedule review session for this weekend",
  ],

  // SEARCH & QUERY COMMANDS
  search: [
    "find my notes about JavaScript",
    "search for flashcards on machine learning",
    "show me all my AI-related content",
    "find notes containing 'algorithm'",
    "search my schedule for 'exam'",
    "find all my programming flashcards",
    "show me notes from last week",
    "search for anything about blockchain",
    "find my computer science materials",
    "show me all my study content",
  ],

  // SOCIAL & CONVERSATIONAL
  social: [
    "hey there!",
    "how are you doing?",
    "what's up buddy?",
    "I need some motivation to study",
    "can you help me plan my studies?",
    "I'm feeling overwhelmed with assignments",
    "what should I study next?",
    "give me some study tips",
    "how can I improve my learning?",
    "I need help organizing my time",
  ],

  // MIXED & COMPLEX COMMANDS
  mixed: [
    "create notes and flashcards about database systems",
    "make study materials for my Python exam next week",
    "help me prepare for my machine learning interview",
    "create comprehensive study plan for data structures",
    "make flashcards from my React notes and schedule practice",
    "prepare study materials and schedule for algorithms course",
    "create notes about AI and make related flashcards",
    "help me study for multiple subjects this week",
    "organize my computer science materials and create schedule",
    "make study plan with notes, flashcards and timeline",
  ],

  // RECOMMENDATIONS & ANALYSIS
  recommendations: [
    "give me study recommendations",
    "what should I focus on today?",
    "analyze my study patterns",
    "suggest improvements for my schedule",
    "recommend study topics based on my notes",
    "what areas need more attention?",
    "help me prioritize my studies",
    "suggest study techniques for better retention",
    "recommend flashcard topics I should create",
    "analyze my learning progress",
  ],

  // TYPO & ERROR HANDLING TESTS
  typos: [
    "make 30 flashcarrd of ai",
    "crate notes abou machien learning",
    "40 flashhhh card of block cain",
    "generat notes for javascrip",
    "creat studey plan for tomorow",
    "make falshcards abut python",
    "crete notes on dat structures",
    "what's my scheduel today?",
    "find my notse about AI",
    "make flascards for exam",
  ],

  // ADVANCED COMMANDS
  advanced: [
    "create a complete study ecosystem for machine learning",
    "build comprehensive materials for full-stack development",
    "design study plan with progressive difficulty levels",
    "create interconnected notes and flashcards on algorithms",
    "build knowledge base with cross-referenced topics",
    "create adaptive study schedule based on my progress",
    "generate personalized learning path for data science",
    "build study materials with different learning styles",
    "create comprehensive review system for multiple subjects",
    "design intelligent study workflow automation",
  ],
};

// Function to test all commands
async function runComprehensiveTests() {
  console.log("\n🚀 STARTING COMPREHENSIVE AI TESTING");
  console.log("=====================================\n");

  let testResults = {
    passed: 0,
    failed: 0,
    categories: {},
  };

  for (const [category, commands] of Object.entries(testCommands)) {
    console.log(`\n📂 TESTING CATEGORY: ${category.toUpperCase()}`);
    console.log("-".repeat(50));

    testResults.categories[category] = { passed: 0, failed: 0 };

    for (let i = 0; i < Math.min(commands.length, 3); i++) {
      // Test first 3 of each category
      const command = commands[i];
      console.log(`\n🧪 Testing: "${command}"`);

      try {
        const result = await universalAI.processAnyPrompt({ text: command });

        if (result && result.summary) {
          console.log(`✅ SUCCESS: ${result.summary.substring(0, 100)}...`);
          testResults.passed++;
          testResults.categories[category].passed++;
        } else {
          console.log(`❌ FAILED: No valid response`);
          testResults.failed++;
          testResults.categories[category].failed++;
        }
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        testResults.failed++;
        testResults.categories[category].failed++;
      }

      // Small delay to avoid overwhelming
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Print final results
  console.log("\n🎯 FINAL TEST RESULTS");
  console.log("=====================");
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(
    `📊 Success Rate: ${(
      (testResults.passed / (testResults.passed + testResults.failed)) *
      100
    ).toFixed(1)}%`
  );

  console.log("\n📂 Category Breakdown:");
  for (const [category, results] of Object.entries(testResults.categories)) {
    const total = results.passed + results.failed;
    const rate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
    console.log(`   ${category}: ${results.passed}/${total} (${rate}%)`);
  }

  return testResults;
}

// Export for manual testing
window.testCommands = testCommands;
window.runComprehensiveTests = runComprehensiveTests;

// Quick test function for individual commands
window.testCommand = async (command) => {
  console.log(`🧪 Testing: "${command}"`);
  try {
    const result = await universalAI.processAnyPrompt({ text: command });
    console.log(`✅ Result: ${result.summary}`);
    if (result.artifacts) {
      console.log(`📦 Artifacts:`, Object.keys(result.artifacts));
    }
    return result;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
};

console.log("\n💡 USAGE:");
console.log("========");
console.log("• runComprehensiveTests() - Run all tests");
console.log("• testCommand('your command here') - Test individual command");
console.log("• testCommands - View all available test commands");

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log("\n🎉 Ready for testing! Try these commands in console:");
  console.log("   runComprehensiveTests()");
  console.log("   testCommand('create notes about AI')");
}
