"use client";

import { useRef, type PointerEvent, type MouseEvent } from "react";

/** Movement (px) before a press becomes a drag, so a tap stays a tap. */
const THRESHOLD = 4;

/** Drop targets mark themselves with this attribute; its value names them. */
export const DROP_ATTR = "data-drop-target";

export type DragHandlers = {
  /** A press moved past the threshold. */
  onStart: () => void;
  /** The target under the pointer changed (null: none). */
  onAim: (target: string | null) => void;
  /** Released after dragging. */
  onDrop: () => void;
  /** The browser took the pointer away (scrolling, a system gesture). */
  onCancel: () => void;
};

function targetAt(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const target = el.closest(`[${DROP_ATTR}]`);
    if (target) return target.getAttribute(DROP_ATTR);
  }
  return null;
}

/**
 * Pointer handlers that drag an element over drop targets. The element follows
 * the pointer through a transform (no re-render per move); `onAim` fires only
 * when the target changes. The click that ends a drag is swallowed.
 */
export function useDrag(handlers: DragHandlers) {
  const press = useRef<{ x: number; y: number; dragging: boolean } | null>(
    null,
  );
  const aimed = useRef<string | null>(null);
  const swallowClick = useRef(false);

  const reset = (el: HTMLElement) => {
    el.style.transform = "";
    el.removeAttribute("data-dragging");
    press.current = null;
  };

  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      press.current = { x: event.clientX, y: event.clientY, dragging: false };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const p = press.current;
      if (!p) return;
      const dx = event.clientX - p.x;
      const dy = event.clientY - p.y;
      if (!p.dragging) {
        if (Math.hypot(dx, dy) < THRESHOLD) return;
        p.dragging = true;
        aimed.current = null;
        event.currentTarget.setAttribute("data-dragging", "");
        handlers.onStart();
      }
      event.currentTarget.style.transform = `translate(${dx}px, ${dy}px)`;
      const target = targetAt(event.clientX, event.clientY);
      if (target !== aimed.current) {
        aimed.current = target;
        handlers.onAim(target);
      }
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const dragged = press.current?.dragging;
      reset(event.currentTarget);
      if (!dragged) return;
      swallowClick.current = true;
      handlers.onDrop();
    },
    onPointerCancel(event: PointerEvent<HTMLElement>) {
      const dragged = press.current?.dragging;
      reset(event.currentTarget);
      if (dragged) handlers.onCancel();
    },
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (!swallowClick.current) return;
      swallowClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
