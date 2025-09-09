// Quick test to verify the fixes work correctly
// Run this in your browser console to test the compound parsing improvements

import { TaskUnderstanding } from "./src/lib/taskUnderstanding";
import { AgentOrchestrator } from "./src/lib/agentOrchestrator";

// Test the specific command that had issues
const testCommand = "generate 10 flashcard on sinchan and one note";

console.log("🧪 Testing compound command fixes...");
console.log(`Input: "${testCommand}"`);

// Test 1: Check task understanding
const understood = TaskUnderstanding.understandRequest(testCommand);
console.log("📋 Parsed actions:", understood.actions);

// Verify the fixes:
console.log("\n✅ Checking fixes:");

// Fix 1: Topic inheritance
const flashcardAction = understood.actions.find(
  (a) => a.target === "flashcards"
);
const noteAction = understood.actions.find((a) => a.target === "notes");

console.log(`Flashcard topic: "${flashcardAction?.data?.topic}"`);
console.log(`Note topic: "${noteAction?.data?.topic}"`);

if (noteAction?.data?.topic === flashcardAction?.data?.topic) {
  console.log("✅ Topic inheritance working: Note inherited flashcard topic!");
} else {
  console.log(
    "❌ Topic inheritance issue: Note topic should inherit from flashcard"
  );
}

// Fix 2: Count extraction
const flashcardCount = flashcardAction?.data?.count;
console.log(`Flashcard count: ${flashcardCount}`);

if (flashcardCount === 10) {
  console.log(
    "✅ Count extraction working: Correctly extracted 10 flashcards!"
  );
} else {
  console.log("❌ Count extraction issue: Should be 10 flashcards");
}

// Test the full orchestration
console.log("\n🚀 Testing full orchestration...");
AgentOrchestrator.run(testCommand).then((result) => {
  console.log("📝 Orchestration result:", result.message);
  console.log("📊 Details:", result.details);

  // Check if summary mentions correct count
  if (result.message.includes("10 flashcards")) {
    console.log("✅ Summary count fix working!");
  } else {
    console.log("❌ Summary count still incorrect");
  }

  // Check if note topic is correct
  if (
    result.message.includes("sinchan") &&
    !result.message.includes("about one")
  ) {
    console.log("✅ Summary topic inheritance working!");
  } else {
    console.log("❌ Summary topic inheritance issue");
  }
});

export { testCommand };
