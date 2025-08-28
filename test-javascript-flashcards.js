// Test the Universal Agentic AI with the original problematic prompt
import { UniversalAgenticAI } from "./src/lib/universalAgent.js";

const universalAI = new UniversalAgenticAI();

async function testJavaScriptFlashcards() {
  console.log(
    '🧪 Testing: "create50 flash card from javascript interview most asked question"'
  );
  console.log("=".repeat(80));

  try {
    const result = await universalAI.processAnyPrompt(
      "create50 flash card from javascript interview most asked question"
    );

    console.log("\n📊 RESULT ANALYSIS:");
    console.log(`✅ Success: ${result.success}`);
    console.log(`📝 Message: ${result.message}`);
    console.log(`📚 Generated Items: ${result.data?.artifacts?.length || 0}`);

    if (result.data?.artifacts && result.data.artifacts.length > 0) {
      console.log("\n🎴 SAMPLE FLASHCARDS:");
      result.data.artifacts.slice(0, 5).forEach((card, index) => {
        console.log(`\n[${index + 1}] Question: ${card.question}`);
        console.log(`    Answer: ${card.answer}`);
        console.log(`    Category: ${card.category || "N/A"}`);
      });

      if (result.data.artifacts.length > 5) {
        console.log(
          `\n... and ${result.data.artifacts.length - 5} more flashcards`
        );
      }

      // Check for quality indicators
      const realContent = result.data.artifacts.filter(
        (card) =>
          (!card.question.includes("Advanced check") &&
            !card.question.includes("dummy") &&
            card.question.toLowerCase().includes("javascript")) ||
          card.answer.toLowerCase().includes("javascript") ||
          card.question.length > 20
      );

      console.log(`\n🎯 QUALITY CHECK:`);
      console.log(
        `📈 Real content cards: ${realContent.length}/${result.data.artifacts.length}`
      );
      console.log(
        `✨ Quality percentage: ${(
          (realContent.length / result.data.artifacts.length) *
          100
        ).toFixed(1)}%`
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("🔍 Stack:", error.stack);
  }
}

testJavaScriptFlashcards();
