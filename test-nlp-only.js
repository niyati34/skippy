// Test NLP processing directly
import { EnhancedNLPProcessor } from "./src/lib/enhancedNLP.js";

console.log("🧪 Testing Enhanced NLP Processing");
console.log(
  "======================================================================"
);

const nlp = new EnhancedNLPProcessor();

console.log('\n📝 Testing: "40 flashhhh card of block cain"');
const result = nlp.correctText("40 flashhhh card of block cain");
console.log("🔧 Applied corrections:", result.corrections);
console.log("📝 Corrected text:", result.correctedText);

// Test intent patterns
console.log("\n🎯 Testing intent patterns:");
const testText = result.correctedText;

const hasFlashcard =
  /flash\s*card|flashcards?|flas?h+h*\s*c?ar?d?s?|quiz|practice|memorize/i.test(
    testText
  );
console.log(`   hasFlashcard pattern: ${hasFlashcard}`);

const topicMatch =
  testText.match(
    /(?:about|from|on|for|of|regarding|concerning)\s+([^.!?]+)/i
  ) ||
  testText.match(
    /\b(make|create|generate)\b.*?\b(?:\d{1,3})?\b.*?\bflash\s*c(?:ard|ards)?\b.*?\b(?:about|from|on|for|of)\s+([^.!?]+)/i
  ) ||
  testText.match(
    /\b(make|create|generate)\b\s*\b(\d{1,3})\b\s+([^.!?]+?)\s+flash\s*c(?:ard|ards)?\b/i
  ) ||
  testText.match(
    /\b(make|create|generate)\b.*?\b(?:\d{1,3})\b.*?\bflash\s*c(?:ard|ards)?\b\s+([^.!?]+)/i
  ) ||
  testText.match(
    /\b(make|create|generate)\b.*?\b(\d{1,3})\b.*?\bflas?h+h*\s*c?ar?d?s?\b.*?\b(?:about|from|on|for|of)\s+([^.!?]+)/i
  ) ||
  testText.match(
    /\b(\d{1,3})\b.*?\bflas?h+h*\s*c?ar?d?s?\b.*?\b(?:about|from|on|for|of)\s+([^.!?]+)/i
  );

console.log(`   topicMatch:`, topicMatch);
if (topicMatch) {
  const topic = (topicMatch[3] || topicMatch[2] || topicMatch[1]).trim();
  console.log(`   extracted topic: "${topic}"`);
}

const countMatch = testText.match(/\b(\d{1,3})\b/);
const count = countMatch ? parseInt(countMatch[1]) : undefined;
console.log(`   extracted count: ${count}`);

console.log("\n🎉 Results:");
console.log(
  `   ✅ Typo correction: ${
    result.corrections.length > 0 ? "SUCCESS" : "FAILED"
  }`
);
console.log(
  `   ✅ Flashcard detection: ${hasFlashcard ? "SUCCESS" : "FAILED"}`
);
console.log(`   ✅ Topic extraction: ${topicMatch ? "SUCCESS" : "FAILED"}`);
console.log(`   ✅ Count extraction: ${count === 40 ? "SUCCESS" : "FAILED"}`);
