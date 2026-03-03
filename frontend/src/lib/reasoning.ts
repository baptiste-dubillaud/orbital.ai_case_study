import { ReasoningItem, ToolCall } from "./types";

/** Append a thinking chunk to the reasoning array, merging consecutive thinking items. */
export function appendThinkingChunk(
  items: ReasoningItem[],
  chunk: string,
): ReasoningItem[] {
  const last = items[items.length - 1];
  if (last?.type === "thinking") {
    return [
      ...items.slice(0, -1),
      { type: "thinking", content: last.content + chunk },
    ];
  }
  return [...items, { type: "thinking", content: chunk }];
}

/** Append a new tool call entry to the reasoning array. */
export function appendToolCall(
  items: ReasoningItem[],
  tc: ToolCall,
): ReasoningItem[] {
  return [...items, { type: "tool_call", toolCall: tc }];
}

/** Merge a tool result into the matching tool call entry. */
export function mergeToolResult(
  items: ReasoningItem[],
  toolCallId: string,
  toolName: string,
  result: string,
): ReasoningItem[] {
  return items.map((item) => {
    if (
      item.type === "tool_call" &&
      item.toolCall.toolCallId === toolCallId
    ) {
      return {
        ...item,
        toolCall: {
          ...item.toolCall,
          toolName: item.toolCall.toolName || toolName,
          result,
        },
      };
    }
    return item;
  });
}

/** Extract an HTML plot filename from a tool result string. */
export function extractPlotFile(result: string): string | null {
  const match = result.match(/Saved to:\s*output\/(.+\.html)/);
  return match ? match[1] : null;
}
