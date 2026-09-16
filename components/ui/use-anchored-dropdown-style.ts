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

type AnchoredDropdownOptions = {
  /** Always open below the anchor (never flips above). */
  alwaysBelow?: boolean
  /** Vertical gap between the anchor and the popup. Default 4. */
  gap?: number
  /** Minimum width of the popup. Default 160. */
  minWidth?: number
}

/** Fixed position under an anchor so menus escape overflow:hidden ancestors (cards).
 *  By default flips above when there is not enough space below; pass
 *  `alwaysBelow: true` to always keep the listbox under the trigger. */
export function useAnchoredDropdownStyle(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  maxHeight = 256,
  options?: AnchoredDropdownOptions
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>(HIDDEN_STYLE)
  const { alwaysBelow = false, gap = 4, minWidth = 160 } = options ?? {}

  useLayoutEffect(() => {
    if (!open) return

    const update = () => {
      const el = anchorRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom - gap
      const spaceAbove = rect.top - gap
      const openUp =
        !alwaysBelow &&
        spaceBelow < Math.min(maxHeight, 160) &&
        spaceAbove > spaceBelow
      const height = Math.min(maxHeight, Math.max(openUp ? spaceAbove : spaceBelow, 120))
      setStyle({
        position: "fixed",
        top: openUp ? undefined : rect.bottom + gap,
        bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
        left: rect.left,
        width: Math.max(rect.width, minWidth),
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
  }, [open, anchorRef, maxHeight, alwaysBelow, gap, minWidth])

  if (!open) return HIDDEN_STYLE
  return style
}