"use client"

import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react"

const HIDDEN_STYLE: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: 0,
  zIndex: 80,
  visibility: "hidden",
  pointerEvents: "none",
}

/** Fixed position under an anchor so menus escape overflow:hidden ancestors (cards). */
export function useAnchoredDropdownStyle(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  maxHeight = 256
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>(HIDDEN_STYLE)

  useLayoutEffect(() => {
    if (!open) return

    const update = () => {
      const el = anchorRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const spaceAbove = rect.top - 8
      const openUp =
        spaceBelow < Math.min(maxHeight, 160) && spaceAbove > spaceBelow
      const height = Math.min(maxHeight, Math.max(openUp ? spaceAbove : spaceBelow, 120))
      setStyle({
        position: "fixed",
        top: openUp ? undefined : rect.bottom + 4,
        bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left,
        width: Math.max(rect.width, 160),
        maxHeight: height,
        zIndex: 80,
        visibility: "visible",
      })
    }

    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open, anchorRef, maxHeight])

  if (!open) return HIDDEN_STYLE
  return style
}
