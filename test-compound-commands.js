// Test Compound Command Handling - Fix for Advanced Prompts
// This tests the specific issue: "delete all notes and make 12 flashcard off react and 1 notes of superman"

console.log("🧪 Testing Compound Command Handling");
console.log("=====================================");

// Import the enhanced systems
import { TaskUnderstanding } from "./src/lib/taskUnderstanding.js";

// Test the exact command that was failing
const testCommand =
  "delete all notes and make 12 flashcard off react and 1 notes of superman";

console.log(`\n🎯 Testing: "${testCommand}"`);

try {
  const result = TaskUnderstanding.understandRequest(testCommand);

  console.log("\n📝 Analysis Results:");
  console.log("Actions identified:", result.actions.length);
  console.log("Confidence:", result.confidence);
  console.log("Message:", result.message);

  console.log("\n🔍 Detailed Actions:");
  result.actions.forEach((action, index) => {
    console.log(`${index + 1}. Type: ${action.type}`);
    console.log(`   Target: ${action.target}`);
    console.log(`   Data:`, action.data);
    console.log(`   Priority: ${action.priority}`);
    console.log("");
  });

  // Expected result:
  // 1. DELETE action for notes
  // 2. CREATE action for 12 flashcards about React
  // 3. CREATE action for 1 note about Superman

  const expectedActions = [
    { type: "delete", target: "notes" },
    { type: "create", target: "flashcards", topic: "react", count: 12 },
    { type: "create", target: "notes", topic: "superman", count: 1 },
  ];

  console.log("✅ Expected Actions:");
  expectedActions.forEach((expected, index) => {
    const actual = result.actions[index];
    const match =
      actual &&
      actual.type === expected.type &&
      actual.target === expected.target;

    console.log(
      `${index + 1}. ${match ? "✅" : "❌"} ${expected.type} ${expected.target}`
    );
    if (expected.topic) {
      const topicMatch = actual?.data?.topic
        ?.toLowerCase()
        .includes(expected.topic);
      console.log(
        `   Topic: ${topicMatch ? "✅" : "❌"} ${expected.topic} (got: ${
          actual?.data?.topic
        })`
      );
    }
    if (expected.count) {
      const countMatch = actual?.data?.count === expected.count;
      console.log(
        `   Count: ${countMatch ? "✅" : "❌"} ${expected.count} (got: ${
          actual?.data?.count
        })`
      );
    }
  });
} catch (error) {
  console.error("❌ Test failed:", error);
}

// Test more compound commands
const additionalTests = [
  "create 5 flashcards about JavaScript and 2 notes for Python",
  "delete all flashcards then make 10 cards about React",
  "remove notes and create schedule for exam",
  "make flashcards about AI, also create notes for machine learning",
];

console.log("\n🧪 Additional Compound Command Tests:");
console.log("=====================================");

additionalTests.forEach((testCmd, index) => {
  console.log(`\n${index + 1}. Testing: "${testCmd}"`);
  try {
    const result = TaskUnderstanding.understandRequest(testCmd);
    console.log(
      `   Actions: ${result.actions.length}, Confidence: ${result.confidence}`
    );
    console.log(
      `   Types: ${result.actions
        .map((a) => `${a.type}(${a.target})`)
        .join(", ")}`
    );
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }
});

console.log("\n🎉 Compound Command Testing Complete!");
