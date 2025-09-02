// Test your exact scenario
const { TaskUnderstanding } = require("./dist/lib/taskUnderstanding.js");

console.log("🧪 Testing your exact problematic input...\n");

const testInput = "10 flashcarddd of react and 1 note for car";
console.log("Input:", testInput);

const result = TaskUnderstanding.understandRequest(testInput);
console.log("\nResult:");
console.log("- Actions:", result.actions.length);
console.log("- Message:", result.message);
console.log("- Confidence:", result.confidence);

console.log("\n🔍 Detailed Actions:");
result.actions.forEach((action, i) => {
  console.log(`${i + 1}. ${action.type} ${action.target}`);
  if (action.data) {
    console.log(`   Topic: ${action.data.topic}`);
    if (action.data.count) console.log(`   Count: ${action.data.count}`);
  }
});

console.log("\n✅ Expected behavior:");
console.log("- Should create 10 flashcards about React");
console.log("- Should create 1 note about car");
console.log('- Should NOT create "flashcards for everything"');
