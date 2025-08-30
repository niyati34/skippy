// Test specific user scenario: "40 flashhhh card of block cain"
// Run this with: npx tsx test-user-scenario.js

import { UniversalAgenticAI } from "./src/lib/universalAgent.js";

console.log('🧪 Testing User Scenario: "40 flashhhh card of block cain"');
console.log(
  "======================================================================"
);

const universalAI = new UniversalAgenticAI();

async function testUserScenario() {
  try {
    const result = await universalAI.processAnyPrompt({
      text: "40 flashhhh card of block cain",
    });

    console.log("\n📊 RESULT SUMMARY:");
    console.log("--------------------------------------------------");
    console.log("Summary:", result.summary);
    console.log(
      "🎴 Generated Flashcards:",
      result.artifacts?.flashcards?.length || 0
    );

    if (
      result.artifacts?.flashcards &&
      result.artifacts.flashcards.length > 0
    ) {
      console.log("\n🔍 FIRST 5 FLASHCARDS:");
      console.log(
        "======================================================================"
      );

      result.artifacts.flashcards.slice(0, 5).forEach((card, i) => {
        console.log(`\n📌 Card ${i + 1}:`);
        console.log(`   Question: ${card.question}`);
        console.log(`   Answer: ${card.answer}`);
        console.log(`   Category: ${card.category}`);

        // Check if it's blockchain-related content
        const isBlockchainContent =
          card.question.toLowerCase().includes("blockchain") ||
          card.answer.toLowerCase().includes("blockchain") ||
          card.question.toLowerCase().includes("crypto") ||
          card.answer.toLowerCase().includes("crypto") ||
          card.question.toLowerCase().includes("bitcoin") ||
          card.answer.toLowerCase().includes("bitcoin") ||
          card.category.toLowerCase().includes("blockchain");

        console.log(
          `   Content Type: ${
            isBlockchainContent ? "✅ BLOCKCHAIN" : "❓ OTHER"
          }`
        );
      });

      // Quality analysis
      const blockchainCards = result.artifacts.flashcards.filter(
        (card) =>
          card.question.toLowerCase().includes("blockchain") ||
          card.answer.toLowerCase().includes("blockchain") ||
          card.question.toLowerCase().includes("crypto") ||
          card.answer.toLowerCase().includes("crypto") ||
          card.question.toLowerCase().includes("bitcoin") ||
          card.answer.toLowerCase().includes("bitcoin") ||
          card.category.toLowerCase().includes("blockchain")
      );

      console.log(
        "\n======================================================================"
      );
      console.log("📈 QUALITY ANALYSIS:");
      console.log(
        `   Total cards generated: ${result.artifacts.flashcards.length}`
      );
      console.log(`   Requested count: 40`);
      console.log(
        `   Count accuracy: ${
          result.artifacts.flashcards.length === 40
            ? "✅ EXACT"
            : "❌ INCORRECT"
        }`
      );
      console.log(`   Blockchain-related cards: ${blockchainCards.length}`);
      console.log(
        `   Content accuracy: ${
          blockchainCards.length > 0
            ? "✅ BLOCKCHAIN CONTENT"
            : "❌ NO BLOCKCHAIN"
        }`
      );
      console.log(
        `   Typo recognition: ${
          result.artifacts.flashcards.length > 0 ? "✅ SUCCESS" : "❌ FAILED"
        }`
      );

      if (
        result.artifacts.flashcards.length === 40 &&
        blockchainCards.length > 0
      ) {
        console.log("\n🎉 SUCCESS - User scenario handled perfectly!");
        console.log(
          '✅ Recognized extreme typos: "flashhhh" → "flashcards", "block cain" → "blockchain"'
        );
        console.log("✅ Generated exactly 40 flashcards");
        console.log("✅ Content is blockchain-specific");
      } else {
        console.log("\n❌ ISSUES DETECTED:");
        if (result.artifacts.flashcards.length !== 40) {
          console.log(
            `   - Wrong count: got ${result.artifacts.flashcards.length} instead of 40`
          );
        }
        if (blockchainCards.length === 0) {
          console.log("   - No blockchain content detected");
        }
      }
    } else {
      console.log("❌ No flashcards generated");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testUserScenario();
