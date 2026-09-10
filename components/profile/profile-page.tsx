"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  FileText,
  FileUp,
  Globe,
  GraduationCap,
  Link2,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { PageHelpButton } from "@/components/onboarding/page-help-button"
import { CvAnalysisPanel } from "@/components/settings/cv-analysis-panel"
import { SearchableMultiSelect, SearchableSelect } from "@/components/jobs/searchable-multi-select"
import { EducationDialog } from "@/components/profile/education-dialog"
import { ExperienceDialog } from "@/components/profile/experience-dialog"
import { LOCATION_TYPE_OPTIONS, MONTH_OPTIONS } from "@/lib/cv/experiences"
import { FRANCE_CITIES } from "@/lib/onboarding/france-cities"
import { emptyLanguageEntry } from "@/lib/profile/helpers"
import {
  PROFILE_LANGUAGE_SUGGESTIONS,
  PROFILE_LOCATION_EXTRAS,
  PROFILE_ROLE_SUGGESTIONS,
  PROFILE_SKILL_SUGGESTIONS,
} from "@/lib/profile/suggestion-catalogs"
import {
  CONTRACT_TYPE_OPTIONS,
  LANGUAGE_LEVELS,
  REMOTE_PREFERENCE_OPTIONS,
  type ProfileEducationEntry,
  type ProfileExperienceEntry,
  type ProfileLanguageEntry,
} from "@/lib/profile/types"
import { cn } from "@/lib/utils"
import type { CvAnalysisResponse } from "@/types"

const LOCATION_SUGGESTIONS = [
  ...new Set([...PROFILE_LOCATION_EXTRAS, ...FRANCE_CITIES]),
]

type ProfileState = {
  id: string
  cv_text: string
  first_name: string | null
  last_name: string | null
  contact_email: string | null
  phone: string | null
  current_city: string | null
  current_title: string | null
  bio: string | null
  linkedin_url: string | null
  github_url: string | null
  website_url: string | null
  skills: string[]
  experience_entries: ProfileExperienceEntry[]
  education_entries: ProfileEducationEntry[]
  language_entries: ProfileLanguageEntry[]
  target_roles: string[]
  target_locations: string[]
  desired_salary: number | null
  remote_preference: string | null
  preferred_contract_types: string[]
  cv_file_name: string | null
  cv_file_updated_at: string | null
  updated_at?: string | null
}

const NAV_SECTIONS = [
  { id: "experiences", label: "Expériences", icon: Briefcase },
  { id: "education", label: "Formation", icon: GraduationCap },
  { id: "prefs", label: "Préférences", icon: Search },
] as const

type NavSectionId = (typeof NAV_SECTIONS)[number]["id"]

function emptyProfile(): ProfileState {
  return {
    id: "",
    cv_text: "",
    first_name: null,
    last_name: null,
    contact_email: null,
    phone: null,
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
    cv_file_updated_at: null,
    updated_at: null,
  }
}

function formatPeriod(entry: {
  startMonth: string
  startYear: string
  endMonth: string
  endYear: string
  isCurrent: boolean
}) {
  const start = [
    entry.startMonth
      ? MONTH_OPTIONS.find((m) => m.value === entry.startMonth)?.label
      : null,
    entry.startYear,
  ]
    .filter(Boolean)
    .join(" ")
  const end = entry.isCurrent
    ? "présent"
    : [
        entry.endMonth
          ? MONTH_OPTIONS.find((m) => m.value === entry.endMonth)?.label
          : null,
        entry.endYear,
      ]
        .filter(Boolean)
        .join(" ")
  return [start, end].filter(Boolean).join(" – ")
}

function sortByRecency<T extends { startYear: string; startMonth: string; isCurrent: boolean }>(
  entries: T[]
) {
  return [...entries].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
    const yearDiff = Number(b.startYear || 0) - Number(a.startYear || 0)
    if (yearDiff !== 0) return yearDiff
    return Number(b.startMonth || 0) - Number(a.startMonth || 0)
  })
}

function initialsFromName(first: string | null, last: string | null) {
  const parts = [first, last].filter(Boolean) as string[]
  if (parts.length === 0) return "?"
  return parts
    .map((part) => part.trim().charAt(0).toUpperCase())
    .join("")
    .slice(0, 2)
}

function displayTitle(profile: ProfileState) {
  if (profile.current_title?.trim()) return profile.current_title.trim()
  if (profile.target_roles[0]?.trim()) return profile.target_roles[0].trim()
  const latest = sortByRecency(profile.experience_entries)[0]
  return latest?.title?.trim() || "Titre non renseigné"
}

type ExtractDraft = {
  first_name?: string | null
  last_name?: string | null
  contact_email?: string | null
  phone?: string | null
  current_city?: string | null
  current_title?: string | null
  bio?: string | null
  linkedin_url?: string | null
  github_url?: string | null
  website_url?: string | null
  skills?: string[]
  experience_entries?: ProfileExperienceEntry[]
  education_entries?: ProfileEducationEntry[]
  language_entries?: ProfileLanguageEntry[]
}

