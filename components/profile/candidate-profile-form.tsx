"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Briefcase,
  ChevronDown,
  FileUp,
  GraduationCap,
  Link2,
  Plus,
  Search,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  SearchableMultiSelect,
} from "@/components/jobs/searchable-multi-select"
import { CvExperiencesCard } from "@/components/settings/cv-experiences-card"
import { ExtractionProgress } from "@/components/onboarding/onboarding-progress"
import { DateOfBirthField } from "@/components/profile/date-of-birth-field"
import { EducationEntriesCard } from "@/components/profile/education-entries-card"
import { LanguageEntriesField } from "@/components/profile/language-entries-field"
import type { CvExperience } from "@/lib/cv/experiences"
import { FRANCE_CITIES } from "@/lib/onboarding/france-cities"
import { listAtsSkillOptions } from "@/lib/profile/match-ats-skills"
import {
  formatDisplayDate,
  parseDisplayDateToIso,
} from "@/lib/profile/helpers"
import {
  PROFILE_LOCATION_EXTRAS,
  PROFILE_ROLE_SUGGESTIONS,
} from "@/lib/profile/suggestion-catalogs"
import {
  CONTRACT_TYPE_OPTIONS,
  REMOTE_PREFERENCE_OPTIONS,
  type ProfileEducationEntry,
  type ProfileLanguageEntry,
} from "@/lib/profile/types"
import { cn } from "@/lib/utils"
import { MIN_CV_LENGTH } from "@/lib/cv-analysis/service"

export type CandidateProfileData = {
  id: string
  cv_text: string
  first_name: string | null
  last_name: string | null
  contact_email: string | null
  phone: string | null
  date_of_birth: string | null
  current_city: string | null
  current_cities: string[]
  current_title: string | null
  bio: string | null
  linkedin_url: string | null
  github_url: string | null
  website_url: string | null
  skills: string[]
  experience_entries: CvExperience[]
  education_entries: ProfileEducationEntry[]
  language_entries: ProfileLanguageEntry[]
  target_roles: string[]
  target_locations: string[]
  desired_salary: number | null
  desired_salary_max: number | null
  remote_preference: string | null
  preferred_contract_types: string[]
  cv_file_name: string | null
  cv_file_path: string | null
  cv_file_updated_at: string | null
  profile_reviewed_at: string | null
}

