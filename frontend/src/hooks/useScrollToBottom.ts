import { useEffect, useRef, useCallback, RefObject } from "react";

const NEAR_BOTTOM_PX = 80;

/**
 * Auto-scroll a container to the bottom when `dep` changes,
 * but only while the user hasn't scrolled away.
 *
 * - Disengages when the user scrolls up (wheel / touch / trackpad).
 * - Re-engages when the user scrolls back near the bottom.
 * - Uses rAF-throttled `scrollTop` assignment to avoid overlapping
 *   smooth-scroll animations that cause "stuck in the middle" jank.
 */
export function useScrollToBottom<T>(
  containerRef: RefObject<HTMLElement | null>,
  dep: T
) {
  const lockedRef = useRef(true); // true = auto-scrolling is active
  const rafRef = useRef<number | null>(null);

  /** Is the container scrolled to (or near) the bottom? */
  const isNearBottom = useCallback((el: HTMLElement) => {
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }, []);

  /* ── User-initiated scroll detection ─────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // wheel / touchmove → user is actively scrolling
    const disengage = () => {
      lockedRef.current = false;
    };

    // After any scroll, re-engage if user reached the bottom
    const onScroll = () => {
      if (!lockedRef.current && isNearBottom(el)) {
        lockedRef.current = true;
      }
    };

    el.addEventListener("wheel", disengage, { passive: true });
    el.addEventListener("touchmove", disengage, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("wheel", disengage);
      el.removeEventListener("touchmove", disengage);
      el.removeEventListener("scroll", onScroll);
    };
  }, [containerRef, isNearBottom]);

  /* ── Auto-scroll when dep changes ────────────────────────── */
  useEffect(() => {
    if (!lockedRef.current) return;

    const el = containerRef.current;
    if (!el) return;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      rafRef.current = null;
    });

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef, dep]);
}
