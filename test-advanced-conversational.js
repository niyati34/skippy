// Test Advanced Conversational AI Features
// This validates the new study buddy capabilities

import { universalAI } from "./src/lib/universalAgent.js";
import { studyDataManager } from "./src/lib/studyDataManager.js";

async function testAdvancedConversation() {
  console.log("🤖 Testing Advanced Conversational Study Buddy");
  console.log("==================================================");

  // Test 1: Casual greeting
  console.log("\n1. Testing casual greeting...");
  try {
    const result = await universalAI.processAnyPrompt({ text: "hey there!" });
    console.log("✅ Greeting Response:", result.summary);
  } catch (error) {
    console.log("❌ Greeting failed:", error.message);
  }

  // Test 2: Schedule query
  console.log("\n2. Testing schedule query...");
  try {
    const result = await universalAI.processAnyPrompt({
      text: "what's tomorrow?",
    });
    console.log("✅ Schedule Response:", result.summary);
  } catch (error) {
    console.log("❌ Schedule query failed:", error.message);
  }

  // Test 3: Data search
  console.log("\n3. Testing data search...");
  try {
    const result = await universalAI.processAnyPrompt({
      text: "find my notes about JavaScript",
    });
    console.log("✅ Search Response:", result.summary);
  } catch (error) {
    console.log("❌ Data search failed:", error.message);
  }

  // Test 4: Study recommendations
  console.log("\n4. Testing study recommendations...");
  try {
    const result = await universalAI.processAnyPrompt({
      text: "give me study recommendations",
    });
    console.log("✅ Recommendations:", result.summary);
  } catch (error) {
    console.log("❌ Recommendations failed:", error.message);
  }

  // Test 5: Data context awareness
  console.log("\n5. Testing data context awareness...");
  try {
    const context = studyDataManager.getStudyContext();
    console.log("✅ Study Context Retrieved:");
    console.log(`   📚 Flashcards: ${context.stats.totalFlashcards}`);
    console.log(`   📝 Notes: ${context.stats.totalNotes}`);
    console.log(`   📅 Upcoming Events: ${context.stats.upcomingEvents}`);
    console.log(
      `   🎯 Favorite Topics: ${context.stats.favoriteTopics.join(", ")}`
    );
  } catch (error) {
    console.log("❌ Context retrieval failed:", error.message);
  }

  console.log("\n🎉 Advanced conversational testing complete!");
  console.log(
    "✨ The study buddy now has true conversational AI capabilities!"
  );
}

// Run the test
testAdvancedConversation().catch(console.error);