/** True when identity + timeline fields look unfilled (CV may still exist). */
function isProfileStructurallyEmpty(profile: ProfileState): boolean {
  return (
    !profile.first_name?.trim() &&
    !profile.last_name?.trim() &&
    !profile.current_title?.trim() &&
    profile.skills.length === 0 &&
    profile.experience_entries.length === 0 &&
    profile.education_entries.length === 0
  )
}

function mergeExtractDraft(
  base: ProfileState,
  draft: ExtractDraft
): ProfileState {
  return {
    ...base,
    first_name: draft.first_name ?? base.first_name,
    last_name: draft.last_name ?? base.last_name,
    contact_email: draft.contact_email ?? base.contact_email,
    phone: draft.phone ?? base.phone,
    current_city: draft.current_city ?? base.current_city,
    current_title: draft.current_title ?? base.current_title,
    bio: draft.bio ?? base.bio,
    linkedin_url: draft.linkedin_url ?? base.linkedin_url,
    github_url: draft.github_url ?? base.github_url,
    website_url: draft.website_url ?? base.website_url,
    skills:
      draft.skills && draft.skills.length > 0 ? draft.skills : base.skills,
    experience_entries:
      draft.experience_entries && draft.experience_entries.length > 0
        ? draft.experience_entries
        : base.experience_entries,
    education_entries:
      draft.education_entries && draft.education_entries.length > 0
        ? draft.education_entries
        : base.education_entries,
    language_entries:
      draft.language_entries && draft.language_entries.length > 0
        ? draft.language_entries
        : base.language_entries,
  }
}

/** If structured columns are empty but extracted_cv snapshot has data, prefill the form. */
function hydrateFromExtractedCv(loaded: ProfileState): ProfileState {
  if (!isProfileStructurallyEmpty(loaded)) return loaded
  const raw = (loaded as ProfileState & { extracted_cv?: unknown }).extracted_cv
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return loaded
  const snap = raw as Record<string, unknown>
  const draft: ExtractDraft = {
    first_name: typeof snap.first_name === "string" ? snap.first_name : null,
    last_name: typeof snap.last_name === "string" ? snap.last_name : null,
    contact_email:
      typeof snap.contact_email === "string"
        ? snap.contact_email
        : typeof snap.email === "string"
          ? snap.email
          : null,
    phone: typeof snap.phone === "string" ? snap.phone : null,
    current_city:
      typeof snap.current_city === "string" ? snap.current_city : null,
    current_title:
      typeof snap.current_title === "string" ? snap.current_title : null,
    linkedin_url:
      typeof snap.linkedin_url === "string" ? snap.linkedin_url : null,
    github_url: typeof snap.github_url === "string" ? snap.github_url : null,
    website_url: typeof snap.website_url === "string" ? snap.website_url : null,
    skills: Array.isArray(snap.skills)
      ? snap.skills.filter((item): item is string => typeof item === "string")
      : [],
    experience_entries: Array.isArray(snap.experience_entries)
      ? (snap.experience_entries as ProfileExperienceEntry[])
      : [],
    education_entries: Array.isArray(snap.education_entries)
      ? (snap.education_entries as ProfileEducationEntry[])
      : [],
    language_entries: Array.isArray(snap.language_entries)
      ? (snap.language_entries as ProfileLanguageEntry[])
      : [],
  }
  const hasAny =
    Boolean(draft.first_name?.trim()) ||
    Boolean(draft.last_name?.trim()) ||
    Boolean(draft.current_title?.trim()) ||
    (draft.skills?.length ?? 0) > 0 ||
    (draft.experience_entries?.length ?? 0) > 0 ||
    (draft.education_entries?.length ?? 0) > 0
  if (!hasAny) return loaded
  return mergeExtractDraft(loaded, draft)
}

