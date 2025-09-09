// Test the new LLM-based compound parsing
// Usage: node test-llm-parsing.js

import { TaskUnderstanding } from "./src/lib/taskUnderstanding.js";

async function testLLMParsing() {
  console.log("🧪 Testing LLM-based compound parsing...\n");

  const testCases = [
    "delete all flashcards schedule physics review Friday 6pm and create 5 flashcards about it",
    "schedule math study tomorrow 3pm and make 10 flashcards about calculus",
    "delete all notes and create new ones about chemistry",
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: "${testCase}"`);
    try {
      const result = await TaskUnderstanding.understandRequest(testCase);
      console.log(`✅ Parsed ${result.actions.length} actions:`);
      result.actions.forEach((action, i) => {
        console.log(
          `  ${i + 1}. ${action.type} ${action.target} - Topic: ${
            action.data?.topic || action.data?.task || "N/A"
          }`
        );
        if (action.data?.count) console.log(`     Count: ${action.data.count}`);
        if (action.data?.timeString)
          console.log(`     Time: ${action.data.timeString}`);
      });
      console.log(`   Message: ${result.message}`);
      console.log(`   Confidence: ${result.confidence}`);
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
  }
}

testLLMParsing().catch(console.error);
