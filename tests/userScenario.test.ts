import { describe, it, expect } from "vitest";
import { EnhancedNLPProcessor } from "../src/lib/enhancedNLP.js";

describe("Enhanced NLP - User Scenario Test", () => {
  it('should handle extreme typos: "40 flashhhh card of block cain"', () => {
    const nlp = new EnhancedNLPProcessor();

    console.log('🧪 Testing User Scenario: "40 flashhhh card of block cain"');
    console.log(
      "======================================================================"
    );

    const result = nlp.correctText("40 flashhhh card of block cain");

    console.log("🔧 Applied corrections:", result.corrections);
    console.log("📝 Corrected text:", result.correctedText);

    // Verify the corrections
    expect(result.corrections).toHaveLength(3); // flashh->flashcards, block cain->blockchain, redundancy fix
    expect(result.correctedText).toBe("40 flashcards of blockchain");

    // Test intent parsing patterns on the corrected text
    const hasFlashcard =
      /flash\s*card|flashcards?|flas?h+h*\s*c?ar?d?s?|quiz|practice|memorize/i.test(
        result.correctedText
      );
    expect(hasFlashcard).toBe(true);

    const topicMatch = result.correctedText.match(
      /(?:about|from|on|for|of|regarding|concerning)\s+([^.!?]+)/i
    );
    expect(topicMatch).toBeTruthy();
    expect(topicMatch![1].trim()).toBe("blockchain");

    const countMatch = result.correctedText.match(/\b(\d{1,3})\b/);
    expect(countMatch).toBeTruthy();
    expect(parseInt(countMatch![1])).toBe(40);

    console.log("\n🎉 SUCCESS - All corrections and parsing worked perfectly!");
    console.log(
      '✅ Recognized extreme typos: "flashhhh" → "flashcards", "block cain" → "blockchain"'
    );
    console.log('✅ Fixed redundancy: "flashcards card" → "flashcards"');
    console.log("✅ Extracted count: 40");
    console.log('✅ Extracted topic: "blockchain"');
  });

  it("should handle various flashcard typo patterns", () => {
    const nlp = new EnhancedNLPProcessor();

    const testCases = [
      {
        input: "make 30 flashcarrd of ai",
        expected: "make 30 flashcards of ai",
      },
      {
        input: "create50 flash card from javascript",
        expected: "create 50 flashcards from JavaScript",
      },
      {
        input: "generat 20 flshcards about react",
        expected: "generate 20 flashcards about react",
      },
    ];

    testCases.forEach((testCase) => {
      const result = nlp.correctText(testCase.input);
      console.log(
        `Input: "${testCase.input}" → Output: "${result.correctedText}"`
      );
      expect(result.correctedText).toBe(testCase.expected);
    });
  });
});