export function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importingPdf, setImportingPdf] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileState>(emptyProfile)
  const [savedSnapshot, setSavedSnapshot] = useState("")
  const [analysis, setAnalysis] = useState<CvAnalysisResponse | null>(null)
  const [activeSection, setActiveSection] = useState<NavSectionId>("experiences")
  const [cvToolsOpen, setCvToolsOpen] = useState(false)
  const [cvTextOpen, setCvTextOpen] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [languageDraft, setLanguageDraft] = useState("")
  const [languageListOpen, setLanguageListOpen] = useState(false)
  const [experienceDialogOpen, setExperienceDialogOpen] = useState(false)
  const [educationDialogOpen, setEducationDialogOpen] = useState(false)
  const [editingExperience, setEditingExperience] =
    useState<ProfileExperienceEntry | null>(null)
  const [editingEducation, setEditingEducation] =
    useState<ProfileEducationEntry | null>(null)
  const autoAnalyzeStarted = useRef(false)
  const autoFillStarted = useRef(false)
  const headerPdfInputRef = useRef<HTMLInputElement>(null)

  const snapshotOf = useCallback((value: ProfileState) => {
    return JSON.stringify({
      first_name: value.first_name,
      last_name: value.last_name,
      contact_email: value.contact_email,
      phone: value.phone,
      current_city: value.current_city,
      current_title: value.current_title,
      bio: value.bio,
      linkedin_url: value.linkedin_url,
      github_url: value.github_url,
      website_url: value.website_url,
      skills: value.skills,
      experience_entries: value.experience_entries,
      education_entries: value.education_entries,
      language_entries: value.language_entries,
      target_roles: value.target_roles,
      target_locations: value.target_locations,
      desired_salary: value.desired_salary,
      remote_preference: value.remote_preference,
      preferred_contract_types: value.preferred_contract_types,
      cv_text: value.cv_text,
    })
  }, [])

  const loadAnalysis = useCallback(async () => {
    setAnalysisLoading(true)
    try {
      const res = await fetch("/api/profile/analyze-cv")
      if (!res.ok) {
        setAnalysis(null)
        return null
      }
      const data = (await res.json()) as { analysis: CvAnalysisResponse | null }
      const next = data.analysis ?? null
      setAnalysis(next)
      return next
    } catch {
      setAnalysis(null)
      return null
    } finally {
      setAnalysisLoading(false)
    }
  }, [])

  const runCvAnalysis = useCallback(
    async (options?: { silent?: boolean }) => {
      setAnalyzing(true)
      try {
        const res = await fetch("/api/profile/analyze-cv", { method: "POST" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Analyse CV échouée")
        setAnalysis(data.analysis ?? null)
        if (!options?.silent) {
          toast.success("Analyse CV terminée")
          router.push("/profile-ai/optimize")
        }
        return data.analysis as CvAnalysisResponse | null
      } catch (error) {
        if (!options?.silent) {
          toast.error(error instanceof Error ? error.message : "Analyse CV échouée")
        }
        return null
      } finally {
        setAnalyzing(false)
      }
    },
    [router]
  )

  const persistHydratedProfile = useCallback(async (next: ProfileState) => {
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: next.first_name,
          last_name: next.last_name,
          contact_email: next.contact_email,
          phone: next.phone,
          current_city: next.current_city,
          current_title: next.current_title,
          bio: next.bio,
          linkedin_url: next.linkedin_url,
          github_url: next.github_url,
          website_url: next.website_url,
          skills: next.skills,
          experience_entries: next.experience_entries,
          education_entries: next.education_entries,
          language_entries: next.language_entries,
        }),
      })
    } catch {
      // UI already filled — user can still click Enregistrer
    }
  }, [])

  const fillProfileFromCv = useCallback(
    async (
      base: ProfileState,
      options?: { silent?: boolean }
    ): Promise<ProfileState | null> => {
      if (base.cv_text.trim().length < 200) {
        if (!options?.silent) {
          toast.error("CV trop court pour l’extraction (200 caractères min.)")
        }
        return null
      }

      setImportingPdf(true)
      try {
        const extractRes = await fetch("/api/profile/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: true, persist: true }),
        })
        const extractData = (await extractRes.json().catch(() => ({}))) as {
          draft?: ExtractDraft
          profile?: Partial<ProfileState>
          error?: string
          extracted?: boolean
        }

        if (!extractRes.ok) {
          throw new Error(extractData.error ?? "Extraction CV échouée")
        }

        let next: ProfileState = {
          ...base,
          ...(extractData.profile
            ? {
                first_name:
                  extractData.profile.first_name ?? base.first_name,
                last_name: extractData.profile.last_name ?? base.last_name,
                contact_email:
                  extractData.profile.contact_email ?? base.contact_email,
                phone: extractData.profile.phone ?? base.phone,
                current_city:
                  extractData.profile.current_city ?? base.current_city,
                current_title:
                  extractData.profile.current_title ?? base.current_title,
                bio: extractData.profile.bio ?? base.bio,
                linkedin_url:
                  extractData.profile.linkedin_url ?? base.linkedin_url,
                github_url:
                  extractData.profile.github_url ?? base.github_url,
                website_url:
                  extractData.profile.website_url ?? base.website_url,
                skills: extractData.profile.skills ?? base.skills,
                experience_entries:
                  extractData.profile.experience_entries ??
                  base.experience_entries,
                education_entries:
                  extractData.profile.education_entries ??
                  base.education_entries,
                language_entries:
                  extractData.profile.language_entries ??
                  base.language_entries,
                cv_file_name:
                  extractData.profile.cv_file_name ?? base.cv_file_name,
                cv_file_updated_at:
                  extractData.profile.cv_file_updated_at ??
                  base.cv_file_updated_at,
              }
            : {}),
          cv_text: base.cv_text,
        }

        if (extractData.draft) {
          next = mergeExtractDraft(next, extractData.draft)
        }

        setProfile(next)
        setSavedSnapshot(snapshotOf(next))
        setActiveSection("experiences")

        if (!options?.silent) {
          const experienceCount = next.experience_entries.length
          if (extractData.error) {
            toast.error(
              "Extraction partielle — complète les champs manquants manuellement"
            )
          } else if (experienceCount > 0 || next.first_name || next.last_name) {
            toast.success(
              experienceCount > 0
                ? `Profil rempli · ${experienceCount} expérience${experienceCount > 1 ? "s" : ""}`
                : "Profil rempli depuis le CV"
            )
          } else {
            toast.error(
              "Aucune information exploitable trouvée dans le CV"
            )
          }
        }

        return next
      } catch (error) {
        if (!options?.silent) {
          toast.error(
            error instanceof Error ? error.message : "Extraction CV échouée"
          )
        }
        return null
      } finally {
        setImportingPdf(false)
      }
    },
    [snapshotOf]
  )

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/profile")
        if (!res.ok) throw new Error("Impossible de charger le profil")
        const data = await res.json()
        const loaded = {
          ...emptyProfile(),
          ...(data.profile ?? {}),
        } as ProfileState
        const hydrated = hydrateFromExtractedCv(loaded)
        setProfile(hydrated)
        setSavedSnapshot(snapshotOf(hydrated))

        // Snapshot had data but DB columns were empty → persist so reload stays filled
        if (
          isProfileStructurallyEmpty(loaded) &&
          !isProfileStructurallyEmpty(hydrated)
        ) {
          void persistHydratedProfile(hydrated)
        }

        // CV text exists but nothing structured yet → run OCR/extract + fill inputs
        if (
          isProfileStructurallyEmpty(hydrated) &&
          hydrated.cv_text.trim().length >= 200 &&
          !autoFillStarted.current
        ) {
          autoFillStarted.current = true
          toast.message("Remplissage du profil depuis ton CV…")
          void fillProfileFromCv(hydrated, { silent: false })
        }
      } catch {
        const fallback = emptyProfile()
        setProfile(fallback)
        setSavedSnapshot(snapshotOf(fallback))
      } finally {
        setLoading(false)
      }
    }
    void load()
    void loadAnalysis()
  }, [
    fillProfileFromCv,
    loadAnalysis,
    persistHydratedProfile,
    snapshotOf,
  ])

  useEffect(() => {
    if (loading || analysisLoading || analyzing || autoAnalyzeStarted.current) return
    if (profile.cv_text.trim().length < 200) return
    if (analysis && !analysis.is_stale) return
    autoAnalyzeStarted.current = true
    void runCvAnalysis({ silent: true })
  }, [
    loading,
    analysisLoading,
    analyzing,
    profile.cv_text,
    analysis,
    runCvAnalysis,
  ])

  const hasUnsaved = snapshotOf(profile) !== savedSnapshot
  const hasSavedCv = profile.cv_text.trim().length > 0
  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Ton profil"
  const title = displayTitle(profile)
  const sortedExperiences = useMemo(
    () => sortByRecency(profile.experience_entries),
    [profile.experience_entries]
  )
  const sortedEducation = useMemo(
    () => sortByRecency(profile.education_entries),
    [profile.education_entries]
  )

  const updateField = <K extends keyof ProfileState>(
    key: K,
    value: ProfileState[K]
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const handleAddLanguage = (rawLanguage?: string) => {
    const language = (rawLanguage ?? languageDraft).trim()
    if (!language) return
    if (
      profile.language_entries.some(
        (entry) => entry.language.toLowerCase() === language.toLowerCase()
      )
    ) {
      toast.error("Cette langue est déjà ajoutée")
      return
    }
    updateField("language_entries", [
      ...profile.language_entries,
      { ...emptyLanguageEntry(), language },
    ])
    setLanguageDraft("")
    setLanguageListOpen(false)
  }

  const skillOptions = useMemo(
    () =>
      [
        ...new Set([...PROFILE_SKILL_SUGGESTIONS, ...profile.skills]),
      ] as string[],
    [profile.skills]
  )
  const roleOptions = useMemo(
    () =>
      [
        ...new Set([...PROFILE_ROLE_SUGGESTIONS, ...profile.target_roles]),
      ] as string[],
    [profile.target_roles]
  )
  const locationOptions = useMemo(
    () =>
      [
        ...new Set([...LOCATION_SUGGESTIONS, ...profile.target_locations]),
      ] as string[],
    [profile.target_locations]
  )
  const languageSuggestions = useMemo(() => {
    const taken = new Set(
      profile.language_entries.map((entry) => entry.language.toLowerCase())
    )
    const q = languageDraft
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
    return PROFILE_LANGUAGE_SUGGESTIONS.filter((language) => {
      if (taken.has(language.toLowerCase())) return false
      if (!q) return true
      const hay = language
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [languageDraft, profile.language_entries])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          contact_email: profile.contact_email,
          phone: profile.phone,
          current_city: profile.current_city,
          current_title: profile.current_title,
          bio: profile.bio,
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
          cv_text: profile.cv_text,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        profile?: ProfileState
      }
      if (!res.ok) throw new Error(data.error ?? "Enregistrement échoué")
      const next = { ...emptyProfile(), ...(data.profile ?? profile) }
      setProfile(next)
      setSavedSnapshot(snapshotOf(next))
      toast.success("Profil enregistré")
      if (next.cv_text.trim().length >= 200) {
        autoAnalyzeStarted.current = true
        await runCvAnalysis({ silent: true })
      } else {
        await loadAnalysis()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement échoué")
    } finally {
      setSaving(false)
    }
  }

  const handleImportPdf = async (fileOverride?: File | null) => {
    const file = fileOverride ?? pdfFile
    if (!file) {
      toast.error("Sélectionne d’abord un fichier.")
      return
    }
    setImportingPdf(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/profile/import-cv", {
        method: "POST",
        body: formData,
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        extracted_text?: string
        analysis?: CvAnalysisResponse | null
        analysis_error?: string | null
        profile?: ProfileState
        cv_file_name?: string | null
        cv_file_updated_at?: string | null
      }
      if (!res.ok) throw new Error(data.error ?? "Import CV échoué")

      const text = data.extracted_text ?? data.profile?.cv_text ?? profile.cv_text
      let next: ProfileState = {
        ...profile,
        ...(data.profile ?? {}),
        cv_text: text,
        cv_file_name: data.cv_file_name ?? data.profile?.cv_file_name ?? profile.cv_file_name,
        cv_file_updated_at:
          data.cv_file_updated_at ??
          data.profile?.cv_file_updated_at ??
          profile.cv_file_updated_at,
      }

      // Structured fill: identity, experiences, education, skills, languages
      if (text.trim().length >= 200) {
        const extractRes = await fetch("/api/profile/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: true, persist: true }),
        })
        const extractData = (await extractRes.json().catch(() => ({}))) as {
          draft?: ExtractDraft
          profile?: Partial<ProfileState>
          error?: string
          extracted?: boolean
        }

        if (extractData.profile) {
          next = {
            ...next,
            first_name: extractData.profile.first_name ?? next.first_name,
            last_name: extractData.profile.last_name ?? next.last_name,
            contact_email:
              extractData.profile.contact_email ?? next.contact_email,
            phone: extractData.profile.phone ?? next.phone,
            current_city:
              extractData.profile.current_city ?? next.current_city,
            current_title:
              extractData.profile.current_title ?? next.current_title,
            linkedin_url:
              extractData.profile.linkedin_url ?? next.linkedin_url,
            github_url: extractData.profile.github_url ?? next.github_url,
            website_url: extractData.profile.website_url ?? next.website_url,
            skills: extractData.profile.skills ?? next.skills,
            experience_entries:
              extractData.profile.experience_entries ?? next.experience_entries,
            education_entries:
              extractData.profile.education_entries ?? next.education_entries,
            language_entries:
              extractData.profile.language_entries ?? next.language_entries,
            cv_text: text,
          }
        }

        if (extractData.draft) {
          next = mergeExtractDraft(next, extractData.draft)
        }

        setProfile(next)
        setSavedSnapshot(snapshotOf(next))
        setPdfFile(null)
        setCvToolsOpen(false)
        setActiveSection("experiences")
        autoFillStarted.current = true

        const experienceCount = next.experience_entries.length
        if (extractData.error) {
          toast.success("CV importé")
          toast.error(
            "Extraction partielle — complète les cartes manquantes manuellement"
          )
        } else if (extractData.extracted) {
          toast.success(
            experienceCount > 0
              ? `CV importé · ${experienceCount} expérience${experienceCount > 1 ? "s" : ""} préremplie${experienceCount > 1 ? "s" : ""}`
              : "CV importé et profil prérempli"
          )
        } else {
          toast.success("CV importé")
        }
      } else {
        setProfile(next)
        setSavedSnapshot(snapshotOf(next))
        setPdfFile(null)
        setCvToolsOpen(true)
        setCvTextOpen(true)
        toast.success("CV importé")
      }

      if (data.analysis) {
        setAnalysis(data.analysis)
      } else {
        await loadAnalysis()
        if (data.analysis_error) {
          toast.error(data.analysis_error)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import CV échoué")
    } finally {
      setImportingPdf(false)
    }
  }

  const handleAnalyze = async () => {
    await runCvAnalysis({ silent: false })
  }

  const handleNavClick = (sectionId: NavSectionId) => {
    setActiveSection(sectionId)
  }

  const handleSaveExperience = (entry: ProfileExperienceEntry) => {
    const exists = profile.experience_entries.some((item) => item.id === entry.id)
    updateField(
      "experience_entries",
      exists
        ? profile.experience_entries.map((item) =>
            item.id === entry.id ? entry : item
          )
        : [...profile.experience_entries, entry]
    )
    toast.success(exists ? "Expérience mise à jour" : "Expérience ajoutée")
  }

  const handleSaveEducation = (entry: ProfileEducationEntry) => {
    const exists = profile.education_entries.some((item) => item.id === entry.id)
    updateField(
      "education_entries",
      exists
        ? profile.education_entries.map((item) =>
            item.id === entry.id ? entry : item
          )
        : [...profile.education_entries, entry]
    )
    toast.success(exists ? "Formation mise à jour" : "Formation ajoutée")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[28rem] rounded-2xl lg:col-span-1" />
          <Skeleton className="h-[28rem] rounded-2xl lg:col-span-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Profil</h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Ta fiche candidat privée — expériences, formation et préférences,
              avec le CV en outils secondaires.
            </p>
          </div>
          <PageHelpButton pageId="cv" />
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={hasSavedCv ? "secondary" : "outline"}>
            {hasSavedCv ? "CV enregistré" : "CV à compléter"}
          </Badge>
          <span className="text-base text-muted-foreground">
            {hasUnsaved ? "Modifications non enregistrées" : "À jour"}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <input
              ref={headerPdfInputRef}
              type="file"
              accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                e.target.value = ""
                if (file) void handleImportPdf(file)
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={importingPdf}
              onClick={() => headerPdfInputRef.current?.click()}
            >
              <FileUp className="mr-2 h-4 w-4" />
              {importingPdf ? "Import…" : "Importer un CV"}
            </Button>
            {hasSavedCv && profile.cv_text.trim().length >= 200 ? (
              <Button
                type="button"
                variant="outline"
                disabled={importingPdf}
                onClick={() => void fillProfileFromCv(profile)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {importingPdf ? "Remplissage…" : "Remplir depuis le CV"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={analyzing || profile.cv_text.trim().length < 200}
              onClick={() => void handleAnalyze()}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {analyzing ? "Analyse…" : "Analyser"}
            </Button>
            <Button
              type="button"
              disabled={saving || !hasUnsaved}
              onClick={() => void handleSave()}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column (~1/3) */}
        <aside className="space-y-6 lg:col-span-1">
          <section className="rounded-2xl border border-border p-6">
            <div className="flex flex-col items-start gap-4">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-2xl font-semibold"
                aria-hidden
              >
                {initialsFromName(profile.first_name, profile.last_name)}
              </div>
              <div className="w-full space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-first-name">Prénom</Label>
                    <Input
                      id="profile-first-name"
                      value={profile.first_name ?? ""}
                      onChange={(e) =>
                        updateField("first_name", e.target.value || null)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-last-name">Nom</Label>
                    <Input
                      id="profile-last-name"
                      value={profile.last_name ?? ""}
                      onChange={(e) =>
                        updateField("last_name", e.target.value || null)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-title">Titre</Label>
                  <Input
                    id="profile-title"
                    value={profile.current_title ?? ""}
                    onChange={(e) =>
                      updateField("current_title", e.target.value || null)
                    }
                    placeholder={title}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-city">Ville</Label>
                  <SearchableSelect
                    id="profile-city"
                    options={
                      profile.current_city &&
                      !(FRANCE_CITIES as readonly string[]).includes(
                        profile.current_city
                      )
                        ? [profile.current_city, ...FRANCE_CITIES]
                        : [...FRANCE_CITIES]
                    }
                    value={profile.current_city}
                    onChange={(city) => updateField("current_city", city)}
                    placeholder="Rechercher une ville…"
                    emptyOptionLabel="Aucune ville"
                    allowCustom
                  />
                </div>
                <p className="text-base text-muted-foreground">
                  Affiché comme <span className="font-medium text-foreground">{fullName}</span>
                  {" · "}
                  <span className="font-medium text-foreground">{title}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Label htmlFor="profile-bio">Bio</Label>
              <Textarea
                id="profile-bio"
                value={profile.bio ?? ""}
                onChange={(e) => updateField("bio", e.target.value || null)}
                rows={5}
                placeholder="Quelques lignes sur ton parcours et ce que tu recherches…"
                className="resize-y text-base leading-7"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold">Compétences & expertises</h2>
            <p className="mt-1 text-base text-muted-foreground">
              Cherche dans la liste ou ajoute librement une compétence.
            </p>
            <div className="mt-4">
              <SearchableMultiSelect
                id="profile-skills"
                options={skillOptions}
                values={profile.skills}
                onChange={(skills) => updateField("skills", skills)}
                placeholder="Ex. Figma, Product discovery…"
                addButtonLabel="Ajouter"
                emptyLabel="Aucune compétence pour l’instant."
                allowCustom
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold">Langues</h2>
            <p className="mt-1 text-base text-muted-foreground">
              Choisis une langue dans la liste puis le niveau.
            </p>
            <div className="relative mt-4">
              <div className="flex gap-2">
                <Input
                  value={languageDraft}
                  onChange={(e) => {
                    setLanguageDraft(e.target.value)
                    setLanguageListOpen(true)
                  }}
                  onFocus={() => setLanguageListOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setLanguageListOpen(false), 150)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (languageSuggestions[0]) {
                        handleAddLanguage(languageSuggestions[0])
                        return
                      }
                      handleAddLanguage()
                    }
                    if (e.key === "Escape") setLanguageListOpen(false)
                  }}
                  placeholder="Ex. Français, Anglais…"
                  aria-label="Ajouter une langue"
                  aria-autocomplete="list"
                  aria-expanded={languageListOpen}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleAddLanguage()}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
              {languageListOpen &&
              (languageSuggestions.length > 0 || languageDraft.trim()) ? (
                <ul
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-base shadow-md"
                >
                  {languageSuggestions.map((language) => (
                    <li key={language}>
                      <button
                        type="button"
                        role="option"
                        className="flex w-full rounded-sm px-2 py-1.5 text-left hover:bg-muted"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleAddLanguage(language)}
                      >
                        {language}
                      </button>
                    </li>
                  ))}
                  {languageDraft.trim() &&
                  !PROFILE_LANGUAGE_SUGGESTIONS.some(
                    (item) =>
                      item.toLowerCase() === languageDraft.trim().toLowerCase()
                  ) &&
                  !profile.language_entries.some(
                    (entry) =>
                      entry.language.toLowerCase() ===
                      languageDraft.trim().toLowerCase()
                  ) ? (
                    <li>
                      <button
                        type="button"
                        className="flex w-full rounded-sm px-2 py-1.5 text-left hover:bg-muted"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleAddLanguage()}
                      >
                        Ajouter « {languageDraft.trim()} »
                      </button>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
            <ul className="mt-3 space-y-2">
              {profile.language_entries.length === 0 ? (
                <li className="text-base text-muted-foreground">
                  Aucune langue pour l’instant.
                </li>
              ) : (
                profile.language_entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2"
                  >
                    <span className="min-w-24 flex-1 font-medium">{entry.language}</span>
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
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold">Liens</h2>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="profile-linkedin" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  LinkedIn
                </Label>
                <Input
                  id="profile-linkedin"
                  value={profile.linkedin_url ?? ""}
                  onChange={(e) =>
                    updateField("linkedin_url", e.target.value || null)
                  }
                  placeholder="https://linkedin.com/in/…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-github" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  GitHub
                </Label>
                <Input
                  id="profile-github"
                  value={profile.github_url ?? ""}
                  onChange={(e) =>
                    updateField("github_url", e.target.value || null)
                  }
                  placeholder="https://github.com/…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Site
                </Label>
                <Input
                  id="profile-website"
                  value={profile.website_url ?? ""}
                  onChange={(e) =>
                    updateField("website_url", e.target.value || null)
                  }
                  placeholder="https://…"
                />
              </div>
            </div>
          </section>
        </aside>

        {/* Right column (~2/3) */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <nav
            aria-label="Sections du profil"
            className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-background p-2"
            role="tablist"
          >
            {NAV_SECTIONS.map((section) => {
              const Icon = section.icon
              const active = activeSection === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  id={`profile-tab-${section.id}`}
                  aria-controls={`profile-panel-${section.id}`}
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => handleNavClick(section.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-base leading-6 transition-colors",
                    active
                      ? "bg-primary/15 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              )
            })}
          </nav>

          {activeSection === "experiences" ? (
          <section
            id="profile-panel-experiences"
            role="tabpanel"
            aria-labelledby="profile-tab-experiences"
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Expériences</h2>
              <Button
                type="button"
                onClick={() => {
                  setEditingExperience(null)
                  setExperienceDialogOpen(true)
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Ajouter
              </Button>
            </div>
            {sortedExperiences.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-6 text-base text-muted-foreground">
                Aucune expérience pour l’instant. Importe ton CV pour préremplir
                les cartes.
              </p>
            ) : (
              <div className="grid gap-4">
                {sortedExperiences.map((experience) => (
                  <article
                    key={experience.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-semibold"
                        aria-hidden
                      >
                        {(experience.organization || experience.title || "?")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold leading-6">
                              {experience.title || "Poste"}
                            </h3>
                            <p className="font-medium leading-6">
                              {experience.organization || "Entreprise"}
                            </p>
                            <p className="text-base leading-6 text-muted-foreground">
                              {[
                                formatPeriod(experience),
                                experience.employmentType,
                                experience.location,
                                LOCATION_TYPE_OPTIONS.find(
                                  (option) =>
                                    option.value === experience.locationType
                                )?.label,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Modifier ${experience.title}`}
                              onClick={() => {
                                setEditingExperience(experience)
                                setExperienceDialogOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Supprimer ${experience.title}`}
                              onClick={() =>
                                updateField(
                                  "experience_entries",
                                  profile.experience_entries.filter(
                                    (item) => item.id !== experience.id
                                  )
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {experience.highlights.trim() ? (
                          <p className="mt-3 whitespace-pre-wrap text-base leading-6 text-muted-foreground">
                            {experience.highlights.trim()}
                          </p>
                        ) : null}
                        {experience.skills.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {experience.skills.map((skill) => (
                              <Badge key={skill} variant="tag">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          ) : null}

          {activeSection === "education" ? (
          <section
            id="profile-panel-education"
            role="tabpanel"
            aria-labelledby="profile-tab-education"
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Formation</h2>
              <Button
                type="button"
                onClick={() => {
                  setEditingEducation(null)
                  setEducationDialogOpen(true)
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Ajouter
              </Button>
            </div>
            {sortedEducation.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-6 text-base text-muted-foreground">
                Aucune formation pour l’instant.
              </p>
            ) : (
              <div className="grid gap-4">
                {sortedEducation.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-semibold"
                        aria-hidden
                      >
                        {(entry.school || entry.name || "?")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <h3 className="text-lg font-semibold leading-6">
                              {entry.name || "Formation"}
                            </h3>
                            <p className="font-medium leading-6">
                              {[entry.school, entry.level]
                                .filter(Boolean)
                                .join(" · ") || "Établissement"}
                            </p>
                            <p className="text-base leading-6 text-muted-foreground">
                              {formatPeriod(entry)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Modifier ${entry.name}`}
                              onClick={() => {
                                setEditingEducation(entry)
                                setEducationDialogOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
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
                        </div>
                        {entry.description.trim() ? (
                          <p className="mt-3 whitespace-pre-wrap text-base leading-6 text-muted-foreground">
                            {entry.description.trim()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          ) : null}

          {activeSection === "prefs" ? (
          <section
            id="profile-panel-prefs"
            role="tabpanel"
            aria-labelledby="profile-tab-prefs"
            className="space-y-4 rounded-2xl border border-border p-6"
          >
            <h2 className="text-xl font-semibold">Préférences job</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-draft">Intitulés recherchés</Label>
                <SearchableMultiSelect
                  id="role-draft"
                  options={roleOptions}
                  values={profile.target_roles}
                  onChange={(roles) => updateField("target_roles", roles)}
                  placeholder="Product Owner"
                  addButtonLabel="Ajouter"
                  emptyLabel="Aucun intitulé pour l’instant."
                  allowCustom
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-draft">Lieux souhaités</Label>
                <SearchableMultiSelect
                  id="location-draft"
                  options={locationOptions}
                  values={profile.target_locations}
                  onChange={(locations) =>
                    updateField("target_locations", locations)
                  }
                  placeholder="Paris, Remote…"
                  addButtonLabel="Ajouter"
                  emptyLabel="Aucun lieu pour l’instant."
                  allowCustom
                />
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
                        onClick={() => {
                          updateField(
                            "preferred_contract_types",
                            selected
                              ? profile.preferred_contract_types.filter(
                                  (item) => item !== contract
                                )
                              : [...profile.preferred_contract_types, contract]
                          )
                        }}
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
                <Label htmlFor="salary">Salaire brut minimum / an (€)</Label>
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
            </div>
          </section>
          ) : null}

          {/* Secondary CV tools */}
          <section
            id="cv-tools"
            className="scroll-mt-40 rounded-2xl border border-border"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              onClick={() => setCvToolsOpen((open) => !open)}
              aria-expanded={cvToolsOpen}
              aria-controls="cv-tools-panel"
            >
              <div className="min-w-0 space-y-1">
                <p className="flex items-center gap-2 text-base font-semibold">
                  <FileText className="h-4 w-4" />
                  Outils CV
                </p>
                <p className="text-base text-muted-foreground">
                  Import PDF, texte brut et analyse ATS (secondaire).
                </p>
              </div>
              {cvToolsOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>

            {cvToolsOpen ? (
              <div
                id="cv-tools-panel"
                className="space-y-6 border-t border-border px-5 pb-5 pt-4"
              >
                <div className="space-y-3 rounded-xl border border-border p-4">
                  <Label className="text-base font-medium">Importer un CV</Label>
                  {profile.cv_file_name ? (
                    <p className="text-base text-muted-foreground">
                      Fichier actuel : {profile.cv_file_name}
                      {profile.cv_file_updated_at
                        ? ` · ${new Date(profile.cv_file_updated_at).toLocaleString("fr-FR")}`
                        : null}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                      type="file"
                      accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                      onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                      aria-label="Choisir un fichier CV"
                      className="sm:flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleImportPdf()}
                      disabled={importingPdf || !pdfFile}
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      {importingPdf ? "Import…" : "Importer"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    onClick={() => setCvTextOpen((open) => !open)}
                    aria-expanded={cvTextOpen}
                    aria-controls="cv-text-panel"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">Texte du CV</p>
                      <p className="truncate text-base text-muted-foreground">
                        {profile.cv_text.trim().length > 0
                          ? `${profile.cv_text.trim().length} caractères`
                          : "Vide — ouvre pour coller le texte"}
                      </p>
                    </div>
                    {cvTextOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {cvTextOpen ? (
                    <div
                      id="cv-text-panel"
                      className="border-t border-border px-4 pb-4 pt-3"
                    >
                      <Textarea
                        value={profile.cv_text}
                        onChange={(e) => updateField("cv_text", e.target.value)}
                        rows={10}
                        placeholder="Colle ici le texte de ton CV…"
                        className="max-h-[24rem] resize-y text-base leading-7"
                      />
                    </div>
                  ) : null}
                </div>

                <CvAnalysisPanel
                  analysis={analysis}
                  analyzing={analyzing}
                  loading={analysisLoading}
                  hasUnsavedCv={hasUnsaved}
                  hasSavedCv={hasSavedCv}
                  onAnalyze={handleAnalyze}
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <ExperienceDialog
        open={experienceDialogOpen}
        onOpenChange={setExperienceDialogOpen}
        initial={editingExperience}
        onSave={handleSaveExperience}
      />
      <EducationDialog
        open={educationDialogOpen}
        onOpenChange={setEducationDialogOpen}
        initial={editingEducation}
        onSave={handleSaveEducation}
      />
    </div>
  )
}
