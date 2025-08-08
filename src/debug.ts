import {
  extractFileContent,
  generateFlashcardsFromContent,
} from "@/services/fileProcessor";

// Test function to debug file processing
export async function testFileProcessing() {
  console.log("=== File Processing Debug Test ===");

  try {
    // Test with a simple text blob
    const testFile = new File(
      [
        "This is a test document about DevOps. DevOps is a combination of software development and IT operations. Key principles include continuous integration, continuous deployment, infrastructure as code, and monitoring.",
      ],
      "test.txt",
      {
        type: "text/plain",
      }
    );

    console.log(
      "Test file created:",
      testFile.name,
      testFile.type,
      testFile.size
    );

    const content = await extractFileContent(testFile);
    console.log("Extracted content:", content);

    // Test flashcard generation
    const flashcards = await generateFlashcardsFromContent(
      content,
      testFile.name
    );
    console.log("Generated flashcards:", flashcards);

    return { success: true, content, flashcards };
  } catch (error) {
    console.error("Test failed:", error);
    return { success: false, error: error.message };
  }
}

// Test with the actual test file
export async function testWithDevOpsFile() {
  console.log("=== Testing with DevOps File ===");

  try {
    // Fetch the test file content
    const response = await fetch("/test-devops.txt");
    const content = await response.text();

    console.log("Loaded test file content:", content.substring(0, 200));

    // Test flashcard generation directly
    const flashcards = await generateFlashcardsFromContent(
      content,
      "test-devops.txt"
    );
    console.log("Generated flashcards from DevOps file:", flashcards);

    return { success: true, content, flashcards };
  } catch (error) {
    console.error("DevOps test failed:", error);
    return { success: false, error: error.message };
  }
}

// Export for use in console
(window as any).testFileProcessing = testFileProcessing;
(window as any).testWithDevOpsFile = testWithDevOpsFile;
