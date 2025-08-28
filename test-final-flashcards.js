// Quick test of the content-specific fallback system
import { UniversalAgenticAI } from "./src/lib/universalAgent.js";

const universalAI = new UniversalAgenticAI();

async function testJavaScriptFlashcards() {
  console.log(
    '🧪 Testing: "create50 flash card from javascript interview most asked question"'
  );
  console.log("=".repeat(80));

  try {
    const result = await universalAI.processAnyPrompt({
      text: "create50 flash card from javascript interview most asked question",
    });

    console.log("\n📊 RESULT ANALYSIS:");
    console.log(`✅ Summary: ${result.summary}`);

    if (
      result.artifacts?.flashcards &&
      result.artifacts.flashcards.length > 0
    ) {
      const cards = result.artifacts.flashcards;
      console.log(`📚 Generated ${cards.length} flashcards`);

      console.log("\n🎴 SAMPLE FLASHCARDS:");
      cards.slice(0, 10).forEach((card, index) => {
        console.log(`\n[${index + 1}] Question: ${card.question}`);
        console.log(
          `    Answer: ${card.answer.substring(0, 100)}${
            card.answer.length > 100 ? "..." : ""
          }`
        );
        console.log(`    Category: ${card.category || "N/A"}`);
      });

      if (cards.length > 10) {
        console.log(`\n... and ${cards.length - 10} more flashcards`);
      }

      // Check for quality indicators
      const realContent = cards.filter(
        (card) =>
          !card.question.includes("Advanced question about") &&
          !card.question.includes("key concept about") &&
          card.question.length > 20
      );

      console.log(`\n🎯 QUALITY CHECK:`);
      console.log(
        `📈 Real content cards: ${realContent.length}/${cards.length}`
      );
      console.log(
        `✨ Quality percentage: ${(
          (realContent.length / cards.length) *
          100
        ).toFixed(1)}%`
      );

      // Check for JavaScript-specific content
      const jsSpecific = cards.filter(
        (card) =>
          card.question.toLowerCase().includes("javascript") ||
          card.answer.toLowerCase().includes("javascript") ||
          card.question.toLowerCase().includes("closure") ||
          card.question.toLowerCase().includes("hoisting") ||
          card.question.toLowerCase().includes("promise")
      );

      console.log(
        `🔧 JavaScript-specific cards: ${jsSpecific.length}/${cards.length}`
      );
      console.log(
        `🎯 JS relevance: ${((jsSpecific.length / cards.length) * 100).toFixed(
          1
        )}%`
      );
    } else {
      console.log("❌ No flashcards generated");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("🔍 Stack:", error.stack);
  }
}

testJavaScriptFlashcards();
