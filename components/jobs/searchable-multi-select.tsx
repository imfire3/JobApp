"use client"

import { useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAnchoredDropdownStyle } from "@/components/ui/use-anchored-dropdown-style"
import { cn } from "@/lib/utils"
import {
  filterCatalogOptions,
  type CatalogOption,
} from "@/lib/jobs/search-filter-catalogs"

type SearchableMultiSelectProps = {
  id?: string
  label?: string
  options: CatalogOption[] | string[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  allowCustom?: boolean
  /** When set, shows an explicit add CTA next to the input. */
  addButtonLabel?: string
  emptyLabel?: string
  className?: string
}

function toOptions(options: CatalogOption[] | string[]): CatalogOption[] {
  return options.map((item) =>
    typeof item === "string" ? { value: item, label: item } : item
  )
}

function labelFor(options: CatalogOption[], value: string): string {
  return options.find((opt) => opt.value === value)?.label ?? value
}

/**
 * Lightweight searchable multi-select (chips + filtered list).
 * Allows adding custom values when allowCustom is true.
 * Dropdown is portaled so it escapes card overflow clipping.
 */
export function SearchableMultiSelect({
  id,
  options,
  values,
  onChange,
  placeholder = "Rechercher…",
  allowCustom = true,
  addButtonLabel,
  emptyLabel,
  className,
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const listStyle = useAnchoredDropdownStyle(open, anchorRef, 192)
  const catalog = useMemo(() => toOptions(options), [options])
  const filtered = useMemo(
    () =>
      filterCatalogOptions(catalog, query).filter(
        (opt) => !values.includes(opt.value)
      ),
    [catalog, query, values]
  )

  const handleAdd = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setQuery("")
      return
    }
    onChange([...values, trimmed])
    setQuery("")
  }

  const handleAddFromInput = () => {
    if (filtered[0]) {
      handleAdd(filtered[0].value)
      return
    }
    if (allowCustom && query.trim()) {
      handleAdd(query)
    }
  }

  const handleRemove = (value: string) => {
    onChange(values.filter((item) => item !== value))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleAddFromInput()
    }
    if (event.key === "Escape") {
      setOpen(false)
    }
  }

  const showList =
    open && (filtered.length > 0 || (allowCustom && query.trim()))

  const list = showList ? (
    <ul
      role="listbox"
      style={listStyle}
      className="overflow-y-auto rounded-md border border-border bg-popover p-1 text-base shadow-md"
    >
      {filtered.slice(0, 80).map((opt) => (
        <li key={opt.value}>
          <button
            type="button"
            role="option"
            className="flex w-full rounded-sm px-2 py-1.5 text-left hover:bg-muted"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleAdd(opt.value)}
          >
            {opt.label}
          </button>
        </li>
      ))}
      {allowCustom &&
      query.trim() &&
      !catalog.some(
        (opt) =>
          opt.value.toLowerCase() === query.trim().toLowerCase() ||
          opt.label.toLowerCase() === query.trim().toLowerCase()
      ) &&
      !values.some((v) => v.toLowerCase() === query.trim().toLowerCase()) ? (
        <li>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto w-full justify-start px-2 py-1.5 font-normal"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleAdd(query)}
          >
            Ajouter « {query.trim()} »
          </Button>
        </li>
      ) : null}
    </ul>
  ) : null

  return (
    <div className={cn("space-y-2", className)}>
      <div ref={anchorRef} className="relative">
        <div className={cn(addButtonLabel ? "flex gap-2" : undefined)}>
          <Input
            id={id}
            value={query}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 150)
            }}
            onKeyDown={handleKeyDown}
            aria-autocomplete="list"
            aria-expanded={open}
            className={addButtonLabel ? "flex-1" : undefined}
          />
          {addButtonLabel ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddFromInput}
            >
              <Plus className="mr-1 h-4 w-4" />
              {addButtonLabel}
            </Button>
          ) : null}
        </div>
      </div>
      {typeof document !== "undefined" && list
        ? createPortal(list, document.body)
        : null}

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => {
            const label = labelFor(catalog, value)
            return (
              <Badge key={value} variant="chip" className="gap-1.5">
                {label}
                <button
                  type="button"
                  aria-label={`Retirer ${label}`}
                  onClick={() => handleRemove(value)}
                  className="rounded-full opacity-70 transition-opacity hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            )
          })}
        </div>
      ) : emptyLabel ? (
        <p className="text-base text-muted-foreground">{emptyLabel}</p>
      ) : null}
    </div>
  )
}

type SearchableSelectProps = {
  id?: string
  options: CatalogOption[] | string[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  allowCustom?: boolean
  emptyOptionLabel?: string
  className?: string
}

/** Searchable single-select dropdown (filterable list). Portaled outside cards. */
export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Rechercher…",
  allowCustom = false,
  emptyOptionLabel = "Choisir…",
  className,
}: SearchableSelectProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const listStyle = useAnchoredDropdownStyle(open, anchorRef, 256)
  const catalog = useMemo(() => toOptions(options), [options])
  const selectedLabel = value ? labelFor(catalog, value) : ""

  const filtered = useMemo(() => {
    const base = filterCatalogOptions(catalog, query)
    if (value && !base.some((opt) => opt.value === value)) {
      return [{ value, label: selectedLabel }, ...base]
    }
    return base
  }, [catalog, query, value, selectedLabel])

  const handleSelect = (next: string | null) => {
    onChange(next)
    setQuery("")
    setOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      if (filtered[0]) {
        handleSelect(filtered[0].value)
        return
      }
      if (allowCustom && query.trim()) {
        handleSelect(query.trim())
      }
    }
    if (event.key === "Escape") {
      setOpen(false)
    }
  }

  const displayValue = open ? query : selectedLabel
  const showList = open && (filtered.length > 0 || (allowCustom && query.trim()))

  const list = showList ? (
    <ul
      role="listbox"
      style={listStyle}
      className="overflow-y-auto rounded-md border border-border bg-popover p-1 text-base shadow-md"
    >
      <li>
        <button
          type="button"
          role="option"
          className="flex w-full rounded-sm px-2 py-2 text-left text-muted-foreground hover:bg-muted"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleSelect(null)}
        >
          {emptyOptionLabel}
        </button>
      </li>
      {filtered.slice(0, 120).map((opt) => (
        <li key={opt.value}>
          <button
            type="button"
            role="option"
            aria-selected={opt.value === value}
            className={cn(
              "flex w-full rounded-sm px-2 py-2 text-left hover:bg-muted",
              opt.value === value && "bg-primary/10 font-medium"
            )}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleSelect(opt.value)}
          >
            {opt.label}
          </button>
        </li>
      ))}
      {allowCustom &&
      query.trim() &&
      !catalog.some(
        (opt) =>
          opt.value.toLowerCase() === query.trim().toLowerCase() ||
          opt.label.toLowerCase() === query.trim().toLowerCase()
      ) ? (
        <li>
          <button
            type="button"
            className="flex w-full rounded-sm px-2 py-2 text-left hover:bg-muted"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleSelect(query.trim())}
          >
            Utiliser « {query.trim()} »
          </button>
        </li>
      ) : null}
    </ul>
  ) : null

  return (
    <div ref={anchorRef} className={cn("relative", className)}>
      <Input
        id={id}
        value={displayValue}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          setQuery("")
          setOpen(true)
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
        }}
        onKeyDown={handleKeyDown}
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
