"use client";

import { useMemo, useState } from "react";
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

  function addValue(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (values.includes(value)) return;
    onChange([...values, value]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
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
          <Badge key={value} variant="secondary" className="gap-1 pr-1">
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-background/50"
            >
              <X className="h-3 w-3" />
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
          <Label>Search name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product Owner Paris"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Experience level</Label>
          <MultiValueInput
            label=""
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
        </div>

        <MultiValueInput
          label="Job titles"
          values={criteria.job_titles}
          onChange={(next) => setCriteria({ ...criteria, job_titles: next })}
          placeholder="Product Manager"
        />

        <div className="space-y-2">
          <Label>Location</Label>
          <Input
            value={criteria.location}
            onChange={(e) => setCriteria({ ...criteria, location: e.target.value })}
            placeholder="Paris"
          />
        </div>

        <div className="space-y-2">
          <Label>Remote preference</Label>
          <Select
            value={criteria.remote_preference}
            onValueChange={(value) =>
              setCriteria({
                ...criteria,
                remote_preference: value as SearchCriteria["remote_preference"],
              })
            }
          >
            <SelectTrigger>
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
          <Label>Minimum salary</Label>
          <Input
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
          <Label>Currency</Label>
          <Input
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
        <Label>Company ideal description</Label>
        <Textarea
          value={criteria.company_preferences}
          onChange={(e) => setCriteria({ ...criteria, company_preferences: e.target.value })}
          rows={4}
          placeholder="What kind of company, team, and product environment is ideal?"
        />
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <Label className="text-sm font-medium">Informations a importer vers la page Jobs</Label>
        <p className="text-xs text-muted-foreground">
          Choisis les champs a recuperer pour cette recherche (cards/table Jobs).
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {IMPORTABLE_JOB_FIELDS.map((field) => (
            <label
              key={field}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span>{field.replace(/_/g, " ")}</span>
              <Switch
                checked={importFields.includes(field)}
                onCheckedChange={(checked) => toggleImportField(field, checked)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={criteria.similar_jobs}
            onCheckedChange={(checked) => setCriteria({ ...criteria, similar_jobs: checked })}
          />
          <Label>Similar jobs</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={criteria.only_jobs_with_salary}
            onCheckedChange={(checked) =>
              setCriteria({ ...criteria, only_jobs_with_salary: checked })
            }
          />
          <Label>Only jobs with salary</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label>Enabled</Label>
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
