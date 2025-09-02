// Quick test for multiple task understanding
import { TaskUnderstanding } from "./src/lib/taskUnderstanding.ts";

const testInput = "10 flashcards of react and 1 note for car";
console.log("🧪 Testing input:", testInput);

const result = TaskUnderstanding.understandRequest(testInput);
console.log("📊 Result:", JSON.stringify(result, null, 2));

console.log("\n🔍 Actions breakdown:");
result.actions.forEach((action, i) => {
  console.log(
    `  ${i + 1}. ${action.type} ${action.target} - ${JSON.stringify(
      action.data
    )}`
  );
});
