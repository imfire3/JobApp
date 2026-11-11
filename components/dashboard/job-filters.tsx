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
import { jobStatusLabel } from "@/lib/jobs/status-labels";

interface JobFiltersBarProps {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
  sources: string[];
  contracts?: string[];
}

/** Figma "Forms/*" styling shared by the Offres filters. */
const filterLabelClassName =
  "mb-0 shrink-0 text-base font-medium leading-6 text-app-text-label";

const filterSelectTriggerClassName =
  "relative flex h-(--app-control-height) w-full items-center justify-between gap-2 rounded-app-control border-(length:--app-stroke) border-app-border-strong bg-app-control px-3 py-3 text-base leading-6 text-app-text outline-none transition-colors select-none hover:border-app-text-muted focus-visible:border-app-text-secondary focus-visible:ring-2 focus-visible:ring-app-text-secondary/40";

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
      <Label id="job-filter-menu-label" className={filterLabelClassName}>
        Filtres
      </Label>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-labelledby="job-filter-menu-label job-filter-menu-value"
        className={cn(
          filterSelectTriggerClassName,
          "w-fit whitespace-nowrap pr-10",
          open && "border-app-text-secondary"
        )}
      >
        <span id="job-filter-menu-value">
          {selected === 0 ? "Tous" : `${selected} actif${selected > 1 ? "s" : ""}`}
        </span>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
      </button>
      {typeof document !== "undefined" && open
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle ?? undefined}
              className="rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              {option("Télétravail total", filters.remote === true, "remote")}
              {option("Hybride", filters.hybrid === true, "hybrid")}
              {option(
                "Publiées depuis 24 h",
                filters.postedWithinHours === 24,
                "postedWithinHours"
              )}
              <div className="mt-1 border-t border-border pt-1">
                <button
                  type="button"
                  onClick={clearAll}
                  className="w-full rounded-md px-3 py-2 text-left text-base text-muted-foreground hover:bg-muted"
                >
                  Réinitialiser ces filtres
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
      <Label id="job-date-filter-label" className={filterLabelClassName}>
        Date de publication
      </Label>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="job-date-filter-label job-date-filter-value"
        className={cn(
          filterSelectTriggerClassName,
          "w-[9.5rem] whitespace-nowrap pr-10",
          open && "border-app-text-secondary"
        )}
      >
        <span id="job-date-filter-value" className="truncate">
          {selectedLabel}
        </span>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
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
  labelledById,
  value,
  placeholder,
  options,
  onChange,
}: {
  id?: string;
  labelledById?: string;
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
        aria-labelledby={
          labelledById && id ? `${labelledById} ${id}-value` : undefined
        }
        className={cn(
          filterSelectTriggerClassName,
          "pr-10",
          (!selectedLabel || value === "all" || value === "0") && "text-app-text-muted",
          open && "border-app-text-secondary"
        )}
      >
        <span id={id ? `${id}-value` : undefined} className="truncate">
          {display}
        </span>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
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

export function JobFiltersBar({ filters, onChange, sources, contracts = [] }: JobFiltersBarProps) {
  const [showMore, setShowMore] = useState(false)

  const activeFilters: { key: string; label: string; clear: () => void }[] = []
  if (filters.search) {
    activeFilters.push({
      key: "search",
      label: `« ${filters.search} »`,
      clear: () => onChange({ ...filters, search: undefined }),
    })
  }
  if (filters.location) {
    activeFilters.push({
      key: "location",
      label: filters.location,
      clear: () => onChange({ ...filters, location: undefined }),
    })
  }
  if (filters.status) {
    activeFilters.push({
      key: "status",
      label: jobStatusLabel(filters.status),
      clear: () => onChange({ ...filters, status: undefined }),
    })
  }
  if (filters.source) {
    activeFilters.push({
      key: "source",
      label: filters.source,
      clear: () => onChange({ ...filters, source: undefined }),
    })
  }
  if (filters.contractType) {
    activeFilters.push({
      key: "contract",
      label: filters.contractType,
      clear: () => onChange({ ...filters, contractType: undefined }),
    })
  }
  if (filters.minSalary !== undefined) {
    activeFilters.push({
      key: "salary",
      label: `≥ ${filters.minSalary.toLocaleString("fr-FR")} €`,
      clear: () => onChange({ ...filters, minSalary: undefined }),
    })
  }
  if (filters.minMatchScore !== undefined) {
    activeFilters.push({
      key: "score",
      label: `Correspondance ≥ ${filters.minMatchScore}`,
      clear: () => onChange({ ...filters, minMatchScore: undefined }),
    })
  }
  if (filters.remote) {
    activeFilters.push({
      key: "remote",
      label: "Télétravail total",
      clear: () => onChange({ ...filters, remote: undefined }),
    })
  }
  if (filters.hybrid) {
    activeFilters.push({
      key: "hybrid",
      label: "Hybride",
      clear: () => onChange({ ...filters, hybrid: undefined }),
    })
  }
  if (filters.postedWithinHours === 24) {
    activeFilters.push({
      key: "hours",
      label: "Publiées depuis 24 h",
      clear: () => onChange({ ...filters, postedWithinHours: undefined }),
    })
  }
  if (filters.postedWithinDays !== undefined) {
    activeFilters.push({
      key: "days",
      label: `${filters.postedWithinDays} derniers jours`,
      clear: () => onChange({ ...filters, postedWithinDays: undefined }),
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold leading-7 text-app-text">
          Filtrer les offres
        </h2>
        <p className="text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-subtle">
          Retrouve les offres qui correspondent à tes critères.
        </p>
      </div>

      <div className="grid gap-4 rounded-app-control border border-app-border-strong bg-app-surface p-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field>
          <Label htmlFor="search" className={filterLabelClassName}>
            Poste ou entreprise
          </Label>
          <Input
            id="search"
            variant="control"
            placeholder="Product Owner, entreprise…"
            value={filters.search ?? ""}
            onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          />
        </Field>

        <Field>
          <Label htmlFor="filter-location" className={filterLabelClassName}>
            Lieu
          </Label>
          <Input
            id="filter-location"
            variant="control"
            placeholder="Marseille, Aix-en-Provence…"
            value={filters.location ?? ""}
            onChange={(e) =>
              onChange({ ...filters, location: e.target.value || undefined })
            }
          />
        </Field>

        <Field>
          <Label id="filter-status-label" className={filterLabelClassName}>
            Statut
          </Label>
          <FilterSelect
            id="filter-status"
            labelledById="filter-status-label"
            value={filters.status ?? "all"}
            placeholder="Tous les statuts"
            options={[
              { value: "all", label: "Tous les statuts" },
              ...JOB_STATUSES.map((s) => ({
                value: s,
                label: jobStatusLabel(s),
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMore((value) => !value)}
            aria-expanded={showMore}
            aria-controls="job-secondary-filters"
            className={cn(
              filterSelectTriggerClassName,
              "w-fit gap-2 whitespace-nowrap px-4 pr-4",
              showMore && "border-app-text-secondary"
            )}
          >
            Plus de filtres
            {activeFilters.length > 0 && !showMore ? (
              <span className="flex min-w-6 items-center justify-center rounded-full bg-app-action px-1.5 text-sm text-app-text-inverse">
                {activeFilters.length}
              </span>
            ) : null}
            <ChevronDownIcon
              className={cn("size-4 transition-transform", showMore && "rotate-180")}
              aria-hidden
            />
          </button>
          {activeFilters.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange({})}
              className="rounded-[6px] px-2 py-1 text-sm font-medium text-app-text-secondary underline underline-offset-4 hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary"
            >
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>
        {activeFilters.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Filtres actifs">
            {activeFilters.map((filter) => (
              <li key={filter.key}>
                <button
                  type="button"
                  onClick={filter.clear}
                  className="inline-flex h-8 items-center gap-1 rounded-app-badge bg-app-control px-2 text-sm font-medium leading-5 text-app-text-strong hover:bg-app-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary"
                  aria-label={`Retirer le filtre ${filter.label}`}
                >
                  {filter.label}
                  <span aria-hidden>×</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {showMore ? (
        <div
          id="job-secondary-filters"
          className="grid gap-4 rounded-app-control border border-app-border-strong bg-app-surface p-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <Field>
            <Label id="filter-source-label" className={filterLabelClassName}>
              Source
            </Label>
            <FilterSelect
              id="filter-source"
              labelledById="filter-source-label"
              value={filters.source ?? "all"}
              placeholder="Toutes les sources"
              options={[
                { value: "all", label: "Toutes les sources" },
                ...sources.map((s) => ({ value: s, label: s })),
              ]}
              onChange={(v) =>
                onChange({ ...filters, source: !v || v === "all" ? undefined : v })
              }
            />
          </Field>

          <Field>
            <Label id="filter-contract-label" className={filterLabelClassName}>
              Type de contrat
            </Label>
            <FilterSelect
              id="filter-contract"
              labelledById="filter-contract-label"
              placeholder="Tous les contrats"
              value={filters.contractType ?? "all"}
              options={[
                { value: "all", label: "Tous les contrats" },
                ...contracts.map((value) => ({ value, label: value })),
              ]}
              onChange={(value) => onChange({ ...filters, contractType: value === "all" ? undefined : value })}
            />
          </Field>

          <Field>
            <Label htmlFor="filter-min-salary" className={filterLabelClassName}>
              Salaire minimum (€ brut/an)
            </Label>
            <Input
              id="filter-min-salary"
              variant="control"
              type="number"
              placeholder="40 000"
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
            <Label id="filter-min-match-score-label" className={filterLabelClassName}>
              Correspondance minimum
            </Label>
            <FilterSelect
              id="filter-min-match-score"
              labelledById="filter-min-match-score-label"
              value={filters.minMatchScore?.toString() ?? "0"}
              placeholder="Tous les scores"
              options={[
                { value: "0", label: "Tous les scores" },
                { value: "50", label: "50 / 100 et plus" },
                { value: "70", label: "70 / 100 et plus" },
                { value: "80", label: "80 / 100 et plus" },
              ]}
              onChange={(v) =>
                onChange({
                  ...filters,
                  minMatchScore: !v || v === "0" ? undefined : Number(v),
                })
              }
            />
          </Field>

          <div className="sm:col-span-2 xl:col-span-1">
            <JobDateFilter filters={filters} onChange={onChange} />
          </div>

          <div className="sm:col-span-2 xl:col-span-2">
            <JobFilterMenu filters={filters} onChange={onChange} />
          </div>
        </div>
      ) : null}
    </section>
  )
}
