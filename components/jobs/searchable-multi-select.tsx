"use client"

import { useMemo, useState } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
 */
export function SearchableMultiSelect({
  id,
  options,
  values,
  onChange,
  placeholder = "Rechercher…",
  allowCustom = true,
  className,
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
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

  const handleRemove = (value: string) => {
    onChange(values.filter((item) => item !== value))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      if (filtered[0]) {
        handleAdd(filtered[0].value)
        return
      }
      if (allowCustom && query.trim()) {
        handleAdd(query)
      }
    }
    if (event.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1">
              {labelFor(catalog, value)}
              <button
                type="button"
                aria-label={`Retirer ${labelFor(catalog, value)}`}
                onClick={() => handleRemove(value)}
                className="rounded-sm hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="relative">
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
            // Delay so option click registers
            window.setTimeout(() => setOpen(false), 150)
          }}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {open && (filtered.length > 0 || (allowCustom && query.trim())) ? (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md"
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
        ) : null}
      </div>
    </div>
  )
}