const SECTIONS = [
  { id: "job", label: "Job recherché", icon: Search },
  { id: "experiences", label: "Expériences", icon: Briefcase },
  { id: "skills", label: "Compétences", icon: GraduationCap },
  { id: "education", label: "Diplômes & formations", icon: GraduationCap },
  { id: "personal", label: "Informations personnelles", icon: UserRound },
  { id: "resources", label: "Autres ressources", icon: Link2 },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

type CandidateProfileFormProps = {
  mode: "onboarding" | "settings"
  onContinue?: () => void | Promise<void>
  className?: string
}

function emptyProfile(): CandidateProfileData {
  return {
    id: "",
    cv_text: "",
    first_name: null,
    last_name: null,
    contact_email: null,
    phone: null,
    date_of_birth: null,
    current_city: null,
    current_cities: [],
    current_title: null,
    bio: null,
    linkedin_url: null,
    github_url: null,
    website_url: null,
    skills: [],
    experience_entries: [],
    education_entries: [],
    language_entries: [],
    target_roles: [],
    target_locations: [],
    desired_salary: null,
    desired_salary_max: null,
    remote_preference: null,
    preferred_contract_types: [],
    cv_file_name: null,
    cv_file_path: null,
    cv_file_updated_at: null,
    profile_reviewed_at: null,
  }
}

export function CandidateProfileForm({
  mode,
  onContinue,
  className,
}: CandidateProfileFormProps) {
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importingPdf, setImportingPdf] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [suggestedRoles, setSuggestedRoles] = useState<string[]>([])
  const [activeSection, setActiveSection] = useState<SectionId>("personal")
  const [profile, setProfile] = useState<CandidateProfileData>(emptyProfile)
  const [birthDisplay, setBirthDisplay] = useState("")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const resourceFileRef = useRef<HTMLInputElement>(null)
  const extractAppliedRef = useRef(false)

  const applyProfile = useCallback((next: CandidateProfileData) => {
    setProfile((prev) => {
      // Preserve explicitly validated/modified fields by the user
      // when merging partial updates
      return {
        ...prev,
        ...next,
        // Never overwrite existing non-empty values with nulls from partial updates
        first_name: next.first_name !== undefined ? (next.first_name ?? prev.first_name) : prev.first_name,
        last_name: next.last_name !== undefined ? (next.last_name ?? prev.last_name) : prev.last_name,
        contact_email: next.contact_email !== undefined ? (next.contact_email ?? prev.contact_email) : prev.contact_email,
        phone: next.phone !== undefined ? (next.phone ?? prev.phone) : prev.phone,
        date_of_birth: next.date_of_birth !== undefined ? (next.date_of_birth ?? prev.date_of_birth) : prev.date_of_birth,
        current_city: next.current_city !== undefined ? (next.current_city ?? prev.current_city) : prev.current_city,
        current_title: next.current_title !== undefined ? (next.current_title ?? prev.current_title) : prev.current_title,
        linkedin_url: next.linkedin_url !== undefined ? (next.linkedin_url ?? prev.linkedin_url) : prev.linkedin_url,
        github_url: next.github_url !== undefined ? (next.github_url ?? prev.github_url) : prev.github_url,
        website_url: next.website_url !== undefined ? (next.website_url ?? prev.website_url) : prev.website_url,
        language_entries: next.language_entries !== undefined ? next.language_entries : prev.language_entries,
        skills: next.skills !== undefined ? next.skills : prev.skills,
        experience_entries: next.experience_entries !== undefined ? next.experience_entries : prev.experience_entries,
        education_entries: next.education_entries !== undefined ? next.education_entries : prev.education_entries,
        target_roles: next.target_roles !== undefined ? next.target_roles : prev.target_roles,
        target_locations: next.target_locations !== undefined ? next.target_locations : prev.target_locations,
      }
    })
    setBirthDisplay((prev) => {
      const nextDate = next.date_of_birth !== undefined ? next.date_of_birth : undefined
      if (nextDate !== undefined) {
        return formatDisplayDate(nextDate)
      }
      return prev
    })
  }, [])

  const applyDraftOnce = useCallback(
    (
      draft: Partial<CandidateProfileData> & { suggested_roles?: string[] },
      loaded: CandidateProfileData
    ) => {
      if (extractAppliedRef.current) return
      extractAppliedRef.current = true
      const { suggested_roles, ...fields } = draft
      // Merge with priority: loaded (user data) > fields from draft > defaults
      // Never overwrite existing validated user data with null/empty from draft
      applyProfile({
        ...emptyProfile(),
        ...loaded,
        id: loaded.id || (fields as any).id || "",
        cv_text: loaded.cv_text,
        cv_file_name: loaded.cv_file_name ?? (fields as any).cv_file_name ?? null,
        cv_file_path: loaded.cv_file_path ?? (fields as any).cv_file_path ?? null,
        cv_file_updated_at:
          loaded.cv_file_updated_at ?? (fields as any).cv_file_updated_at ?? null,
        profile_reviewed_at: loaded.profile_reviewed_at,
        // Job recherché stays user-owned; don't overwrite user preferences
        target_roles: loaded.target_roles?.length ? loaded.target_roles : ((fields as any).target_roles || loaded.target_roles),
        target_locations: loaded.target_locations?.length ? loaded.target_locations : ((fields as any).target_locations || loaded.target_locations),
        // Apply draft fields only if loaded doesn't have them
        first_name: loaded.first_name ?? (fields as any).first_name ?? null,
        last_name: loaded.last_name ?? (fields as any).last_name ?? null,
        contact_email: loaded.contact_email ?? (fields as any).contact_email ?? null,
        date_of_birth: loaded.date_of_birth ?? (fields as any).date_of_birth ?? null,
        phone: loaded.phone ?? (fields as any).phone ?? null,
        current_city: loaded.current_city ?? (fields as any).current_city ?? null,
        current_title: loaded.current_title ?? (fields as any).current_title ?? null,
        linkedin_url: loaded.linkedin_url ?? (fields as any).linkedin_url ?? null,
        github_url: loaded.github_url ?? (fields as any).github_url ?? null,
        website_url: loaded.website_url ?? (fields as any).website_url ?? null,
        language_entries: loaded.language_entries?.length ? loaded.language_entries : ((fields as any).language_entries || []),
        skills: loaded.skills?.length ? loaded.skills : ((fields as any).skills || []),
        experience_entries: loaded.experience_entries?.length ? loaded.experience_entries : ((fields as any).experience_entries || []),
        education_entries: loaded.education_entries?.length ? loaded.education_entries : ((fields as any).education_entries || []),
      } as any)
      if (Array.isArray(suggested_roles)) {
        setSuggestedRoles(suggested_roles)
      }
    },
    [applyProfile]
  )

  const runExtract = useCallback(
    async (loaded: CandidateProfileData, force: boolean) => {
      if (loaded.cv_text.trim().length < MIN_CV_LENGTH) {
        setExtractError(`CV trop court pour l\u2019analyse (minimum ${MIN_CV_LENGTH} caractères)`)
        return
      }
      setExtracting(true)
      setExtractError(null)
      try {
        const extractRes = await fetch("/api/profile/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            force,
            persist: mode === "onboarding" || force,
          }),
        })
        const extractData = (await extractRes.json().catch(() => ({}))) as {
          draft?: Partial<CandidateProfileData> & { suggested_roles?: string[] }
          profile?: CandidateProfileData
          error?: string
          extracted?: boolean
        }

        if (extractData.draft) {
          if (force) {
            // Settings force: merge draft without wiping dirty non-empty fields
            extractAppliedRef.current = false
            const draft = extractData.draft
            const merged: CandidateProfileData = {
              ...loaded,
              first_name: draft.first_name ?? loaded.first_name,
              last_name: draft.last_name ?? loaded.last_name,
              contact_email: draft.contact_email ?? loaded.contact_email,
              phone: draft.phone ?? loaded.phone,
              date_of_birth: draft.date_of_birth ?? loaded.date_of_birth,
              current_city: draft.current_city ?? loaded.current_city,
              current_title: draft.current_title ?? loaded.current_title,
              linkedin_url: draft.linkedin_url ?? loaded.linkedin_url,
              github_url: draft.github_url ?? loaded.github_url,
              website_url: draft.website_url ?? loaded.website_url,
              skills:
                draft.skills && draft.skills.length > 0
                  ? draft.skills
                  : loaded.skills,
              experience_entries:
                draft.experience_entries && draft.experience_entries.length > 0
                  ? draft.experience_entries
                  : loaded.experience_entries,
              education_entries:
                draft.education_entries && draft.education_entries.length > 0
                  ? draft.education_entries
                  : loaded.education_entries,
              language_entries:
                draft.language_entries && draft.language_entries.length > 0
                  ? draft.language_entries
                  : loaded.language_entries,
            }
            applyProfile(merged)
            if (Array.isArray(draft.suggested_roles)) {
              setSuggestedRoles(draft.suggested_roles)
            }
            extractAppliedRef.current = true
          } else {
            applyDraftOnce(extractData.draft, loaded)
          }
        } else if (extractData.profile) {
          applyDraftOnce(extractData.profile, loaded)
        }

        if (extractData.error) {
          setExtractError(extractData.error)
          toast.error(
            "Extraction partielle — complète les champs manquants manuellement"
          )
        } else if (extractData.extracted) {
          toast.success("CV analysé — profil prérempli")
        }

        // Onboarding persists the extract server-side: reload so signup defaults
        // (fake first/last name, auth email) are replaced by the CV values.
        if (mode === "onboarding" && extractData.extracted) {
          try {
            const freshRes = await fetch("/api/profile")
            if (freshRes.ok) {
              const freshData = (await freshRes.json()) as {
                profile?: CandidateProfileData
              }
              if (freshData.profile) {
                applyProfile({ ...emptyProfile(), ...freshData.profile })
                extractAppliedRef.current = true
              }
            }
          } catch {
            // Keep the draft values applied above if the reload fails.
          }
        }
      } finally {
        setExtracting(false)
      }
    },
    [applyDraftOnce, applyProfile, mode]
  )

  const loadAndMaybeExtract = useCallback(async () => {
    setLoading(true)
    setExtractError(null)
    try {
      const res = await fetch("/api/profile")
      if (!res.ok) throw new Error("Impossible de charger le profil")
      const data = (await res.json()) as { profile?: CandidateProfileData }
      const loaded = { ...emptyProfile(), ...(data.profile ?? {}) }

      applyProfile(loaded)

      // Signup already sets first/last name, so "profile already filled" must be
      // detected from CV-derived data only (contact details, experiences, skills…).
      const hasStructuredCvData =
        Boolean(loaded.phone?.trim()) ||
        Boolean(loaded.date_of_birth?.trim()) ||
        Boolean(loaded.current_city?.trim()) ||
        Boolean(loaded.current_title?.trim()) ||
        loaded.experience_entries.length > 0 ||
        loaded.education_entries.length > 0 ||
        loaded.skills.length > 0 ||
        loaded.language_entries.length > 0

      const shouldExtractOnboarding =
        mode === "onboarding" &&
        !loaded.profile_reviewed_at &&
        !extractAppliedRef.current &&
        loaded.cv_text.trim().length >= MIN_CV_LENGTH &&
        !hasStructuredCvData

      if (shouldExtractOnboarding) {
        await runExtract(loaded, true)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement échoué")
    } finally {
      setLoading(false)
      setExtracting(false)
    }
  }, [applyProfile, mode, runExtract])

  useEffect(() => {
    // Initial fetch + optional AI extract (async); same pattern as other settings pages.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data bootstrap on mount
    void loadAndMaybeExtract()
  }, [loadAndMaybeExtract])

  const updateField = <K extends keyof CandidateProfileData>(
    key: K,
    value: CandidateProfileData[K]
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const handleAddTag = (
    key: "target_roles" | "target_locations",
    draft: string,
    clear: () => void
  ) => {
    const value = draft.trim()
    if (!value) return
    const current = profile[key]
    if (current.some((item) => item.toLowerCase() === value.toLowerCase())) {
      clear()
      return
    }
    updateField(key, [...current, value])
    clear()
  }

  const handleToggleContract = (contract: string) => {
    const current = profile.preferred_contract_types
    if (current.includes(contract)) {
      updateField(
        "preferred_contract_types",
        current.filter((item) => item !== contract)
      )
      return
    }
    updateField("preferred_contract_types", [...current, contract])
  }

  const handleImportPdf = async () => {
    if (!pdfFile) {
      toast.error("Sélectionne un fichier PDF ou image")
      return
    }
    setImportingPdf(true)
    try {
      const formData = new FormData()
      formData.append("file", pdfFile)
      const res = await fetch("/api/profile/import-cv", {
        method: "POST",
        body: formData,
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        cv_file_name?: string | null
        ocr_used?: boolean
      }
      if (!res.ok) throw new Error(data.error ?? "Import CV échoué")
      toast.success(
        data.ocr_used ? "CV importé (OCR)" : "CV importé"
      )
      setPdfFile(null)
      extractAppliedRef.current = false
      await loadAndMaybeExtract()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import CV échoué")
    } finally {
      setImportingPdf(false)
    }
  }

  const handleRerunExtract = async () => {
    await runExtract(profile, true)
  }

  const buildSavePayload = (reviewed: boolean) => ({
    first_name: profile.first_name,
    last_name: profile.last_name,
    contact_email: profile.contact_email,
    phone: profile.phone,
    date_of_birth: profile.date_of_birth ?? parseDisplayDateToIso(birthDisplay),
    current_city: profile.current_city,
    current_title: profile.current_title,
    linkedin_url: profile.linkedin_url,
    github_url: profile.github_url,
    website_url: profile.website_url,
    skills: profile.skills,
    experience_entries: profile.experience_entries,
    education_entries: profile.education_entries,
    language_entries: profile.language_entries,
    target_roles: profile.target_roles,
    target_locations: profile.target_locations.filter(Boolean),
    desired_salary: profile.desired_salary,
    desired_salary_max: profile.desired_salary_max,
    remote_preference: profile.remote_preference,
    preferred_contract_types: profile.preferred_contract_types,
    profile_reviewed: reviewed ? true : undefined,
  })

  const handleSave = async (options?: { continueOnboarding?: boolean }) => {
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildSavePayload(options?.continueOnboarding === true)
        ),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        profile?: CandidateProfileData
      }
      if (!res.ok) throw new Error(data.error ?? "Enregistrement échoué")
      if (data.profile) applyProfile({ ...emptyProfile(), ...data.profile })
      toast.success("Profil enregistré")
      if (options?.continueOnboarding && onContinue) {
        await onContinue()
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enregistrement échoué"
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading || extracting) {
    return (
      <div className={cn("space-y-4", className)}>
        <ExtractionProgress
          active={extracting || loading}
          label={
            extracting
              ? "Analyse du CV…"
              : "Chargement du profil…"
          }
        />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="shrink-0 space-y-4 pt-4">
        {mode === "onboarding" ? (
          <div className="rounded-app-control border border-app-border-strong bg-app-control px-4 py-3 text-base leading-6 text-app-text-secondary">
            Les éléments extraits de ton CV sont préremplis, mais peuvent être
            incomplets ou approximatifs. Vérifie surtout le poste recherché et
            les expériences ; tu peux continuer sans tout remplir.
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-app-control">
            <div
              className="h-full rounded-full bg-app-action transition-all duration-300"
              style={{
                width: `${((SECTIONS.findIndex((s) => s.id === activeSection) + 1) / SECTIONS.length) * 100}%`,
              }}
            />
          </div>
          <span className="shrink-0 text-sm text-app-text-secondary">
            {SECTIONS.findIndex((s) => s.id === activeSection) + 1} sur{" "}
            {SECTIONS.length}
          </span>
        </div>

        <Tabs
          value={activeSection}
          onValueChange={(value) => setActiveSection(value as SectionId)}
        >
          <TabsList variant="section" aria-label="Sections du profil">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              return (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  variant="section"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{section.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-4">
        {extractError ? (
          <div
            role="status"
            className="rounded-app-control border border-app-warning/40 bg-app-warning/10 px-4 py-3 text-base text-app-warning"
          >
            Extraction IA incomplète : {extractError}. Les champs restent
            éditables.
          </div>
        ) : null}

        {activeSection === "personal" ? (
          <Card variant="app" className="flex shrink-0 flex-col">
            <CardHeader className="shrink-0 gap-1">
              <CardTitle className="text-xl font-medium leading-6 tracking-[-0.02em] text-app-text-strong">Informations personnelles</CardTitle>
              <CardDescription className="text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-subtle">
                Permettez aux entreprises de vous contacter. Les champs absents
                du CV restent vides.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  placeholder="Jone"
                  value={profile.first_name ?? ""}
                  onChange={(e) =>
                    updateField("first_name", e.target.value || null)
                  }
                  variant="control"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  value={profile.last_name ?? ""}
                  onChange={(e) =>
                    updateField("last_name", e.target.value || null)
                  }
                  variant="control"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">E-mail</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={profile.contact_email ?? ""}
                  onChange={(e) =>
                    updateField("contact_email", e.target.value || null)
                  }
                  placeholder="jonedoe@gmail.com"
                  variant="control"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={profile.phone ?? ""}
                  onChange={(e) => updateField("phone", e.target.value || null)}
                  placeholder="06.61.11.49.10"
                  variant="control"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date de naissance</Label>
                <DateOfBirthField
                  id="dob"
                  value={profile.date_of_birth}
                  onChange={(iso) => {
                    updateField("date_of_birth", iso)
                    setBirthDisplay(iso ? formatDisplayDate(iso) : "")
                  }}
                />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="city">Lieu de résidence</Label>
                <div className="relative">
                <SearchableMultiSelect
                  id="city"
                  options={[...FRANCE_CITIES]}
                  values={profile.current_cities || []}
                  onChange={(values) => updateField("current_cities", values)}
                  placeholder="Placeholder"
                  allowCustom
                  emptyLabel="Aucune ville sélectionnée"
                  inputVariant="control"
                />
                <ChevronDown className="pointer-events-none absolute right-3 top-[17px] h-4 w-4 text-app-text-muted" aria-hidden />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Post Actuel</Label>
                <Input
                  id="title"
                  value={profile.current_title ?? ""}
                  onChange={(e) =>
                    updateField("current_title", e.target.value || null)
                  }
                  placeholder="Placeholder"
                  variant="control"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language-search">Langues</Label>
                <LanguageEntriesField
                  entries={profile.language_entries}
                  onChange={(entries) => updateField("language_entries", entries)}
                  inputVariant="control"
                  showEmptyState={mode !== "onboarding"}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "job" ? (
          <Card variant="app" className="flex shrink-0 flex-col">
            <CardHeader className="shrink-0 gap-1">
              <CardTitle className="text-xl font-medium leading-6 tracking-[-0.02em] text-app-text-strong">Job recherché</CardTitle>
              <CardDescription className="text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-subtle">
                Suggestions depuis le CV — ajoute manuellement les métiers
                recherchés (aucun auto-save).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {mode === "settings" && suggestedRoles.length > 0 ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Suggestions d’intitulés</Label>
                  <div className="flex flex-wrap gap-2">
                    {suggestedRoles
                      .filter((role) => !profile.target_roles.some((existing) => existing.toLowerCase() === role.toLowerCase()))
                      .map((role) => (
                        <Button key={role} type="button" size="sm" variant="outline" onClick={() => handleAddTag("target_roles", role, () => undefined)}>
                          <Plus className="mr-1 h-3 w-3" />{role}
                        </Button>
                      ))}
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="role-draft">Rechercher un métier</Label>
                <div className="relative">
                <SearchableMultiSelect
                  id="role-draft"
                  options={[...PROFILE_ROLE_SUGGESTIONS, ...suggestedRoles]}
                  values={profile.target_roles}
                  onChange={(values) => updateField("target_roles", values)}
                  placeholder="Placeholder"
                  allowCustom
                  emptyLabel="Aucun poste sélectionné"
                  inputVariant="control"
                />
                  <Search className="pointer-events-none absolute right-3 top-[17px] h-4 w-4 text-app-text-secondary" aria-hidden />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-draft">Ville recherchée</Label>
                <div className="relative">
                  <SearchableMultiSelect
                  id="location-draft"
                  options={[...PROFILE_LOCATION_EXTRAS, ...FRANCE_CITIES]}
                  values={profile.target_locations}
                  onChange={(values) => updateField("target_locations", values)}
                  placeholder="Placeholder"
                  allowCustom
                  emptyLabel="Aucune ville sélectionnée"
                  inputVariant="control"
                />
                  <ChevronDown className="pointer-events-none absolute right-3 top-[17px] h-4 w-4 text-app-text-muted" aria-hidden />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Type de contrat</Label>
                <div className="flex flex-wrap gap-2">
                  {(mode === "onboarding"
                    ? CONTRACT_TYPE_OPTIONS.filter((contract) => ["CDI", "CDD", "Freelance"].includes(contract))
                    : CONTRACT_TYPE_OPTIONS
                  ).map((contract) => {
                    const selected =
                      profile.preferred_contract_types.includes(contract)
                    return (
                      <button
                        key={contract}
                        type="button"
                        onClick={() => handleToggleContract(contract)}
                        className={cn(
                          "rounded-[8px] border-[1.25px] px-3.5 py-1.5 text-base font-medium transition-colors",
                          selected
                            ? "border-app-text-secondary bg-app-control text-app-text-strong"
                            : "border-app-border text-app-text-muted hover:bg-app-control hover:text-app-text"
                        )}
                        aria-pressed={selected}
                      >
                        {contract}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary-min">Salaire annuel minimum</Label>
                {mode === "onboarding" ? (
                  <Input
                    id="salary-min"
                    type="number"
                    min={0}
                    value={profile.desired_salary ?? ""}
                    onChange={(e) => updateField("desired_salary", e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="42000"
                    variant="control"
                  />
                ) : (
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="salary-min" className="text-xs text-muted-foreground">Minimum</Label>
                    <Input
                      id="salary-min"
                      type="number"
                      min={0}
                      value={profile.desired_salary ?? ""}
                      onChange={(e) => {
                        const value = e.target.value
                        updateField(
                          "desired_salary",
                          value === "" ? null : Number(value)
                        )
                      }}
                      placeholder="40000"
                      variant="control"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="salary-max" className="text-xs text-muted-foreground">Maximum</Label>
                    <Input
                      id="salary-max"
                      type="number"
                      min={0}
                      value={profile.desired_salary_max ?? ""}
                      onChange={(e) => {
                        const value = e.target.value
                        updateField(
                          "desired_salary_max",
                          value === "" ? null : Number(value)
                        )
                      }}
                      placeholder="60000"
                      variant="control"
                    />
                  </div>
                </div>
                )}
              </div>

              {mode === "settings" ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Télétravail</Label>
                  <div className="flex flex-wrap gap-2">
                    {REMOTE_PREFERENCE_OPTIONS.map((option) => {
                      const selected = profile.remote_preference === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateField("remote_preference", selected ? null : option.value)}
                          className={cn("rounded-[8px] border-[1.25px] px-3.5 py-1.5 text-base font-medium transition-colors", selected ? "border-app-text-secondary bg-app-control text-app-text-strong" : "border-app-border text-app-text-muted hover:bg-app-control hover:text-app-text")}
                          aria-pressed={selected}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "experiences" ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <CvExperiencesCard
              experiences={profile.experience_entries}
              onChange={(experiences) =>
                updateField("experience_entries", experiences)
              }
            />
          </div>
        ) : null}

        {activeSection === "skills" ? (
          <Card variant="app" className="flex shrink-0 flex-col">
            <CardHeader className="shrink-0 gap-1">
              <CardTitle className="text-xl font-medium leading-6 tracking-[-0.02em] text-app-text-strong">Compétences &amp; expertises</CardTitle>
              <CardDescription className="text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-subtle">
                Mots-clés ATS détectés depuis ton CV — ajoute ou retire librement.
              </CardDescription>
            </CardHeader>
            {/* Retraits horizontaux de la carte (16 px via --card-spacing) pour que
                le champ suive l'aplomb du titre, comme les autres sections. */}
            <CardContent className="space-y-4">
              <Label htmlFor="skills-search">Rechercher une compétence</Label>
              <div className="relative">
              <SearchableMultiSelect
                id="skills-search"
                options={listAtsSkillOptions()}
                values={profile.skills}
                onChange={(values) => updateField("skills", values)}
                placeholder="Placeholder"
                allowCustom
                emptyLabel="Aucune compétence pour l’instant."
                inputVariant="control"
                chipClassName="rounded-[8px] border-0 bg-app-control px-2 py-2 text-base font-medium leading-6 text-app-text"
              />
                <Search className="pointer-events-none absolute right-3 top-[17px] h-4 w-4 text-app-text-secondary" aria-hidden />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "education" ? (
          <EducationEntriesCard
            entries={profile.education_entries}
            onChange={(entries) => updateField("education_entries", entries)}
          />
        ) : null}

        {activeSection === "resources" ? (
          <Card variant="app" className="flex shrink-0 flex-col">
            <CardHeader className="flex shrink-0 flex-wrap items-start justify-between gap-4 rounded-none sm:flex-row">
              <div className="space-y-2">
              <CardTitle className="text-xl font-medium leading-6 tracking-[-0.02em] text-app-text-strong">Autres ressources</CardTitle>
              <CardDescription className="text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-subtle">
                Ajoutez votre CV et vos liens pour soutenir vos candidatures.
              </CardDescription>
              </div>
              <Button type="button" variant="outline" className="h-12 rounded-[8px] border-app-text-secondary bg-app-control text-sm text-app-text" onClick={() => {
                const id = !profile.linkedin_url ? "linkedin" : !profile.github_url ? "github" : "website"
                document.getElementById(id)?.focus()
              }}>
                <Plus className="h-4 w-4" aria-hidden /> Ajouter un lien
              </Button>
            </CardHeader>
            {/* Zone scrollable : mêmes retraits horizontaux de 16 px que l’en-tête
                de carte, sans plafond de largeur sur la page. */}
            <CardContent className="min-h-0 overflow-y-auto overscroll-contain grid gap-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col items-center gap-4 rounded-[8px] border border-dashed border-app-border bg-app-surface-raised p-4 text-center sm:col-span-2"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  if (!importingPdf) setPdfFile(event.dataTransfer.files?.[0] ?? null)
                }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/onboarding/upload.svg" alt="" width={40} height={40} />
                <div className="space-y-2">
                  <p className="text-lg font-medium leading-6 text-app-text-strong">Glisse et dépose ton CV</p>
                  <p className="text-sm font-light leading-6 text-app-text">Formats PDF, PNG, JPEG et WebP</p>
                </div>
                <input ref={resourceFileRef} type="file" className="hidden" accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={(event) => { setPdfFile(event.target.files?.[0] ?? null); event.target.value = "" }} />
                <Button type="button" variant="outline" disabled={importingPdf} onClick={() => resourceFileRef.current?.click()} className="h-12 rounded-[8px] border-app-text-secondary bg-app-control text-sm text-app-text">Sélectionner un fichier</Button>
              </div>
              {pdfFile || profile.cv_file_name || profile.cv_text.trim() ? (
              <div className="min-w-0 space-y-3 rounded-[8px] border border-app-border bg-app-surface-raised p-4 sm:col-span-2">
                {pdfFile ? (
                  <div className="space-y-2">
                    <p className="break-all text-xl font-medium text-app-text-strong">{pdfFile.name}</p>
                    <p className="text-base text-app-text-secondary">{(pdfFile.size / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Mo · prêt à importer</p>
                  </div>
                ) : (
                <>
                {profile.cv_file_name ? (
                  <div className="space-y-1 text-base leading-6">
                    <p className="break-all text-xl font-medium text-app-text">
                      {profile.cv_file_name}
                    </p>
                    <p className="text-muted-foreground">
                      Type :{" "}
                      {profile.cv_file_name.toLowerCase().endsWith(".pdf")
                        ? "PDF"
                        : "Fichier"}
                      {profile.cv_file_updated_at
                        ? ` · mis à jour le ${new Date(
                            profile.cv_file_updated_at
                          ).toLocaleString("fr-FR")}`
                        : null}
                    </p>
                  </div>
                ) : profile.cv_text.trim() ? (
                  <p className="text-base text-muted-foreground">
                    CV texte collé · {profile.cv_text.trim().length} caractères
                  </p>
                ) : (
                  <p className="text-base text-muted-foreground">
                    Aucun CV enregistré.
                  </p>
                )}
                </>
                )}
                {pdfFile ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button type="button" variant="outline" disabled={importingPdf} onClick={() => setPdfFile(null)}>Annuler</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={importingPdf || !pdfFile}
                    onClick={() => void handleImportPdf()}
                    className="h-[50px] w-full rounded-[8px] border-[1.25px] border-app-text-muted bg-app-control px-4 text-sm font-medium text-app-text-subtle hover:bg-app-border sm:w-auto"
                  >
                    <FileUp className="mr-1 h-4 w-4" />
                    {importingPdf
                      ? "Import…"
                      : profile.cv_file_name
                        ? "Remplacer"
                        : "Importer un fichier"}
                  </Button>
                </div>
                ) : null}
              </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={profile.linkedin_url ?? ""}
                  onChange={(e) =>
                    updateField("linkedin_url", e.target.value || null)
                  }
                  placeholder="https://linkedin.com/in/…"
                  variant="control"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github">GitHub</Label>
                <Input
                  id="github"
                  value={profile.github_url ?? ""}
                  onChange={(e) =>
                    updateField("github_url", e.target.value || null)
                  }
                  placeholder="https://github.com/…"
                  variant="control"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Site Internet</Label>
                <Input
                  id="website"
                  value={profile.website_url ?? ""}
                  onChange={(e) =>
                    updateField("website_url", e.target.value || null)
                  }
                  placeholder="https://…"
                  variant="control"
                />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-app-border-strong pt-4 pb-0 lg:flex-row lg:items-center lg:justify-end">
            {mode === "onboarding" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="control"
                  disabled={saving}
                  className="w-full text-sm font-medium lg:w-auto"
                  onClick={() => void handleSave({ continueOnboarding: true })}
                >
                  Continuer sans tout remplir
                </Button>
                <Button
                  type="button"
                  size="control"
                  disabled={saving}
                  className="w-full text-sm font-medium lg:w-auto"
                  onClick={() => {
                    const currentIndex = SECTIONS.findIndex((s) => s.id === activeSection)
                    if (currentIndex < SECTIONS.length - 1) {
                      setActiveSection(SECTIONS[currentIndex + 1].id)
                    } else {
                      void handleSave({ continueOnboarding: true })
                    }
                  }}
                >
                  {saving ? "Enregistrement…" : "Suivant"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={saving}
                  className="w-full lg:w-auto"
                  onClick={() => void handleSave()}
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving || extracting}
                  className="w-full lg:w-auto"
                  onClick={() => void handleRerunExtract()}
                >
                  {extracting ? "Analyse…" : "Relancer l'analyse"}
                </Button>
              </>
            )}
        </div>
    </div>
  )
}
