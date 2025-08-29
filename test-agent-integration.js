// Test script to verify agent integration in the actual application
import { createDefaultOrchestrator } from "./src/lib/agent.ts";

async function testAgentIntegration() {
  console.log("🧪 Testing Agent Integration in Web Application");
  console.log("=".repeat(60));

  try {
    const orchestrator = createDefaultOrchestrator();
    console.log("✅ Orchestrator created successfully");

    // Test the problematic prompt
    const testPrompt =
      "create50 flash card from javascript interview most asked question";

    console.log(`📝 Testing prompt: "${testPrompt}"`);
    console.log("");

    const startTime = Date.now();
    const result = await orchestrator.processUserMessage({
      text: testPrompt,
    });
    const endTime = Date.now();

    console.log("✅ Agent Processing Complete!");
    console.log(`⏱️  Processing time: ${endTime - startTime}ms`);
    console.log("");

    // Display result summary
    console.log("📊 RESULT SUMMARY:");
    console.log("-".repeat(50));
    console.log(`Summary: ${result.summary}`);
    console.log("");

    // Display flashcard details
    if (
      result.artifacts?.flashcards &&
      result.artifacts.flashcards.length > 0
    ) {
      const flashcards = result.artifacts.flashcards;
      console.log(`🎴 Generated Flashcards: ${flashcards.length}`);
      console.log("");

      // Show first 5 flashcards for quality check
      console.log("🔍 QUALITY CHECK - First 5 Flashcards:");
      console.log("=".repeat(60));

      flashcards.slice(0, 5).forEach((card, index) => {
        console.log(`\n📌 Card ${index + 1}:`);
        console.log(`   Question: ${card.question}`);
        console.log(`   Answer: ${card.answer}`);
        console.log(`   Category: ${card.category || "N/A"}`);

        // Quality analysis
        const isGeneric =
          card.question.includes("Advanced question") ||
          card.question.includes("Advanced check") ||
          card.answer.includes("sample answer");

        console.log(
          `   Quality: ${
            isGeneric ? "❌ GENERIC/PLACEHOLDER" : "✅ SPECIFIC CONTENT"
          }`
        );
      });

      // Overall quality assessment
      const genericCount = flashcards.filter(
        (card) =>
          card.question.includes("Advanced question") ||
          card.question.includes("Advanced check") ||
          card.answer.includes("sample answer")
      ).length;

      const realJSCount = flashcards.filter(
        (card) =>
          card.question.toLowerCase().includes("javascript") ||
          card.question.toLowerCase().includes("closure") ||
          card.question.toLowerCase().includes("promise") ||
          card.question.toLowerCase().includes("hoisting") ||
          card.question.toLowerCase().includes("scope") ||
          card.question.toLowerCase().includes("function") ||
          card.question.toLowerCase().includes("variable") ||
          card.question.toLowerCase().includes("this") ||
          card.question.toLowerCase().includes("event")
      ).length;

      console.log("\n" + "=".repeat(60));
      console.log("📈 QUALITY ANALYSIS:");
      console.log(`   Total cards: ${flashcards.length}`);
      console.log(`   Generic/Placeholder cards: ${genericCount}`);
      console.log(`   Real JavaScript content: ${realJSCount}`);
      console.log(
        `   Content Quality: ${
          genericCount === 0 ? "✅ EXCELLENT" : "❌ NEEDS IMPROVEMENT"
        }`
      );

      if (genericCount > 0) {
        console.log(
          "\n⚠️  DETECTED GENERIC CARDS - Content database may not be working!"
        );
        console.log("Generic cards found:");
        flashcards
          .filter(
            (card) =>
              card.question.includes("Advanced question") ||
              card.question.includes("Advanced check") ||
              card.answer.includes("sample answer")
          )
          .forEach((card, i) => {
            console.log(`   ${i + 1}. Q: ${card.question}`);
          });
      } else {
        console.log(
          "\n🎉 SUCCESS - All cards contain real JavaScript interview content!"
        );
        console.log(
          "🎯 The Universal Agentic AI integration is working perfectly!"
        );
      }
    } else {
      console.log("❌ No flashcards generated!");
      console.log(
        "⚠️  This indicates the FlashcardAgent is not being called properly"
      );
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error(
      "⚠️  This indicates there's an issue with the agent integration"
    );
  }
}

// Run the test
testAgentIntegration().catch(console.error);
