import { ReasoningItem, SSE_EVENT, ToolCall } from "./types";

/** Append a thinking chunk to the reasoning array, merging consecutive thinking items. */
export function appendThinkingChunk(
  items: ReasoningItem[],
  chunk: string,
): ReasoningItem[] {
  const last = items[items.length - 1];
  if (last?.type === SSE_EVENT.THINKING) {
    return [
      ...items.slice(0, -1),
      { type: SSE_EVENT.THINKING, content: last.content + chunk },
    ];
  }
  return [...items, { type: SSE_EVENT.THINKING, content: chunk }];
}

/** Append a new tool call entry to the reasoning array. */
export function appendToolCall(
  items: ReasoningItem[],
  tc: ToolCall,
): ReasoningItem[] {
  return [...items, { type: SSE_EVENT.TOOL_CALL, toolCall: tc }];
}

/** Merge a tool result into the matching tool call entry. */
export function mergeToolResult(
  items: ReasoningItem[],
  toolCallId: string,
  result: string,
): ReasoningItem[] {
  return items.map((item) => {
    if (
      item.type === SSE_EVENT.TOOL_CALL &&
      item.toolCall.toolCallId === toolCallId
    ) {
      return {
        ...item,
        toolCall: { ...item.toolCall, result },
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
