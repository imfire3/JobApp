"use client"

import { useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { useAnchoredDropdownStyle } from "@/components/ui/use-anchored-dropdown-style"
import { filterCatalogOptions } from "@/lib/jobs/search-filter-catalogs"
import { cn } from "@/lib/utils"

type CityComboboxProps = {
  id?: string
  options: string[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

function parseSegments(raw: string): string[] {
  const parts = raw.split(",").map((part) => part.trim())
  return parts.filter((part, index) => part !== "" || index === parts.length - 1)
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = value.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sameValues(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

/**
 * Free-text comma-separated input with a suggestion dropdown (portaled, no chips).
 * Typing filters the last segment; picking a city appends or completes it.
 */
export function CityCombobox({
  id,
  options,
  values,
  onChange,
  placeholder,
  className,
}: CityComboboxProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const [typed, setTyped] = useState(false)
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const listStyle = useAnchoredDropdownStyle(open, anchorRef, 192, {
    alwaysBelow: true,
    gap: 8,
  })

  const display = draft ?? values.join(", ")
  const lastSegment = display.split(",").pop()?.trim() ?? ""
  const query = typed ? lastSegment : ""

  const filtered = useMemo(
    () =>
      filterCatalogOptions(options, query).filter(
        (option) =>
          !values.some(
            (value) => value.trim().toLowerCase() === option.value.toLowerCase()
          )
      ),
    [options, query, values]
  )

  const handlePick = (city: string) => {
    const raw = draft ?? values.join(", ")
    const segments = raw.split(",").map((segment) => segment.trim())
    const base = typed ? segments.slice(0, -1) : segments
    onChange(dedupe([...base, city]))
    setDraft(null)
    setTyped(false)
    setOpen(false)
  }

  const commitDraft = () => {
    const cleaned = dedupe(parseSegments(draft ?? values.join(", ")))
    if (!sameValues(cleaned, values)) {
      onChange(cleaned)
    }
    setDraft(null)
    setTyped(false)
  }

  const list =
    open && filtered.length > 0 ? (
      <ul
        role="listbox"
        style={listStyle}
        className="max-h-48 overflow-y-auto rounded-md border border-border bg-popover p-1 text-base shadow-md"
      >
        {filtered.slice(0, 80).map((option) => (
          <li key={option.value}>
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="flex w-full rounded-sm px-2 py-1.5 text-left hover:bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handlePick(option.value)}
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    ) : null

  return (
    <div ref={anchorRef} className={cn("relative", className)}>
      <Input
        id={id}
        value={display}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          const raw = e.target.value
          setDraft(raw)
          setTyped(true)
          setOpen(true)
          onChange(parseSegments(raw))
        }}
        onFocus={() => {
          setTyped(false)
          setOpen(true)
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false)
            commitDraft()
          }, 150)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && filtered[0]) {
            e.preventDefault()
            handlePick(filtered[0].value)
          }
          if (e.key === "Escape") {
            setOpen(false)
          }
        }}
        aria-autocomplete="list"
        aria-expanded={open}
        role="combobox"
      />
      {typeof document !== "undefined" && list
        ? createPortal(list, document.body)
        : null}
    </div>
  )
}
