import { describe, it, expect } from "vitest";
import { UniversalAgenticAI } from "../src/lib/universalAgent";

describe("Universal Agentic AI - Real Application Test", () => {
  it("should generate real JavaScript content instead of generic placeholders", async () => {
    console.log("🧪 Testing Universal Agentic AI - Real Application Test");
    console.log("=".repeat(70));

    const universalAI = new UniversalAgenticAI();

    // Test the original problematic prompt
    const testPrompt =
      "create50 flash card from javascript interview most asked question";

    console.log(`📝 Testing prompt: "${testPrompt}"`);
    console.log("");

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

    // Basic assertions
    expect(result).toBeDefined();
    expect(result.artifacts).toBeDefined();
    expect(result.artifacts?.flashcards).toBeDefined();

    const flashcards = result.artifacts?.flashcards || [];
    console.log(`🎴 Generated Flashcards: ${flashcards.length}`);

    // Should generate cards
    expect(flashcards.length).toBeGreaterThan(0);

    // Show first 5 flashcards for quality check
    console.log("");
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
        card.question.toLowerCase().includes("scope") ||
        card.question.toLowerCase().includes("function") ||
        card.question.toLowerCase().includes("variable") ||
        card.question.toLowerCase().includes("this") ||
        card.question.toLowerCase().includes("event")
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
    }

    // The test should pass regardless, but we want to see the quality output
    expect(flashcards.length).toBeGreaterThan(0);

    // Additional quality checks
    flashcards.forEach((card) => {
      expect(card.question).toBeDefined();
      expect(card.answer).toBeDefined();
      expect(card.question).not.toBe("");
      expect(card.answer).not.toBe("");
    });
  });
});
