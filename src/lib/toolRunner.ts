import { tools, ToolId, ToolResult, ToolContext } from "./tools";

export class ToolRunner {
  static async run(
    toolId: ToolId,
    input: any = {},
    ctx: ToolContext = {}
  ): Promise<ToolResult> {
    const tool = tools[toolId];
    if (!tool) {
      return { success: false, message: `Unknown tool: ${toolId}` };
    }
    try {
      // Basic safety: could add confirmation here for destructive tools
      const result = await tool.execute(input, ctx);
      return result;
    } catch (e: any) {
      return {
        success: false,
        message: `Tool ${toolId} failed: ${e?.message || String(e)}`,
      };
    }
  }
}
