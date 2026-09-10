"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Briefcase,
  FileText,
  FileUp,
  GraduationCap,
  Languages,
  Link2,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { CvExperiencesCard } from "@/components/settings/cv-experiences-card"
import { ExtractionProgress } from "@/components/onboarding/onboarding-progress"
import { MONTH_OPTIONS, type CvExperience } from "@/lib/cv/experiences"
import {
  emptyEducationEntry,
  emptyLanguageEntry,
  formatDisplayDate,
  parseDisplayDateToIso,
} from "@/lib/profile/helpers"
import {
  CONTRACT_TYPE_OPTIONS,
  LANGUAGE_LEVELS,
  REMOTE_PREFERENCE_OPTIONS,
  type ProfileEducationEntry,
  type ProfileLanguageEntry,
} from "@/lib/profile/types"
import { cn } from "@/lib/utils"

export type CandidateProfileData = {
  id: string
  cv_text: string
  first_name: string | null
  last_name: string | null
  contact_email: string | null
  phone: string | null
  date_of_birth: string | null
  current_city: string | null
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
  remote_preference: string | null
  preferred_contract_types: string[]
  cv_file_name: string | null
  cv_file_path: string | null
  cv_file_updated_at: string | null
  profile_reviewed_at: string | null
}

const SECTIONS = [
  { id: "personal", label: "Informations personnelles", icon: UserRound },
  { id: "job", label: "Job recherché", icon: Search },
  { id: "experiences", label: "Expériences", icon: Briefcase },
  { id: "skills", label: "Compétences & expertises", icon: GraduationCap },
  { id: "languages", label: "Langues", icon: Languages },
  { id: "education", label: "Diplômes & formations", icon: GraduationCap },
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
  const [extractDone, setExtractDone] = useState(false)
  const [suggestedRoles, setSuggestedRoles] = useState<string[]>([])
  const [activeSection, setActiveSection] = useState<SectionId>("personal")
  const [profile, setProfile] = useState<CandidateProfileData>(emptyProfile)
  const [birthDisplay, setBirthDisplay] = useState("")
  const [skillDraft, setSkillDraft] = useState("")
  const [languageDraft, setLanguageDraft] = useState("")
  const [roleDraft, setRoleDraft] = useState("")
  const [locationDraft, setLocationDraft] = useState("")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [educationDraft, setEducationDraft] = useState<ProfileEducationEntry | null>(null)
  const extractAppliedRef = useRef(false)

  const applyProfile = useCallback((next: CandidateProfileData) => {
    setProfile(next)
    setBirthDisplay(formatDisplayDate(next.date_of_birth))
  }, [])

  const applyDraftOnce = useCallback(
    (
      draft: Partial<CandidateProfileData> & { suggested_roles?: string[] },
      loaded: CandidateProfileData
    ) => {
      if (extractAppliedRef.current) return
      extractAppliedRef.current = true
      const { suggested_roles, ...fields } = draft
      applyProfile({
        ...emptyProfile(),
        ...loaded,
        ...fields,
        // Keep CV text + file meta from loaded profile
        id: loaded.id || fields.id || "",
        cv_text: loaded.cv_text,
        cv_file_name: loaded.cv_file_name ?? fields.cv_file_name ?? null,
        cv_file_path: loaded.cv_file_path ?? fields.cv_file_path ?? null,
        cv_file_updated_at:
          loaded.cv_file_updated_at ?? fields.cv_file_updated_at ?? null,
        profile_reviewed_at: loaded.profile_reviewed_at,
        // Job recherché stays user-owned; draft.target_roles is empty by design
        target_roles: loaded.target_roles,
        target_locations: loaded.target_locations,
      })
      if (Array.isArray(suggested_roles)) {
        setSuggestedRoles(suggested_roles)
      }
      setExtractDone(true)
    },
    [applyProfile]
  )

  const runExtract = useCallback(
    async (loaded: CandidateProfileData, force: boolean) => {
      if (loaded.cv_text.trim().length < 200) {
        setExtractError("CV trop court pour l’analyse (minimum 200 caractères)")
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
            setExtractDone(true)
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

      const shouldExtractOnboarding =
        mode === "onboarding" &&
        !loaded.profile_reviewed_at &&
        !extractAppliedRef.current &&
        loaded.cv_text.trim().length >= 200 &&
        !loaded.first_name?.trim() &&
        !loaded.last_name?.trim() &&
        loaded.experience_entries.length === 0 &&
        loaded.skills.length === 0

      if (shouldExtractOnboarding) {
        await runExtract(loaded, true)
      } else if (
        mode === "onboarding" &&
        (loaded.first_name?.trim() || loaded.experience_entries.length > 0)
      ) {
        setExtractDone(true)
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

  const handleAddSkill = () => {
    const skill = skillDraft.trim()
    if (!skill) return
    if (profile.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setSkillDraft("")
      return
    }
    updateField("skills", [...profile.skills, skill])
    setSkillDraft("")
  }

  const handleRemoveSkill = (skill: string) => {
    updateField(
      "skills",
      profile.skills.filter((item) => item !== skill)
    )
  }

  const handleAddLanguage = () => {
    const language = languageDraft.trim()
    if (!language) return
    if (
      profile.language_entries.some(
        (entry) => entry.language.toLowerCase() === language.toLowerCase()
      )
    ) {
      setLanguageDraft("")
      return
    }
    updateField("language_entries", [
      ...profile.language_entries,
      { ...emptyLanguageEntry(), language, level: "Intermédiaire" },
    ])
    setLanguageDraft("")
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

  const handleSaveEducation = () => {
    if (!educationDraft) return
    if (!educationDraft.name.trim()) {
      toast.error("Le nom du diplôme est requis")
      return
    }
    const exists = profile.education_entries.some(
      (entry) => entry.id === educationDraft.id
    )
    if (exists) {
      updateField(
        "education_entries",
        profile.education_entries.map((entry) =>
          entry.id === educationDraft.id ? educationDraft : entry
        )
      )
    } else {
      updateField("education_entries", [
        ...profile.education_entries,
        educationDraft,
      ])
    }
    setEducationDraft(null)
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
      setExtractDone(false)
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
    date_of_birth: parseDisplayDateToIso(birthDisplay),
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
    target_locations: profile.target_locations,
    desired_salary: profile.desired_salary,
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

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    const years: string[] = []
    for (let year = current + 1; year >= current - 60; year -= 1) {
      years.push(String(year))
    }
    return years
  }, [])

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
    <div className={cn("flex flex-col gap-6 lg:flex-row", className)}>
      <nav
        aria-label="Sections du profil"
        className="shrink-0 space-y-1 lg:sticky lg:top-0 lg:w-56 lg:self-start"
      >
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const active = activeSection === section.id
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-base transition-colors",
                active
                  ? "bg-primary/15 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{section.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="min-w-0 flex-1 space-y-4">
        {extractDone && !extractError ? (
          <div
            role="status"
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-base text-emerald-100"
          >
            CV analysé — vérifie et complète les champs avant d’enregistrer.
          </div>
        ) : null}
        {extractError ? (
          <div
            role="status"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-base text-amber-100"
          >
            Extraction IA incomplète : {extractError}. Les champs restent
            éditables.
          </div>
        ) : null}

        {activeSection === "personal" ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Permettez aux entreprises de vous contacter. Les champs absents
                du CV restent vides.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={profile.first_name ?? ""}
                  onChange={(e) =>
                    updateField("first_name", e.target.value || null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={profile.last_name ?? ""}
                  onChange={(e) =>
                    updateField("last_name", e.target.value || null)
                  }
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
                  placeholder="prenom@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={profile.phone ?? ""}
                  onChange={(e) => updateField("phone", e.target.value || null)}
                  placeholder="06… ou +33…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date de naissance</Label>
                <Input
                  id="dob"
                  value={birthDisplay}
                  onChange={(e) => setBirthDisplay(e.target.value)}
                  placeholder="JJ/MM/AAAA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Lieu de résidence</Label>
                <Input
                  id="city"
                  value={profile.current_city ?? ""}
                  onChange={(e) =>
                    updateField("current_city", e.target.value || null)
                  }
                  placeholder="Ville"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Poste actuel</Label>
                <Input
                  id="title"
                  value={profile.current_title ?? ""}
                  onChange={(e) =>
                    updateField("current_title", e.target.value || null)
                  }
                  placeholder="Product Owner"
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "job" ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Job recherché</CardTitle>
              <CardDescription>
                Suggestions depuis le CV — ajoute manuellement les métiers
                recherchés (aucun auto-save).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestedRoles.length > 0 ? (
                <div className="space-y-2">
                  <Label>Suggestions d’intitulés</Label>
                  <div className="flex flex-wrap gap-2">
                    {suggestedRoles
                      .filter(
                        (role) =>
                          !profile.target_roles.some(
                            (existing) =>
                              existing.toLowerCase() === role.toLowerCase()
                          )
                      )
                      .map((role) => (
                        <Button
                          key={role}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleAddTag("target_roles", role, () => undefined)
                          }
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          {role}
                        </Button>
                      ))}
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="role-draft">Intitulé de poste</Label>
                <div className="flex gap-2">
                  <Input
                    id="role-draft"
                    value={roleDraft}
                    onChange={(e) => setRoleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddTag("target_roles", roleDraft, () =>
                          setRoleDraft("")
                        )
                      }
                    }}
                    placeholder="Product Owner"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      handleAddTag("target_roles", roleDraft, () =>
                        setRoleDraft("")
                      )
                    }
                  >
                    Ajouter
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {profile.target_roles.map((role) => (
                    <Badge
                      key={role}
                      variant="tag"
                      className="gap-1.5"
                    >
                      {role}
                      <button
                        type="button"
                        aria-label={`Retirer ${role}`}
                        onClick={() =>
                          updateField(
                            "target_roles",
                            profile.target_roles.filter((item) => item !== role)
                          )
                        }
                        className="rounded-full opacity-70 transition-opacity hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-draft">Lieu de travail souhaité</Label>
                <div className="flex gap-2">
                  <Input
                    id="location-draft"
                    value={locationDraft}
                    onChange={(e) => setLocationDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddTag("target_locations", locationDraft, () =>
                          setLocationDraft("")
                        )
                      }
                    }}
                    placeholder="Paris"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      handleAddTag("target_locations", locationDraft, () =>
                        setLocationDraft("")
                      )
                    }
                  >
                    Ajouter
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {profile.target_locations.map((location) => (
                    <Badge
                      key={location}
                      variant="tag"
                      className="gap-1.5"
                    >
                      {location}
                      <button
                        type="button"
                        aria-label={`Retirer ${location}`}
                        onClick={() =>
                          updateField(
                            "target_locations",
                            profile.target_locations.filter(
                              (item) => item !== location
                            )
                          )
                        }
                        className="rounded-full opacity-70 transition-opacity hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Type de contrat</Label>
                <div className="flex flex-wrap gap-2">
                  {CONTRACT_TYPE_OPTIONS.map((contract) => {
                    const selected =
                      profile.preferred_contract_types.includes(contract)
                    return (
                      <button
                        key={contract}
                        type="button"
                        onClick={() => handleToggleContract(contract)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-base font-medium transition-colors",
                          selected
                            ? "border-emerald-500/50 bg-transparent text-emerald-700 dark:border-emerald-500/60 dark:text-emerald-400"
                            : "border-border text-muted-foreground hover:bg-muted"
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
                <Label>Télétravail</Label>
                <div className="grid gap-2">
                  {REMOTE_PREFERENCE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-base"
                    >
                      <Checkbox
                        checked={profile.remote_preference === option.value}
                        onCheckedChange={(checked) =>
                          updateField(
                            "remote_preference",
                            checked ? option.value : null
                          )
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Salaire brut minimum par an (€)</Label>
                <Input
                  id="salary"
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
                  placeholder="55000"
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "experiences" ? (
          <CvExperiencesCard
            experiences={profile.experience_entries}
            onChange={(experiences) =>
              updateField("experience_entries", experiences)
            }
          />
        ) : null}

        {activeSection === "skills" ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Compétences & expertises</CardTitle>
              <CardDescription>
                Mots-clés ATS détectés depuis ton CV — ajoute ou retire librement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddSkill()
                    }
                  }}
                  placeholder="Exemple : Figma"
                  aria-label="Cherchez une compétence"
                />
                <Button type="button" variant="secondary" onClick={handleAddSkill}>
                  Ajouter
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.length === 0 ? (
                  <p className="text-base text-muted-foreground">
                    Aucune compétence pour l’instant.
                  </p>
                ) : (
                  profile.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="tag"
                      className="gap-1.5"
                    >
                      {skill}
                      <button
                        type="button"
                        aria-label={`Retirer ${skill}`}
                        onClick={() => handleRemoveSkill(skill)}
                        className="rounded-full opacity-70 transition-opacity hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "languages" ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Langues</CardTitle>
              <CardDescription>
                Listez les langues que vous pouvez utiliser professionnellement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={languageDraft}
                  onChange={(e) => setLanguageDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddLanguage()
                    }
                  }}
                  placeholder="Exemple : Français"
                  aria-label="Cherchez une langue"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddLanguage}
                >
                  Ajouter
                </Button>
              </div>
              <ul className="space-y-2">
                {profile.language_entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2"
                  >
                    <span className="min-w-24 flex-1 font-medium">
                      {entry.language}
                    </span>
                    <select
                      className="h-9 rounded-md border border-input bg-transparent px-2 text-base"
                      value={entry.level}
                      onChange={(e) =>
                        updateField(
                          "language_entries",
                          profile.language_entries.map((item) =>
                            item.id === entry.id
                              ? {
                                  ...item,
                                  level: e.target
                                    .value as ProfileLanguageEntry["level"],
                                }
                              : item
                          )
                        )
                      }
                      aria-label={`Niveau ${entry.language}`}
                    >
                      <option value="">Sélectionnez</option>
                      {LANGUAGE_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Retirer ${entry.language}`}
                      onClick={() =>
                        updateField(
                          "language_entries",
                          profile.language_entries.filter(
                            (item) => item.id !== entry.id
                          )
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "education" ? (
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Diplômes & formations</CardTitle>
                <CardDescription>
                  Listez vos diplômes, formations et certifications pertinents.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEducationDraft(emptyEducationEntry())}
              >
                <Plus className="mr-1 h-4 w-4" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.education_entries.length === 0 && !educationDraft ? (
                <p className="rounded-2xl border border-dashed p-6 text-base text-muted-foreground">
                  Aucun diplôme pour l’instant.
                </p>
              ) : null}

              <ul className="space-y-3">
                {profile.education_entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border p-4"
                  >
                    <div>
                      <p className="font-semibold">{entry.name}</p>
                      <p className="text-base text-muted-foreground">
                        {[entry.school, entry.level].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-base text-muted-foreground">
                        {[
                          entry.startMonth
                            ? MONTH_OPTIONS.find((m) => m.value === entry.startMonth)
                                ?.label
                            : null,
                          entry.startYear,
                          "→",
                          entry.isCurrent
                            ? "présent"
                            : [
                                MONTH_OPTIONS.find((m) => m.value === entry.endMonth)
                                  ?.label,
                                entry.endYear,
                              ]
                                .filter(Boolean)
                                .join(" "),
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEducationDraft(entry)}
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Supprimer ${entry.name}`}
                        onClick={() =>
                          updateField(
                            "education_entries",
                            profile.education_entries.filter(
                              (item) => item.id !== entry.id
                            )
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              {educationDraft ? (
                <div className="space-y-3 rounded-2xl border border-border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="edu-name">Nom *</Label>
                    <Input
                      id="edu-name"
                      value={educationDraft.name}
                      onChange={(e) =>
                        setEducationDraft({
                          ...educationDraft,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edu-school">École ou organisme</Label>
                      <Input
                        id="edu-school"
                        value={educationDraft.school}
                        onChange={(e) =>
                          setEducationDraft({
                            ...educationDraft,
                            school: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edu-level">Niveau</Label>
                      <Input
                        id="edu-level"
                        value={educationDraft.level}
                        onChange={(e) =>
                          setEducationDraft({
                            ...educationDraft,
                            level: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Du</Label>
                      <div className="flex gap-2">
                        <select
                          className="h-10 flex-1 rounded-md border border-input bg-transparent px-2 text-base"
                          value={educationDraft.startMonth}
                          onChange={(e) =>
                            setEducationDraft({
                              ...educationDraft,
                              startMonth: e.target.value,
                            })
                          }
                        >
                          <option value="">MM</option>
                          {MONTH_OPTIONS.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className="h-10 flex-1 rounded-md border border-input bg-transparent px-2 text-base"
                          value={educationDraft.startYear}
                          onChange={(e) =>
                            setEducationDraft({
                              ...educationDraft,
                              startYear: e.target.value,
                            })
                          }
                        >
                          <option value="">AAAA</option>
                          {yearOptions.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Au</Label>
                      <div className="flex gap-2">
                        <select
                          className="h-10 flex-1 rounded-md border border-input bg-transparent px-2 text-base"
                          value={educationDraft.endMonth}
                          disabled={educationDraft.isCurrent}
                          onChange={(e) =>
                            setEducationDraft({
                              ...educationDraft,
                              endMonth: e.target.value,
                            })
                          }
                        >
                          <option value="">MM</option>
                          {MONTH_OPTIONS.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className="h-10 flex-1 rounded-md border border-input bg-transparent px-2 text-base"
                          value={educationDraft.endYear}
                          disabled={educationDraft.isCurrent}
                          onChange={(e) =>
                            setEducationDraft({
                              ...educationDraft,
                              endYear: e.target.value,
                            })
                          }
                        >
                          <option value="">AAAA</option>
                          {yearOptions.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-base">
                    <Checkbox
                      checked={educationDraft.isCurrent}
                      onCheckedChange={(checked) =>
                        setEducationDraft({
                          ...educationDraft,
                          isCurrent: Boolean(checked),
                          endMonth: checked ? "" : educationDraft.endMonth,
                          endYear: checked ? "" : educationDraft.endYear,
                        })
                      }
                    />
                    J&apos;y étudie toujours
                  </label>
                  <div className="space-y-2">
                    <Label htmlFor="edu-desc">Description</Label>
                    <Textarea
                      id="edu-desc"
                      value={educationDraft.description}
                      onChange={(e) =>
                        setEducationDraft({
                          ...educationDraft,
                          description: e.target.value,
                        })
                      }
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={handleSaveEducation}>
                      Enregistrer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEducationDraft(null)}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "resources" ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Autres ressources</CardTitle>
              <CardDescription>
                Ajoutez votre CV et vos liens pour soutenir vos candidatures.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <Label>CV</Label>
                  <Badge variant="secondary">Recommandé</Badge>
                </div>
                {profile.cv_file_name ? (
                  <p className="text-base text-muted-foreground">
                    {profile.cv_file_name}
                    {profile.cv_file_updated_at
                      ? ` · mis à jour le ${new Date(
                          profile.cv_file_updated_at
                        ).toLocaleString("fr-FR")}`
                      : null}
                  </p>
                ) : (
                  <p className="text-base text-muted-foreground">
                    Aucun fichier PDF enregistré (collage texte uniquement).
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Input
                    type="file"
                    accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                    aria-label="Importer un fichier CV"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={importingPdf || !pdfFile}
                    onClick={() => void handleImportPdf()}
                  >
                    <FileUp className="mr-1 h-4 w-4" />
                    {importingPdf ? "Import…" : "Importer un fichier"}
                  </Button>
                </div>
                <p className="text-base text-muted-foreground">
                  PDF ou image (PNG/JPEG/WebP). OCR Vision si le texte natif est
                  insuffisant.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={profile.linkedin_url ?? ""}
                  onChange={(e) =>
                    updateField("linkedin_url", e.target.value || null)
                  }
                  placeholder="https://linkedin.com/in/…"
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
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {mode === "onboarding" ? (
            <Button
              type="button"
              disabled={saving}
              onClick={() => void handleSave({ continueOnboarding: true })}
            >
              {saving ? "Enregistrement…" : "Enregistrer et continuer"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving || extracting}
                onClick={() => void handleRerunExtract()}
              >
                {extracting ? "Analyse…" : "Relancer l’analyse"}
              </Button>
            </>
          )}
          {mode === "onboarding" ? (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void handleSave({ continueOnboarding: true })}
            >
              Continuer sans tout remplir
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
