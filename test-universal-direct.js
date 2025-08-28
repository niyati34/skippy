// Direct test of Universal Agentic AI with JavaScript flashcard generation
import { UniversalAgenticAI } from "./src/lib/universalAgent.ts";

async function testJavaScriptFlashcards() {
  console.log(
    "🧪 Testing Universal Agentic AI - JavaScript Flashcard Generation"
  );
  console.log("=".repeat(70));

  const universalAI = new UniversalAgenticAI();

  // Test the original problematic prompt
  const testPrompt =
    "create50 flash card from javascript interview most asked question";

  console.log(`📝 Testing prompt: "${testPrompt}"`);
  console.log("");

  try {
    const startTime = Date.now();
    const result = await universalAI.processAnyPrompt({ text: testPrompt });
    const endTime = Date.now();

    console.log("✅ Universal AI Processing Complete!");
    console.log(`⏱️  Processing time: ${endTime - startTime}ms`);
    console.log("");

    // Display result summary
    console.log("📊 RESULT SUMMARY:");
    console.log("-".repeat(50));
    console.log(`Summary: ${result.summary}`);
    console.log("");

    // Display flashcard details
    if (result.artifacts && result.artifacts.flashcards) {
      const flashcards = result.artifacts.flashcards;
      console.log(`🎴 Generated Flashcards: ${flashcards.length}`);
      console.log("");

      // Show first 5 flashcards for quality check
      console.log("🔍 QUALITY CHECK - First 5 Flashcards:");
      console.log("=".repeat(70));

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
          card.question.toLowerCase().includes("scope")
      ).length;

      console.log("\n" + "=".repeat(70));
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
      } else {
        console.log(
          "\n🎉 SUCCESS - All cards contain real JavaScript interview content!"
        );
      }
    } else {
      console.log("❌ No flashcards generated!");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testJavaScriptFlashcards().catch(console.error);
