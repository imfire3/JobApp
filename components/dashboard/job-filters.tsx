"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { useAnchoredDropdownStyle } from "@/components/ui/use-anchored-dropdown-style";
import { cn } from "@/lib/utils";
import { JOB_STATUSES, type JobFilters } from "@/types";

interface JobFiltersBarProps {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
  sources: string[];
}

export function JobFilterMenu({
  filters,
  onChange,
}: {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuStyle = useAnchoredDropdownStyle(open, anchorRef, 320, {
    alwaysBelow: true,
    gap: 8,
    minWidth: 240,
  });

  const selected = (filters.remote === true ? 1 : 0) +
    (filters.hybrid === true ? 1 : 0) +
    (filters.postedWithinHours === 24 ? 1 : 0);

  const setOption = (name: "remote" | "hybrid" | "postedWithinHours", active: boolean) => {
    onChange({
      ...filters,
      ...(name === "postedWithinHours"
        ? { postedWithinHours: active ? 24 : undefined }
        : { [name]: active ? true : undefined }),
    });
  };

  const clearAll = () => {
    onChange({
      ...filters,
      remote: undefined,
      hybrid: undefined,
      postedWithinHours: undefined,
    });
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (anchorRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const option = (label: string, checked: boolean, name: "remote" | "hybrid" | "postedWithinHours") => (
    <button
      type="button"
      onClick={() => setOption(name, !checked)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base hover:bg-muted",
        checked && "font-medium"
      )}
    >
      <span className="flex size-4 items-center justify-center rounded border border-input">
        {checked ? <CheckIcon className="size-3.5" /> : null}
      </span>
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      <Label className="mb-0 shrink-0">Filtre</Label>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "relative flex h-12 w-fit items-center justify-between gap-2 rounded-lg border border-input bg-transparent py-3 pr-10 pl-4 text-base leading-6 whitespace-nowrap transition-colors outline-none select-none hover:bg-accent/40 dark:bg-input/30 dark:hover:bg-input/50",
          open && "bg-accent/40"
        )}
      >
        <span>
          {selected === 0 ? "Tous" : `${selected} actif${selected > 1 ? "s" : ""}`}
        </span>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2" />
      </button>
      {typeof document !== "undefined" && open
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle ?? undefined}
              className="rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              {option("Remote", filters.remote === true, "remote")}
              {option("Hybride", filters.hybrid === true, "hybrid")}
              {option(
                "24 h seulement",
                filters.postedWithinHours === 24,
                "postedWithinHours"
              )}
              <div className="mt-1 border-t border-border pt-1">
                <button
                  type="button"
                  onClick={clearAll}
                  className="w-full rounded-md px-3 py-2 text-left text-base text-muted-foreground hover:bg-muted"
                >
                  Tout effacer
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

const DATE_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "Toutes les dates" },
  { value: "1", label: "Dernières 24 h" },
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
];

