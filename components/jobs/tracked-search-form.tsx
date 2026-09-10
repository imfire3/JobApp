"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableMultiSelect } from "@/components/jobs/searchable-multi-select"
import { nativeSelectClassName, nativeSelectChevronStyle } from "@/components/ui/native-select"
import {
  SEARCH_CONTRACT_TYPES,
  SEARCH_EXPERTISES,
  SEARCH_LANGUAGES,
  SEARCH_LOCATIONS_FR,
  SEARCH_PUBLISH_WINDOW,
  SEARCH_REMOTE_OPTIONS,
  SEARCH_SALARY_PERIODS,
  SEARCH_START_DATE,
} from "@/lib/jobs/search-filter-catalogs"

export type TrackedSearchFormValues = {
  name: string
  enabled: boolean
  job_titles: string[]
  keywords: string[]
  excluded_keywords: string[]
  locations: string[]
  remote_preference: string
  hybrid: boolean
  on_site: boolean
  experience: string[]
  contract_types: string[]
  minimum_salary: number | null
  maximum_salary: number | null
  salary_period: "year" | "day" | string
  currency: string
  industries: string[]
  excluded_industries: string[]
  company_size: string | null
  company_culture: string | null
  company_names: string[]
  languages: string[]
  expertises: string[]
  only_with_salary: boolean
  exclusive_only: boolean
  top_recruiter_only: boolean
  start_date_preference: string | null
  publish_window: string | null
  ai_preferences: Record<string, unknown>
  minimum_match_score: number | null
}

export const emptyTrackedSearchForm = (): TrackedSearchFormValues => ({
  name: "",
  enabled: true,
  job_titles: [],
  keywords: [],
  excluded_keywords: [],
  locations: [],
  remote_preference: "any",
  hybrid: false,
  on_site: false,
  experience: [],
  contract_types: [],
  minimum_salary: null,
  maximum_salary: null,
  salary_period: "year",
  currency: "EUR",
  industries: [],
  excluded_industries: [],
  company_size: null,
  company_culture: null,
  company_names: [],
  languages: [],
  expertises: [],
  only_with_salary: false,
  exclusive_only: false,
  top_recruiter_only: false,
  start_date_preference: null,
  publish_window: null,
  ai_preferences: {},
  minimum_match_score: null,
})

type TrackedSearchFormProps = {
  value: TrackedSearchFormValues
  onChange: (next: TrackedSearchFormValues) => void
  onSubmit: () => void | Promise<void>
  submitLabel: string
  loading?: boolean
}

function parseCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

/**
 * WTTJ-style tracked search / alert form (FR labels + searchable catalogs).
 */
