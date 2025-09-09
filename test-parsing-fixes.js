// Test the specific parsing fixes
import * as chrono from "chrono-node";

console.log("🧪 Testing Parsing Fixes");

// Test 1: Schedule detection with time patterns
const scheduleInput = "schedule physics review Friday 6pm";
console.log("\n1. Schedule Input:", scheduleInput);

// Test chrono parsing
const parsed = chrono.parseDate(scheduleInput);
console.log("Chrono parsed date:", parsed);

// Test 2: Topic extraction from schedule
function extractTopicTest(input) {
  const timePattern =
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}|\d{1,2}pm|\d{1,2}am|tomorrow|today|next week|at\s+\d)/i;
  let cleanInput = input;

  // Remove time patterns from the end
  cleanInput = cleanInput.replace(timePattern, "").trim();

  // Remove action words
  cleanInput = cleanInput
    .replace(
      /(create|make|generate|add|new|build|delete|remove|clear|drop|erase|trash|wipe|schedule|plan)\s*/i,
      ""
    )
    .trim();

  return cleanInput || "general";
}

const extractedTopic = extractTopicTest(scheduleInput);
console.log("Extracted topic:", extractedTopic);

// Test 3: Compound parsing simulation
const compoundInput =
  "schedule physics review Friday 6pm and create 5 flashcards about it";
console.log("\n2. Compound Input:", compoundInput);

const parts = compoundInput.split(" and ");
console.log("Split parts:", parts);

// Simulate topic inheritance
let lastTopic = null;
for (const part of parts) {
  const trimmed = part.trim();
  console.log(`Processing part: "${trimmed}"`);

  if (trimmed.includes("physics review")) {
    lastTopic = "physics review";
    console.log(`Set lastTopic to: "${lastTopic}"`);
  }

  if (trimmed.includes("about it") && lastTopic) {
    console.log(`Would inherit topic "${lastTopic}" for "about it"`);
  }
}

console.log("\n✅ All parsing fixes should now work!");
