import { TaskUnderstanding } from "./src/lib/taskUnderstanding.ts";

console.log("Testing delete parsing...");

const testInput = "remove all fladhca rd and nots";
console.log(`Input: "${testInput}"`);

const result = TaskUnderstanding.understandRequest(testInput);
console.log("Parse result:", JSON.stringify(result, null, 2));

// Test if it detects as delete request
console.log(
  "Is delete request:",
  result.actions.some((a) => a.type === "delete")
);
console.log(
  "Delete targets:",
  result.actions.filter((a) => a.type === "delete").map((a) => a.target)
);
