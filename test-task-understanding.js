// Direct test of TaskUnderstanding - Debug the specific issue
// Run this in browser console to test the problematic command

console.log("🧪 Testing TaskUnderstanding directly");

// Test the exact command that's failing
const testCommand =
  "delete all flashcard and make 5 flashcard off batman and 1 notes of superman";

console.log(`\n🎯 Testing command: "${testCommand}"`);

// Test if we can import TaskUnderstanding (this would work in the app's console)
/*
if (typeof TaskUnderstanding !== 'undefined') {
    console.log("✅ TaskUnderstanding available");
    
    const result = TaskUnderstanding.understandRequest(testCommand);
    console.log("📊 Result:", result);
    console.log("📝 Actions:", result.actions);
    
    result.actions.forEach((action, index) => {
        console.log(`${index + 1}. ${action.type} ${action.target}`, action.data || '');
    });
} else {
    console.log("❌ TaskUnderstanding not available - run this in the app console");
}
*/

// Simulate the logic we expect to happen
console.log("\n🔍 Simulating expected behavior:");

// Test splitting
const parts = testCommand.split(/ and /gi);
console.log("Split parts:", parts);

// Test each part classification
parts.forEach((part, index) => {
  console.log(`\nPart ${index + 1}: "${part}"`);

  // Test patterns
  const hasDeleteWord = ["delete", "remove", "clear"].some((word) =>
    part.toLowerCase().includes(word)
  );
  const hasCreateWord = ["create", "make", "generate", "add"].some((word) =>
    part.toLowerCase().includes(word)
  );
  const hasNumberPattern = part.match(/\d+\s*(?:flashcard|card|note|flash)/i);

  console.log(`  - Has delete word: ${hasDeleteWord}`);
  console.log(`  - Has create word: ${hasCreateWord}`);
  console.log(
    `  - Has number pattern: ${
      hasNumberPattern ? `YES: "${hasNumberPattern[0]}"` : "NO"
    }`
  );

  // Expected classification
  let expectedType = "unknown";
  if (hasDeleteWord) expectedType = "delete";
  else if (hasCreateWord || hasNumberPattern) expectedType = "create";

  console.log(`  - Expected type: ${expectedType}`);
});

console.log("\n🎯 Expected final result:");
console.log("1. DELETE flashcards");
console.log("2. CREATE 5 flashcards about batman");
console.log("3. CREATE 1 note about superman");

console.log("\n💡 To test in the app:");
console.log("1. Open browser console in the main app");
console.log("2. Paste this code and run it");
console.log("3. Then test the actual command in the UI");
