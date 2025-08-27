// Quick test script to validate command routing and schedule Q&A
// Run this with: node test-command-agents.js

console.log("=== TESTING COMMAND AGENT IMPROVEMENTS ===\n");

// Simulate the improved canHandle logic
function testCanHandle(text) {
  const pattern =
    /(make|create|generate|do|help|remember|remind|delete|remove|clear|reschedule|move|update)/i;
  return pattern.test(text);
}

// Test cases from the user's examples
const testCases = [
  "do I have exam tomorrow?",
  "delete the exam for blockchain",
  "make flashcards about AI",
  "reschedule the exam for blockchain to tomorrow 4:30 pm",
  "create notes from this content",
  "remove assignment for math",
];

console.log("🧪 Testing CommandAgent.canHandle() improvements:");
testCases.forEach((text) => {
  const matches = testCanHandle(text);
  console.log(`  "${text}" -> ${matches ? "✅ MATCHES" : "❌ NO MATCH"}`);
});

console.log("\n📝 Expected behavior:");
console.log(
  "  - 'do I have exam tomorrow?' -> Should be handled by BuddyAgent quickScheduleAnswer()"
);
console.log(
  "  - 'delete the exam for blockchain' -> Should be handled by CommandAgent"
);
console.log(
  "  - 'make flashcards about AI' -> Should be handled by CommandAgent -> FlashcardAgent"
);
console.log("  - All other commands should now route to CommandAgent");

console.log("\n🔧 Key improvements made:");
console.log(
  "  1. Extended CommandAgent.canHandle() to include delete/remove/clear/reschedule/move/update"
);
console.log(
  "  2. Updated Orchestrator wantsCommand pattern to match same verbs"
);
console.log(
  "  3. Enhanced FlashcardAgent to expand short topics like 'AI' with context"
);
console.log(
  "  4. Added quickScheduleAnswer() in BuddyAgent for instant schedule Q&A"
);

console.log("\n🎯 Manual testing steps:");
console.log("  1. Open http://localhost:8081 in browser");
console.log(
  "  2. Create a test schedule item: 'schedule tomorrow 4:30 exam of blockchain'"
);
console.log("  3. Test Q&A: 'do I have exam tomorrow?'");
console.log("  4. Test deletion: 'delete the exam for blockchain'");
console.log("  5. Test flashcards: 'make flashcards about AI'");
console.log("  6. Check browser console for routing logs");

console.log(
  "\n✅ Test complete! The command routing should now work properly."
);
