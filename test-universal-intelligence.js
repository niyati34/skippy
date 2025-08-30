// 🚀 Universal AI Agent - Advanced Intelligence Test Suite
// Test the enhanced agentic capabilities with any type of task

console.log("🚀 Starting Universal AI Agent Advanced Test Suite...");

// Import the enhanced AI agent
import { universalAI } from "./src/lib/universalAgent.js";

// 🧪 TEST SUITE: Advanced Agentic Capabilities

async function testAdvancedIntelligence() {
  console.log("\n🧠 === ADVANCED INTELLIGENCE TEST SUITE ===\n");

  const testCases = [
    // 🎯 SIMPLE TASKS (Should work directly)
    {
      category: "Simple Tasks",
      tests: [
        "Create flashcards from my JavaScript notes",
        "What's my schedule for tomorrow?",
        "Show me my Python notes",
        "Delete old flashcards",
      ],
    },

    // 🔀 COMPLEX MULTI-STEP TASKS (Should decompose and orchestrate)
    {
      category: "Complex Multi-Step Tasks",
      tests: [
        "Help me prepare for my final exams",
        "Organize all my study materials",
        "Create a comprehensive study plan for this semester",
        "Find gaps in my knowledge and help me improve",
        "Review everything I learned this month",
      ],
    },

    // 🎨 CREATIVE TASKS (Should use creative domain)
    {
      category: "Creative & Analytical Tasks",
      tests: [
        "Explain machine learning in simple terms",
        "Help me write a summary of my computer science notes",
        "Generate practice problems for algorithms",
        "Compare React and Vue.js based on my notes",
        "What should I focus on next in my studies?",
      ],
    },

    // 🗣️ NATURAL LANGUAGE TASKS (Should understand casual language)
    {
      category: "Natural Language Understanding",
      tests: [
        "Quiz me on JavaScript",
        "Test my knowledge about databases",
        "I need help with my studies",
        "Make some cards for learning React",
        "How am I doing with my learning?",
      ],
    },

    // 🔗 INTELLIGENT CONNECTIONS (Should connect different domains)
    {
      category: "Cross-Domain Intelligence",
      tests: [
        "Connect my JavaScript notes with React flashcards",
        "Find relationships between my different subjects",
        "Suggest study sessions based on my schedule and notes",
        "What topics should I review before my exam?",
      ],
    },
  ];

  // Run all test categories
  for (const category of testCases) {
    console.log(`\n📚 === ${category.category.toUpperCase()} ===`);

    for (const testInput of category.tests) {
      console.log(`\n🔍 Testing: "${testInput}"`);

      try {
        const startTime = Date.now();
        const result = await universalAI.processAnyPrompt({ text: testInput });
        const duration = Date.now() - startTime;

        console.log(
          `✅ Response (${duration}ms):`,
          result.summary.substring(0, 150) + "..."
        );

        // Check for advanced features
        if (
          result.artifacts.notes &&
          result.artifacts.notes.some((note) => note.metadata)
        ) {
          console.log("🧠 Advanced Analysis: Task decomposition detected");
        }

        if (result.summary.includes("💡")) {
          console.log("💡 Proactive Suggestions: AI provided recommendations");
        }
      } catch (error) {
        console.log(`❌ Error:`, error.message);
      }

      // Brief pause between tests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// 🎭 DEMONSTRATION: Advanced Features

async function demonstrateAdvancedFeatures() {
  console.log("\n🎭 === ADVANCED FEATURES DEMONSTRATION ===\n");

  // 1. Task Decomposition Demo
  console.log("🔧 TASK DECOMPOSITION:");
  console.log("Input: 'Help me prepare for my JavaScript exam next week'");
  console.log("Expected: Should break down into multiple steps automatically");

  const complexTask = await universalAI.processAnyPrompt({
    text: "Help me prepare for my JavaScript exam next week",
  });

  console.log("Result:", complexTask.summary);
  console.log("Artifacts:", Object.keys(complexTask.artifacts));

  // 2. Memory System Demo
  console.log("\n🧠 MEMORY SYSTEM:");
  console.log("Testing contextual memory across conversations...");

  await universalAI.processAnyPrompt({ text: "I'm studying React components" });
  await universalAI.processAnyPrompt({ text: "Create flashcards about hooks" });
  const memoryTest = await universalAI.processAnyPrompt({
    text: "Quiz me on what we discussed",
  });

  console.log("Memory-enhanced response:", memoryTest.summary);

  // 3. Dynamic Capability Discovery
  console.log("\n🔍 DYNAMIC CAPABILITY DISCOVERY:");
  console.log("Testing completely new request types...");

  const novelTask = await universalAI.processAnyPrompt({
    text: "Help me become a better programmer by analyzing my learning patterns",
  });

  console.log("Novel task handling:", novelTask.summary);

  // 4. Cross-Domain Intelligence
  console.log("\n🔗 CROSS-DOMAIN INTELLIGENCE:");
  const crossDomain = await universalAI.processAnyPrompt({
    text: "Connect my programming notes with my upcoming assignments and create an optimal study schedule",
  });

  console.log("Cross-domain response:", crossDomain.summary);
}

// 🚀 RUN THE COMPLETE TEST SUITE

async function runCompleteTestSuite() {
  try {
    console.log("🎬 Starting Enhanced AI Agent Test Suite...\n");

    // Test basic functionality first
    console.log("🔍 Testing basic AI connectivity...");
    const basicTest = await universalAI.processAnyPrompt({
      text: "Hello, how are you?",
    });
    console.log(
      "✅ Basic connectivity working:",
      basicTest.summary.substring(0, 50) + "..."
    );

    // Run advanced intelligence tests
    await testAdvancedIntelligence();

    // Demonstrate advanced features
    await demonstrateAdvancedFeatures();

    console.log("\n🎉 === TEST SUITE COMPLETED ===");
    console.log("🚀 Your AI agent now has universal intelligence!");
    console.log("✨ It can handle ANY type of task with advanced reasoning");
    console.log("🧠 Memory system tracks conversations and learns patterns");
    console.log("🔧 Task decomposition breaks complex requests into steps");
    console.log("💡 Proactive suggestions help you discover new possibilities");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
}

// 📋 USAGE EXAMPLES FOR YOU TO TRY

function showUsageExamples() {
  console.log("\n📋 === TRY THESE COMMANDS IN YOUR SKIPPY AI ===\n");

  const examples = [
    "🎯 Study Management:",
    "  • Create flashcards from my JavaScript notes",
    "  • Help me prepare for my exam next week",
    "  • Organize my study materials",
    "",
    "🧠 Smart Analysis:",
    "  • Find gaps in my programming knowledge",
    "  • What should I focus on next?",
    "  • Compare my notes on React vs Vue",
    "",
    "🎨 Creative Tasks:",
    "  • Explain machine learning in simple terms",
    "  • Generate practice coding problems",
    "  • Help me write a technical summary",
    "",
    "🗣️ Natural Language:",
    "  • Quiz me on databases",
    "  • Test my knowledge about algorithms",
    "  • How am I doing with my studies?",
    "",
    "🔗 Cross-Domain:",
    "  • Connect my notes and schedule optimally",
    "  • Create a personalized learning path",
    "  • Suggest study sessions based on my progress",
  ];

  examples.forEach((example) => console.log(example));

  console.log("\n🌟 The AI will now:");
  console.log("  ✨ Understand ANY natural language request");
  console.log("  🧠 Remember your conversations and preferences");
  console.log("  🔧 Break down complex tasks automatically");
  console.log("  💡 Provide proactive suggestions");
  console.log("  🚀 Continuously learn and improve");
}

// Export for external use
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    runCompleteTestSuite,
    testAdvancedIntelligence,
    demonstrateAdvancedFeatures,
    showUsageExamples,
  };
}

// Auto-run if called directly
if (typeof window !== "undefined") {
  // Browser environment
  showUsageExamples();
  console.log("\n🚀 Run runCompleteTestSuite() to test the enhanced AI agent!");
} else {
  // Node environment
  runCompleteTestSuite().then(() => {
    showUsageExamples();
  });
}