export function TrackedSearchForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  loading = false,
}: TrackedSearchFormProps) {
  const patch = (partial: Partial<TrackedSearchFormValues>) => {
    onChange({ ...value, ...partial })
  }

  const salaryUnit = value.salary_period === "day" ? "€ / jour" : "€ / an"

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        void onSubmit()
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="alert-name">Nom de l’alerte</Label>
        <Input
          id="alert-name"
          value={value.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Ex. Product Owner — Paris"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-titles">Intitulés de poste</Label>
        <SearchableMultiSelect
          id="alert-titles"
          options={[]}
          values={value.job_titles}
          onChange={(job_titles) => patch({ job_titles })}
          placeholder="Product Owner, Product Manager…"
          allowCustom
        />
        <p className="text-base text-muted-foreground">
          Tape un intitulé puis Entrée pour l’ajouter.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-locations">Localisations</Label>
        <SearchableMultiSelect
          id="alert-locations"
          options={SEARCH_LOCATIONS_FR}
          values={value.locations}
          onChange={(locations) => patch({ locations })}
          placeholder="Ajouter une localisation"
          allowCustom
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-languages">Proposer une langue</Label>
        <SearchableMultiSelect
          id="alert-languages"
          options={SEARCH_LANGUAGES}
          values={value.languages}
          onChange={(languages) => patch({ languages })}
          placeholder="Sélectionnez une langue"
          allowCustom={false}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-expertises">Expertises</Label>
        <SearchableMultiSelect
          id="alert-expertises"
          options={SEARCH_EXPERTISES}
          values={value.expertises}
          onChange={(expertises) => patch({ expertises })}
          placeholder="Entrez une expertise"
          allowCustom
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-contracts">Type de contrat</Label>
        <SearchableMultiSelect
          id="alert-contracts"
          options={SEARCH_CONTRACT_TYPES}
          values={value.contract_types}
          onChange={(contract_types) => patch({ contract_types })}
          placeholder="Tous types"
          allowCustom={false}
        />
      </div>

      <div className="space-y-3">
        <Label>Salaire / Taux journalier</Label>
        <select
          className={nativeSelectClassName}
          style={nativeSelectChevronStyle}
          value={value.salary_period}
          onChange={(e) =>
            patch({ salary_period: e.target.value === "day" ? "day" : "year" })
          }
          aria-label="Période de rémunération"
        >
          {SEARCH_SALARY_PERIODS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Input
            type="number"
            min={0}
            value={value.minimum_salary ?? ""}
            onChange={(e) =>
              patch({
                minimum_salary: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder={`Min ${salaryUnit}`}
            aria-label="Rémunération minimum"
          />
          <span className="text-base text-muted-foreground">à</span>
          <Input
            type="number"
            min={0}
            value={value.maximum_salary ?? ""}
            onChange={(e) =>
              patch({
                maximum_salary: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder={`Max ${salaryUnit}`}
            aria-label="Rémunération maximum"
          />
        </div>
        <label className="flex items-center gap-2 text-base">
          <Checkbox
            checked={value.only_with_salary}
            onCheckedChange={(checked) =>
              patch({ only_with_salary: checked === true })
            }
          />
          Uniquement avec un prix
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-remote">À distance</Label>
        <select
          id="alert-remote"
          className={nativeSelectClassName}
          style={nativeSelectChevronStyle}
          value={value.remote_preference}
          onChange={(e) => {
            const remote_preference = e.target.value
            patch({
              remote_preference,
              hybrid: remote_preference === "hybrid",
              on_site: remote_preference === "onsite",
            })
          }}
        >
          {SEARCH_REMOTE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-base">
          <Checkbox
            checked={value.remote_preference === "remote_only"}
            onCheckedChange={(checked) => {
              if (checked === true) {
                patch({
                  remote_preference: "remote_only",
                  hybrid: false,
                  on_site: false,
                })
              } else if (value.remote_preference === "remote_only") {
                patch({ remote_preference: "any" })
              }
            }}
          />
          Uniquement à distance
        </label>
      </div>

      <div className="space-y-3">
        <Label>Montrer les opportunités</Label>
        <label className="flex items-center gap-2 text-base">
          <Checkbox
            checked={value.exclusive_only}
            onCheckedChange={(checked) =>
              patch({ exclusive_only: checked === true })
            }
          />
          Uniquement exclusives
        </label>
        <label className="flex items-center gap-2 text-base">
          <Checkbox
            checked={value.top_recruiter_only}
            onCheckedChange={(checked) =>
              patch({ top_recruiter_only: checked === true })
            }
          />
          Uniquement Top Recruteur
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-start">Date de début</Label>
        <select
          id="alert-start"
          className={nativeSelectClassName}
          style={nativeSelectChevronStyle}
          value={value.start_date_preference ?? ""}
          onChange={(e) =>
            patch({ start_date_preference: e.target.value || null })
          }
        >
          <option value="">Sélectionnez un choix</option>
          {SEARCH_START_DATE.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-publish">Publié depuis</Label>
        <select
          id="alert-publish"
          className={nativeSelectClassName}
          style={nativeSelectChevronStyle}
          value={value.publish_window ?? ""}
          onChange={(e) => patch({ publish_window: e.target.value || null })}
        >
          <option value="">Tous</option>
          {SEARCH_PUBLISH_WINDOW.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-companies">Publié par (entreprise)</Label>
        <SearchableMultiSelect
          id="alert-companies"
          options={[]}
          values={value.company_names}
          onChange={(company_names) => patch({ company_names })}
          placeholder="Rechercher une entreprise…"
          allowCustom
        />
      </div>

      <details className="rounded-xl border border-border p-3">
        <summary className="cursor-pointer text-base font-medium">
          Options avancées
        </summary>
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="alert-keywords">Mots-clés</Label>
            <Input
              id="alert-keywords"
              value={value.keywords.join(", ")}
              onChange={(e) => patch({ keywords: parseCsv(e.target.value) })}
              placeholder="séparés par des virgules"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alert-excluded">Mots-clés exclus</Label>
            <Input
              id="alert-excluded"
              value={value.excluded_keywords.join(", ")}
              onChange={(e) =>
                patch({ excluded_keywords: parseCsv(e.target.value) })
              }
              placeholder="séparés par des virgules"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alert-match">Score IA minimum</Label>
            <Input
              id="alert-match"
              type="number"
              min={0}
              max={100}
              value={value.minimum_match_score ?? ""}
              onChange={(e) =>
                patch({
                  minimum_match_score: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
          </div>
          <label className="flex items-center gap-2 text-base">
            <Checkbox
              checked={value.enabled}
              onCheckedChange={(checked) =>
                patch({ enabled: checked === true })
              }
            />
            Alerte active
          </label>
        </div>
      </details>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={loading || value.name.trim().length < 2}>
          {loading ? "Enregistrement…" : submitLabel}
        </Button>
      </div>
    </form>
  )
}
