"use client"

import { useId, useRef, useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { X, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ChipInputProps = {
  id?: string
  label?: string
  options: readonly string[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  emptyLabel?: string
  className?: string
  disabled?: boolean
}

function toOptions(options: readonly string[]) {
  return options.map((value) => ({ value, label: value }))
}

export function ChipInput({
  id,
  label,
  options,
  values,
  onChange,
  placeholder = "Rechercher…",
  emptyLabel,
  className,
  disabled = false,
}: ChipInputProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const catalog = toOptions(options)

  const filtered = catalog
    .filter((opt) => opt.value.toLowerCase().includes(query.toLowerCase()))
    .filter((opt) => !values.includes(opt.value))

  const handleAdd = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setQuery("")
      return
    }
    onChange([...values, trimmed])
    setQuery("")
    setOpen(false)
  }, [values, onChange])

  const handleRemove = useCallback((value: string) => {
    onChange(values.filter((item) => item !== value))
  }, [values, onChange])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      if (filtered[0]) {
        handleAdd(filtered[0].value)
      }
    }
    if (event.key === "Escape") {
      setOpen(false)
      inputRef.current?.blur()
    }
    if (event.key === "Backspace" && !query && values.length > 0) {
      handleRemove(values[values.length - 1])
    }
  }

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [handleClickOutside])

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label htmlFor={fieldId} className="text-sm font-medium text-[#FAFAFA]">{label}</label>}
      <div ref={anchorRef} className="relative">
        <div className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-[#383838] bg-[#212121] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#A1A1A1] focus-within:border-[#00D492] transition-colors min-h-[44px]">
          {values.map((value) => {
            const labelText = catalog.find((opt) => opt.value === value)?.label ?? value
            return (
              <span key={value} className="inline-flex items-center gap-1 rounded-full bg-[#00D492]/20 px-2 py-0.5 text-xs font-medium text-[#00D492]">
                {labelText}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(value)
                  }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-[#00D492]/30"
                  aria-label={`Retirer ${labelText}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
          <Input
            ref={inputRef}
            id={fieldId}
            value={query}
            placeholder={values.length > 0 ? "" : placeholder}
            autoComplete="off"
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-[120px] bg-transparent border-none focus-visible:ring-0 placeholder:text-[#A1A1A1] text-sm py-0"
            aria-autocomplete="list"
            aria-expanded={open}
            style={{ width: values.length > 0 ? "auto" : "100%" }}
          />
          <ChevronDown className={cn("h-4 w-4 text-[#A1A1A1] shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
        </div>

        {open && filtered.length > 0 && typeof document !== "undefined" ? createPortal(
          <ul
            style={{
              position: "fixed",
              top: anchorRef.current?.getBoundingClientRect().bottom ?? 0,
              left: anchorRef.current?.getBoundingClientRect().left ?? 0,
              width: anchorRef.current?.getBoundingClientRect().width ?? 280,
              zIndex: 50,
            }}
            className="overflow-y-auto rounded-[10px] border border-[#383838] bg-[#212121] p-1 text-base shadow-lg max-h-64"
            role="listbox"
          >
            {filtered.slice(0, 20).map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full rounded-md px-3 py-2 text-left text-[#FAFAFA] hover:bg-[#171717]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAdd(opt.value)}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        ) : null}

        {values.length === 0 && emptyLabel && !open ? (
          <p className="text-sm text-[#A1A1A1]">{emptyLabel}</p>
        ) : null}
      </div>
    </div>
  )
}