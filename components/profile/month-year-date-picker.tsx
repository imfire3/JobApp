"use client"

import { useRef } from "react"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type MonthYearDatePickerProps = {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  label: string
  min?: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}

export function MonthYearDatePicker({
  id,
  value,
  onChange,
  onBlur,
  label,
  min,
  disabled,
  invalid,
  describedBy,
}: MonthYearDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const openPicker = () => {
    const input = inputRef.current
    if (!input || disabled) return
    if (typeof input.showPicker === "function") input.showPicker()
    else input.focus()
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Input
        ref={inputRef}
        id={id}
        type="month"
        value={value}
        min={min}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        variant="control"
        className="min-w-0 flex-1 scheme-dark [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-12 [&::-webkit-calendar-picker-indicator]:opacity-0"
      />
      <Button
        type="button"
        variant="outline"
        size="icon-control"
        disabled={disabled}
        aria-label={`Choisir ${label.toLowerCase()}`}
        onClick={openPicker}
        className="shrink-0 text-app-text-subtle"
      >
        <CalendarDays className="size-5" aria-hidden />
      </Button>
    </div>
  )
}
