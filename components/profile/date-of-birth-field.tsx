"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAnchoredDropdownStyle } from "@/components/ui/use-anchored-dropdown-style"
import { cn } from "@/lib/utils"
import {
  formatDisplayDate,
  parseDisplayDateToIso,
} from "@/lib/profile/helpers"

type DateOfBirthFieldProps = {
  id?: string
  value: string | null
  onChange: (isoDate: string | null) => void
  className?: string
  disabled?: boolean
}

function isPlausibleBirthIso(iso: string | null): boolean {
  if (!iso) return true
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false
  }
  const now = new Date()
  const age =
    now.getFullYear() -
    year -
    (now.getMonth() + 1 < month ||
    (now.getMonth() + 1 === month && now.getDate() < day)
      ? 1
      : 0)
  return age >= 14 && age <= 100
}

export function DateOfBirthField({
  id,
  value,
  onChange,
  className,
  disabled,
}: DateOfBirthFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const dayRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const calendarStyle = useAnchoredDropdownStyle(open, anchorRef, 360)
  const display = formatDisplayDate(value)
  const [day, setDay] = useState(display.slice(0, 2) || "")
  const [month, setMonth] = useState(display.slice(3, 5) || "")
  const [year, setYear] = useState(display.slice(6, 10) || "")
  const [cursorMonth, setCursorMonth] = useState(() => {
    if (value) {
      const parsed = parse(value, "yyyy-MM-dd", new Date())
      if (isValid(parsed)) return startOfMonth(parsed)
    }
    return startOfMonth(new Date(1995, 0, 1))
  })

  useEffect(() => {
    const next = formatDisplayDate(value)
    setDay(next.slice(0, 2) || "")
    setMonth(next.slice(3, 5) || "")
    setYear(next.slice(6, 10) || "")
    if (value) {
      const parsed = parse(value, "yyyy-MM-dd", new Date())
      if (isValid(parsed)) setCursorMonth(startOfMonth(parsed))
    }
  }, [value])

  const commitSegments = (d: string, m: string, y: string) => {
    if (!d && !m && !y) {
      setError(null)
      onChange(null)
      return
    }
    if (d.length < 2 || m.length < 2 || y.length < 4) {
      setError(null)
      return
    }
    const iso = parseDisplayDateToIso(`${d}/${m}/${y}`)
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso) || !isPlausibleBirthIso(iso)) {
      setError("Date invalide (JJ/MM/AAAA)")
      return
    }
    setError(null)
    onChange(iso)
  }

  const handleDayChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 2)
    setDay(digits)
    if (digits.length === 2) monthRef.current?.focus()
    commitSegments(digits, month, year)
  }

  const handleMonthChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 2)
    setMonth(digits)
    if (digits.length === 2) yearRef.current?.focus()
    commitSegments(day, digits, year)
  }

  const handleYearChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4)
    setYear(digits)
    commitSegments(day, month, digits)
  }

  const selectedDate =
    value && isValid(parse(value, "yyyy-MM-dd", new Date()))
      ? parse(value, "yyyy-MM-dd", new Date())
      : null

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursorMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursorMonth), { weekStartsOn: 1 }),
  })

  return (
    <div className={cn("relative space-y-2", className)}>
      <div ref={anchorRef} className="flex items-center gap-1.5">
        <Input
          ref={dayRef}
          id={fieldId}
          inputMode="numeric"
          autoComplete="bday-day"
          placeholder="JJ"
          aria-label="Jour de naissance"
          disabled={disabled}
          value={day}
          onChange={(e) => handleDayChange(e.target.value)}
          className="w-14 text-center tabular-nums"
          maxLength={2}
        />
        <span className="text-muted-foreground" aria-hidden>
          /
        </span>
        <Input
          ref={monthRef}
          inputMode="numeric"
          autoComplete="bday-month"
          placeholder="MM"
          aria-label="Mois de naissance"
          disabled={disabled}
          value={month}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="w-14 text-center tabular-nums"
          maxLength={2}
        />
        <span className="text-muted-foreground" aria-hidden>
          /
        </span>
        <Input
          ref={yearRef}
          inputMode="numeric"
          autoComplete="bday-year"
          placeholder="AAAA"
          aria-label="Année de naissance"
          disabled={disabled}
          value={year}
          onChange={(e) => handleYearChange(e.target.value)}
          className="w-20 text-center tabular-nums"
          maxLength={4}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label="Ouvrir le calendrier"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="shrink-0"
        >
          <CalendarDays className="h-4 w-4" />
        </Button>
      </div>
      {error ? (
        <p className="text-base text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              style={{ ...calendarStyle, width: 288, maxHeight: undefined }}
              className="rounded-xl border border-border bg-popover p-3 shadow-lg"
              role="dialog"
              aria-label="Calendrier date de naissance"
            >
              <div className="mb-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Mois précédent"
                  onClick={() => setCursorMonth((m) => addMonths(m, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="text-base font-medium capitalize">
                  {format(cursorMonth, "MMMM yyyy", { locale: fr })}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Mois suivant"
                  onClick={() => setCursorMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
                  <span key={`${label}-${index}`}>{label}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((dayItem) => {
                  const inMonth = isSameMonth(dayItem, cursorMonth)
                  const selected = selectedDate
                    ? isSameDay(dayItem, selectedDate)
                    : false
                  return (
                    <button
                      key={dayItem.toISOString()}
                      type="button"
                      disabled={!inMonth}
                      className={cn(
                        "h-8 rounded-md text-base tabular-nums transition-colors",
                        inMonth
                          ? "text-foreground hover:bg-muted"
                          : "text-muted-foreground/40",
                        selected &&
                          "bg-primary text-primary-foreground hover:bg-primary"
                      )}
                      onClick={() => {
                        const iso = format(dayItem, "yyyy-MM-dd")
                        if (!isPlausibleBirthIso(iso)) {
                          setError("Âge hors plage plausible")
                          return
                        }
                        setError(null)
                        onChange(iso)
                        setOpen(false)
                      }}
                    >
                      {format(dayItem, "d")}
                    </button>
                  )
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
