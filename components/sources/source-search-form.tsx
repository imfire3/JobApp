"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SearchCriteria } from "@/types";
import { EXPERIENCE_LEVELS, IMPORTABLE_JOB_FIELDS, REMOTE_PREFERENCES } from "@/types";
import { normalizeCriteria } from "@/lib/sources/utils";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

function MultiValueInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  function addValue(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (values.includes(value)) return;
    onChange([...values, value]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      {label ? (
        <Label htmlFor={inputId}>{label}</Label>
      ) : null}
      <Input
        id={inputId}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addValue(draft);
          }
        }}
        onBlur={() => addValue(draft)}
      />
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value} variant="tag" className="gap-1 pr-1">
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
              aria-label={`Retirer ${value}`}
              className="inline-flex h-6 w-6 -my-1 -mr-1 items-center justify-center rounded-full hover:bg-background/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

interface Props {
  initialName?: string;
  initialEnabled?: boolean;
  initialCriteria?: Partial<SearchCriteria>;
  submitLabel?: string;
  onSubmit: (payload: {
    name: string;
    enabled: boolean;
    criteria: SearchCriteria;
  }) => Promise<void>;
  onCancel?: () => void;
}

export function SourceSearchForm({
  initialName = "",
  initialEnabled = true,
  initialCriteria,
  submitLabel = "Save search",
  onSubmit,
  onCancel,
}: Props) {
  const initial = useMemo(() => normalizeCriteria(initialCriteria), [initialCriteria]);
  const [name, setName] = useState(initialName);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [criteria, setCriteria] = useState<SearchCriteria>(initial);
  const [submitting, setSubmitting] = useState(false);
  const importFields = (criteria.source_specific?.import_fields as string[] | undefined) ?? [
    ...IMPORTABLE_JOB_FIELDS,
  ];

  function toggleImportField(field: string, checked: boolean) {
    const nextFields = checked
      ? Array.from(new Set([...importFields, field]))
      : importFields.filter((value) => value !== field);
    setCriteria({
      ...criteria,
      source_specific: {
        ...(criteria.source_specific ?? {}),
        import_fields: nextFields,
      },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ name, enabled, criteria });
    setSubmitting(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="source-search-name">Search name</Label>
          <Input
            id="source-search-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product Owner Paris"
            required
          />
        </div>

        <MultiValueInput
          label="Experience level"
          values={criteria.experience_levels}
          onChange={(next) =>
            setCriteria({
              ...criteria,
              experience_levels: next.filter((v) =>
                EXPERIENCE_LEVELS.includes(v as (typeof EXPERIENCE_LEVELS)[number])
              ) as SearchCriteria["experience_levels"],
            })
          }
          placeholder="junior, mid, senior..."
        />

        <MultiValueInput
          label="Job titles"
          values={criteria.job_titles}
          onChange={(next) => setCriteria({ ...criteria, job_titles: next })}
          placeholder="Product Manager"
        />

        <div className="space-y-2">
          <Label htmlFor="source-search-location">Location</Label>
          <Input
            id="source-search-location"
            value={criteria.location}
            onChange={(e) => setCriteria({ ...criteria, location: e.target.value })}
            placeholder="Paris"
          />
        </div>

        <div className="space-y-2">
          <Label id="source-search-remote-label">Remote preference</Label>
          <Select
            value={criteria.remote_preference}
            onValueChange={(value) =>
              setCriteria({
                ...criteria,
                remote_preference: value as SearchCriteria["remote_preference"],
              })
            }
          >
            <SelectTrigger aria-labelledby="source-search-remote-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMOTE_PREFERENCES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <MultiValueInput
          label="Contract types"
          values={criteria.contract_types}
          onChange={(next) => setCriteria({ ...criteria, contract_types: next })}
          placeholder="CDI, CDD, Freelance..."
        />

        <div className="space-y-2">
          <Label htmlFor="source-search-min-salary">Minimum salary</Label>
          <Input
            id="source-search-min-salary"
            type="number"
            value={criteria.minimum_salary ?? ""}
            onChange={(e) =>
              setCriteria({
                ...criteria,
                minimum_salary: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="55000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="source-search-currency">Currency</Label>
          <Input
            id="source-search-currency"
            value={criteria.salary_currency}
            onChange={(e) => setCriteria({ ...criteria, salary_currency: e.target.value })}
            placeholder="EUR"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MultiValueInput
          label="Industries"
          values={criteria.industries}
          onChange={(next) => setCriteria({ ...criteria, industries: next })}
          placeholder="SaaS, Fintech..."
        />
        <MultiValueInput
          label="Excluded industries"
          values={criteria.excluded_industries}
          onChange={(next) => setCriteria({ ...criteria, excluded_industries: next })}
          placeholder="Crypto..."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MultiValueInput
          label="Keywords"
          values={criteria.keywords}
          onChange={(next) => setCriteria({ ...criteria, keywords: next })}
          placeholder="roadmap, agile..."
        />
        <MultiValueInput
          label="Excluded keywords"
          values={criteria.excluded_keywords}
          onChange={(next) => setCriteria({ ...criteria, excluded_keywords: next })}
          placeholder="sales..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="source-search-company-description">
          Company ideal description
        </Label>
        <Textarea
          id="source-search-company-description"
          value={criteria.company_preferences}
          onChange={(e) => setCriteria({ ...criteria, company_preferences: e.target.value })}
          rows={4}
          placeholder="What kind of company, team, and product environment is ideal?"
        />
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <Label
          id="import-fields-group-label"
          className="text-base font-medium"
        >
          Informations a importer vers la page Jobs
        </Label>
        <p className="text-base text-muted-foreground">
          Choisis les champs a recuperer pour cette recherche (cards/table Jobs).
        </p>
        <div
          role="group"
          aria-labelledby="import-fields-group-label"
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          {IMPORTABLE_JOB_FIELDS.map((field) => (
            <div
              key={field}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-base"
            >
              <span id={`import-field-${field}-label`}>
                {field.replace(/_/g, " ")}
              </span>
              <Switch
                checked={importFields.includes(field)}
                aria-labelledby={`import-field-${field}-label`}
                onCheckedChange={(checked) => toggleImportField(field, checked)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={criteria.similar_jobs}
            aria-labelledby="source-search-similar-jobs-label"
            onCheckedChange={(checked) => setCriteria({ ...criteria, similar_jobs: checked })}
          />
          <Label id="source-search-similar-jobs-label">Similar jobs</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={criteria.only_jobs_with_salary}
            aria-labelledby="source-search-salary-required-label"
            onCheckedChange={(checked) =>
              setCriteria({ ...criteria, only_jobs_with_salary: checked })
            }
          />
          <Label id="source-search-salary-required-label">
            Only jobs with salary
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={enabled}
            aria-labelledby="source-search-enabled-label"
            onCheckedChange={setEnabled}
          />
          <Label id="source-search-enabled-label">Enabled</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
