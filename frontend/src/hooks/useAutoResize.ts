import { useEffect, RefObject } from "react";

/**
 * Auto-resize a textarea to fit its content, capped at `maxHeight`.
 */
export function useAutoResize(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  maxHeight = 150
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  }, [ref, value, maxHeight]);
}