export function JobDateFilter({
  filters,
  onChange,
}: {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuStyle = useAnchoredDropdownStyle(open, anchorRef, 320, {
    alwaysBelow: true,
    gap: 8,
    minWidth: 200,
  });

  const selectedValue = filters.postedWithinDays?.toString() ?? "0";
  const selectedLabel =
    DATE_OPTIONS.find((opt) => opt.value === selectedValue)?.label ?? "";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (anchorRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const select = (value: string) => {
    onChange({
      ...filters,
      postedWithinDays: !value || value === "0" ? undefined : Number(value),
    });
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="posted-within-days" className="mb-0 shrink-0">
        Date
      </Label>
      <button
        ref={anchorRef}
        id="posted-within-days"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "relative flex h-12 w-[9.5rem] items-center justify-between gap-2 rounded-lg border border-input bg-transparent py-3 pr-10 pl-4 text-base leading-6 whitespace-nowrap transition-colors outline-none select-none hover:bg-accent/40 dark:bg-input/30 dark:hover:bg-input/50",
          open && "bg-accent/40"
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2" />
      </button>
      {typeof document !== "undefined" && open
        ? createPortal(
            <div
              role="listbox"
              ref={menuRef}
              style={menuStyle ?? undefined}
              className="rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={opt.value === selectedValue}
                  onClick={() => select(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-base hover:bg-muted",
                    opt.value === selectedValue && "font-medium"
                  )}
                >
                  {opt.label}
                  {opt.value === selectedValue ? (
                    <CheckIcon className="size-4" />
                  ) : null}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function FilterSelect({
  id,
  value,
  placeholder,
  options,
  onChange,
}: {
  id?: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuStyle = useAnchoredDropdownStyle(open, anchorRef, 320, {
    alwaysBelow: true,
    gap: 8,
    minWidth: 200,
  });

  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? "";
  const display = selectedLabel || placeholder;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (anchorRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "relative flex h-12 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent py-3 pr-10 pl-4 text-base leading-6 whitespace-nowrap transition-colors outline-none select-none hover:bg-accent/40 dark:bg-input/30 dark:hover:bg-input/50",
          !selectedLabel && "text-muted-foreground",
          open && "bg-accent/40"
        )}
      >
        <span className="truncate">{display}</span>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2" />
      </button>
      {typeof document !== "undefined" && open
        ? createPortal(
            <div
              role="listbox"
              ref={menuRef}
              style={menuStyle}
              className="rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-base hover:bg-muted",
                    opt.value === value && "font-medium"
                  )}
                >
                  {opt.label}
                  {opt.value === value ? <CheckIcon className="size-4" /> : null}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export function JobFiltersBar({ filters, onChange, sources }: JobFiltersBarProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-x-4 gap-y-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Field className="xl:col-span-2">
            <Label htmlFor="search" className="mb-0">
              Search
            </Label>
            <Input
              id="search"
              placeholder="Title, company..."
              value={filters.search ?? ""}
              onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
            />
          </Field>

          <Field>
            <Label className="mb-0">Source</Label>
            <FilterSelect
              id="filter-source"
              value={filters.source ?? "all"}
              placeholder="All sources"
              options={[
                { value: "all", label: "All sources" },
                ...sources.map((s) => ({ value: s, label: s })),
              ]}
              onChange={(v) =>
                onChange({ ...filters, source: !v || v === "all" ? undefined : v })
              }
            />
          </Field>

          <Field>
            <Label className="mb-0">Location</Label>
            <Input
              placeholder="Paris..."
              value={filters.location ?? ""}
              onChange={(e) =>
                onChange({ ...filters, location: e.target.value || undefined })
              }
            />
          </Field>

          <Field>
            <Label className="mb-0">Status</Label>
            <FilterSelect
              id="filter-status"
              value={filters.status ?? "all"}
              placeholder="All statuses"
              options={[
                { value: "all", label: "All statuses" },
                ...JOB_STATUSES.map((s) => ({
                  value: s,
                  label: s.replace(/_/g, " "),
                })),
              ]}
              onChange={(v) =>
                onChange({
                  ...filters,
                  status: !v || v === "all" ? undefined : (v as JobFilters["status"]),
                })
              }
            />
          </Field>

          <Field>
            <Label className="mb-0">Contract</Label>
            <Input
              placeholder="CDI, CDD..."
              value={filters.contractType ?? ""}
              onChange={(e) => onChange({ ...filters, contractType: e.target.value || undefined })}
            />
          </Field>

          <Field>
            <Label className="mb-0">Min salary</Label>
            <Input
              type="number"
              placeholder="55000"
              value={filters.minSalary ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minSalary: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </Field>

          <Field>
            <Label className="mb-0">Min. match score</Label>
            <FilterSelect
              id="filter-min-match-score"
              value={filters.minMatchScore?.toString() ?? "0"}
              placeholder="Any"
              options={[
                { value: "0", label: "Any" },
                { value: "50", label: "50%+" },
                { value: "70", label: "70%+" },
                { value: "80", label: "80%+" },
              ]}
              onChange={(v) =>
                onChange({
                  ...filters,
                  minMatchScore: !v || v === "0" ? undefined : Number(v),
                })
              }
            />
          </Field>
        </div>
      </div>
  );
}
