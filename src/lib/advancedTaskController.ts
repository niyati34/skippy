// Advanced Integrated Task Controller - Coordinates the advanced task analysis and execution system
// Provides seamless integration between AdvancedTaskAnalyzer and AdvancedTaskExecutor

import {
  AdvancedTaskAnalyzer,
  AdvancedTaskRequest,
} from "./advancedTaskAnalyzer";
import {
  AdvancedTaskExecutor,
  AdvancedTaskResult,
} from "./advancedTaskExecutor";

export interface AdvancedControllerResult {
  success: boolean;
  message: string;
  originalQuery: string;
  analysisResult?: AdvancedTaskRequest;
  executionResults?: AdvancedTaskResult[];
  totalActions: number;
  successfulActions: number;
  insights?: string[];
  nextSuggestions?: string[];
  executionTime: number;
}

export class AdvancedTaskController {
  /**
   * Process any natural language request with unlimited capabilities
   * This is the main entry point for unlimited task processing
   */
  static async processAdvancedRequest(
    query: string
  ): Promise<AdvancedControllerResult> {
    const startTime = Date.now();
    console.log(
      `🚀 [AdvancedTaskController] Processing advanced request: "${query}"`
    );

    try {
      // Step 1: Analyze the request using AI-powered understanding
      console.log(`📊 [AdvancedTaskController] Analyzing request...`);
      const analysisResult =
        await AdvancedTaskAnalyzer.understandAdvancedRequest(query);

      if (
        !analysisResult.success ||
        !analysisResult.actions ||
        analysisResult.actions.length === 0
      ) {
        return {
          success: false,
          message: "Could not understand the request. Please try rephrasing.",
          originalQuery: query,
          totalActions: 0,
          successfulActions: 0,
          executionTime: Date.now() - startTime,
        };
      }

      console.log(
        `✅ [AdvancedTaskController] Analysis complete: ${analysisResult.actions.length} actions identified`
      );

      // Step 2: Execute the analyzed actions
      console.log(`⚡ [AdvancedTaskController] Executing actions...`);
      const executionResults = await AdvancedTaskExecutor.executeAdvancedTask(
        analysisResult
      );

      // Step 3: Compile results and insights
      const totalActions = executionResults.length;
      const successfulActions = executionResults.filter(
        (r) => r.success
      ).length;
      const allInsights = this.extractInsights(
        analysisResult,
        executionResults
      );
      const nextSuggestions = this.generateNextSuggestions(
        analysisResult,
        executionResults
      );

      const executionTime = Date.now() - startTime;
      console.log(
        `🎯 [AdvancedTaskController] Processing complete: ${successfulActions}/${totalActions} successful (${executionTime}ms)`
      );

      return {
        success: successfulActions > 0,
        message: this.buildSuccessMessage(
          query,
          analysisResult,
          executionResults
        ),
        originalQuery: query,
        analysisResult,
        executionResults,
        totalActions,
        successfulActions,
        insights: allInsights,
        nextSuggestions,
        executionTime,
      };
    } catch (error) {
      console.error(`❌ [AdvancedTaskController] Processing failed:`, error);

      return {
        success: false,
        message: `Failed to process request: ${error.message}`,
        originalQuery: query,
        totalActions: 0,
        successfulActions: 0,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Build success message based on results
   */
  private static buildSuccessMessage(
    query: string,
    analysis: AdvancedTaskRequest,
    results: AdvancedTaskResult[]
  ): string {
    const successfulResults = results.filter((r) => r.success);

    if (successfulResults.length === 0) {
      return "Request processed but no actions were successful.";
    }

    if (successfulResults.length === 1) {
      return successfulResults[0].message;
    }

    // Multiple successful actions
    const actions = successfulResults
      .map((r) => r.message.toLowerCase())
      .join(", ");
    return `Successfully completed multiple actions: ${actions}`;
  }

  /**
   * Extract insights from analysis and execution
   */
  private static extractInsights(
    analysis: AdvancedTaskRequest,
    results: AdvancedTaskResult[]
  ): string[] {
    const insights: string[] = [];

    // Analysis insights
    if (analysis.metadata?.insights) {
      insights.push(...analysis.metadata.insights);
    }

    // Execution insights
    results.forEach((result) => {
      if (result.insights) {
        insights.push(...result.insights);
      }
    });

    // Performance insights
    const successRate =
      (results.filter((r) => r.success).length / results.length) * 100;
    if (successRate === 100) {
      insights.push("All actions completed successfully");
    } else if (successRate > 50) {
      insights.push("Most actions completed successfully");
    } else {
      insights.push("Some actions may need retry or adjustment");
    }

    // Complexity insights
    if (analysis.actions.length > 5) {
      insights.push("Complex multi-step request processed successfully");
    }

    if (analysis.metadata?.educationalAlignment) {
      insights.push("Request aligned with educational best practices");
    }

    return [...new Set(insights)]; // Remove duplicates
  }

  /**
   * Generate next suggestions based on results
   */
  private static generateNextSuggestions(
    analysis: AdvancedTaskRequest,
    results: AdvancedTaskResult[]
  ): string[] {
    const suggestions: string[] = [];

    // Extract suggestions from results
    results.forEach((result) => {
      if (result.nextSuggestions) {
        suggestions.push(...result.nextSuggestions);
      }
    });

    // Generate contextual suggestions
    const actionTypes = analysis.actions.map((a) => a.type);
    const targets = analysis.actions.map((a) => a.target);

    if (actionTypes.includes("create")) {
      suggestions.push("Consider reviewing the created content");
      suggestions.push("Try practicing with the new material");
    }

    if (actionTypes.includes("schedule")) {
      suggestions.push("Set reminders for scheduled items");
      suggestions.push("Plan follow-up study sessions");
    }

    if (targets.includes("flashcards")) {
      suggestions.push("Practice with the flashcards regularly");
      suggestions.push("Create more flashcards on related topics");
    }

    if (targets.includes("notes")) {
      suggestions.push("Review and expand the notes");
      suggestions.push("Create flashcards from the notes");
    }

    // Learning progression suggestions
    if (analysis.metadata?.complexity === "high") {
      suggestions.push("Break down complex topics into smaller parts");
      suggestions.push("Practice concepts before moving to advanced topics");
    }

    // Failed action suggestions
    const failedResults = results.filter((r) => !r.success);
    if (failedResults.length > 0) {
      suggestions.push("Try simplifying failed requests");
      suggestions.push("Check if all required information was provided");
    }

    return [...new Set(suggestions)].slice(0, 5); // Remove duplicates and limit
  }

  /**
   * Process request with feedback and learning
   */
  static async processWithFeedback(
    query: string,
    userFeedback?: string,
    previousResults?: AdvancedControllerResult
  ): Promise<AdvancedControllerResult> {
    console.log(
      `🔄 [AdvancedTaskController] Processing with feedback: "${query}"`
    );

    // Incorporate feedback into the request
    let enhancedQuery = query;
    if (userFeedback && previousResults) {
      enhancedQuery = this.incorporateFeedback(
        query,
        userFeedback,
        previousResults
      );
    }

    return await this.processAdvancedRequest(enhancedQuery);
  }

  /**
   * Incorporate user feedback into request
   */
  private static incorporateFeedback(
    originalQuery: string,
    feedback: string,
    previousResults: AdvancedControllerResult
  ): string {
    // Analyze feedback sentiment and adjust request
    const isPositive = /good|great|perfect|excellent|nice|correct/.test(
      feedback.toLowerCase()
    );
    const isNegative = /bad|wrong|incorrect|not what|different/.test(
      feedback.toLowerCase()
    );

    if (isPositive) {
      return `${originalQuery} (user confirmed this approach works well)`;
    }

    if (isNegative) {
      return `${originalQuery} (please try a different approach based on user feedback: ${feedback})`;
    }

    // General feedback incorporation
    return `${originalQuery} (user feedback: ${feedback})`;
  }

  /**
   * Get capability summary for unlimited processing
   */
  static getCapabilitySummary(): any {
    return {
      analysisCapabilities: AdvancedTaskAnalyzer.ADVANCED_CAPABILITIES,
      targetTypes: AdvancedTaskAnalyzer.ADVANCED_TARGETS,
      executionStrategies: [
        "AI-Enhanced Operations",
        "Dynamic Action Mapping",
        "Fallback Processing",
        "Context-Aware Execution",
        "Educational Psychology Integration",
      ],
      features: [
        "Unlimited task complexity",
        "Multi-stage AI analysis",
        "Dependency resolution",
        "Optimization strategies",
        "Educational alignment",
        "Progress tracking",
        "Intelligent suggestions",
      ],
    };
  }

  /**
   * Validate request complexity and provide guidance
   */
  static validateRequestComplexity(query: string): {
    isValid: boolean;
    complexity: string;
    recommendations?: string[];
  } {
    const wordCount = query.split(/\s+/).length;
    const andCount = (query.match(/\band\b/gi) || []).length;
    const taskIndicators = (
      query.match(/create|make|generate|schedule|delete|analyze|summarize/gi) ||
      []
    ).length;

    let complexity = "simple";
    const recommendations: string[] = [];

    if (wordCount > 50 || andCount > 3 || taskIndicators > 5) {
      complexity = "high";
      recommendations.push(
        "Complex request detected - will be processed in multiple stages"
      );
    } else if (wordCount > 20 || andCount > 1 || taskIndicators > 2) {
      complexity = "medium";
      recommendations.push(
        "Moderate complexity - will decompose into manageable actions"
      );
    }

    return {
      isValid: true, // Advanced controller handles any complexity
      complexity,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }
}
