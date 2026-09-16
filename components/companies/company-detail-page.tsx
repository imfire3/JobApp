"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Briefcase,
  Check,
  Copy,
  Globe,
  Loader2,
  MapPin,
  Mail,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react"
import { AppShell } from "@/components/layout/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PIPELINE_STATUS_LABEL,
  companySizeLabel,
} from "@/components/companies/company-labels"
import type {
  Company,
  CompanyPipelineStatus,
  OutreachMessage,
} from "@/types"
import { toast } from "sonner"

const STATUS_OPTIONS: CompanyPipelineStatus[] = [
  "to_contact",
  "contact_found",
  "message_prepared",
  "application_sent",
  "follow_up_pending",
  "response_received",
  "interview",
  "refused",
  "opportunity",
]

export function CompanyDetailPage({ companyId }: { companyId: string }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<CompanyPipelineStatus>("to_contact")
  const [notes, setNotes] = useState("")
  const [nextAction, setNextAction] = useState("")
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [messages, setMessages] = useState<OutreachMessage[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])

  const DEFAULT_PROJECTS = [
    { id: "jobtracker", name: "JobTracker", description: "CRM de recherche d'emploi avec analyse IA, scoring et génération de lettres" },
    { id: "maplaceauport", name: "Ma Place au Port", description: "Plateforme d'orientation et d'insertion professionnelle" },
    { id: "catdex", name: "CatDex", description: "Application de catalogage et découverte" },
  ]

  async function load() {
    try {
      const res = await fetch(`/api/companies/${companyId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Impossible de charger l’entreprise")
      const company = data.company as Company
      setCompany(company)
      setStatus(company.status)
      setNotes(company.notes ?? "")
      setNextAction(company.next_action_at ? company.next_action_at.slice(0, 10) : "")
      setMessages(company.outreach_messages ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger l’entreprise")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data bootstrap on mount
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- data bootstrap on mount
  }, [companyId])

  async function handleSave() {
    if (!company) return
    setSaving(true)
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes: notes.trim() || null,
          next_action_at: nextAction ? new Date(nextAction).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Impossible d’enregistrer")
      setCompany((prev) => (prev ? { ...prev, ...data.company } : prev))
      toast.success("Fiche enregistrée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!company) return
    if (!window.confirm(`Supprimer « ${company.name} » définitivement ?`)) return
    try {
      const res = await fetch(`/api/companies/${company.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Impossible de supprimer")
      }
      toast.success("Entreprise supprimée")
      window.location.href = "/companies"
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer")
    }
  }

  async function handleGenerate() {
    if (!company) return
    setGenerating(true)
    try {
      const res = await fetch(`/api/companies/${company.id}/outreach`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Impossible de générer le message")
      setMessages((prev) => [...data.messages, ...prev])
      setCompany((prev) => (prev ? { ...prev, status: "message_prepared" } : prev))
      setStatus("message_prepared")
      toast.success("Email + message LinkedIn générés")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de générer le message"
      )
    } finally {
      setGenerating(false)
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copié dans le presse-papiers")
    } catch {
      toast.error("Impossible de copier")
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-base text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de la fiche…
        </div>
      </AppShell>
    )
  }

  if (!company) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Link
            href="/companies"
            className="inline-flex items-center gap-1 text-base text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux entreprises
          </Link>
          <p className="text-base text-muted-foreground">Entreprise introuvable.</p>
        </div>
      </AppShell>
    )
  }

  const contacts = company.contacts ?? []

  return (
    <AppShell>
      <div className="space-y-6">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1 text-base text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux entreprises
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-base font-medium text-foreground underline-offset-4 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  {company.domain}
                </a>
              ) : (
                <span className="text-base text-muted-foreground">{company.domain}</span>
              )}
              <span className="inline-flex items-center gap-1 text-base text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {company.headquarters ?? "Siège non renseigné"}
              </span>
              <Badge variant="outline">
                {companySizeLabel(company.size_min, company.size_max)}
              </Badge>
              {company.remote_ok ? <Badge variant="outline">Remote</Badge> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {company.sectors.map((sector) => (
                <Badge key={sector} variant="secondary">
                  {sector}
                </Badge>
              ))}
            </div>
          </div>
          <Badge className="h-auto w-fit text-sm">
            {PIPELINE_STATUS_LABEL[status]}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Pourquoi cette entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {company.ai_enriched?.activity ? (
              <p className="text-base leading-relaxed text-muted-foreground">
                {company.ai_enriched.activity}
              </p>
            ) : (
              <p className="text-base text-muted-foreground">
                {company.description ?? "Aucune description disponible."}
              </p>
            )}
            {company.ai_enriched?.products && company.ai_enriched.products.length > 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">Produits</p>
                <div className="flex flex-wrap gap-2">
                  {company.ai_enriched.products.map((product) => (
                    <Badge key={product} variant="outline">
                      {product}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {(company.ai_enriched?.keywords?.length ?? 0) > 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">Mots-clés</p>
                <div className="flex flex-wrap gap-2">
                  {(company.ai_enriched?.keywords ?? []).map((keyword) => (
                    <Badge key={keyword} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {company.match_score != null ? (
              <p className="text-sm text-muted-foreground">
                Score de match avec ton profil : <Badge>{company.match_score} / 100</Badge>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contacts potentiels
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Aucun contact identifié pour l’instant.
              </p>
            ) : (
              <ul className="space-y-3">
                {contacts.map((contact) => (
                  <li key={contact.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="text-base font-medium">
                        {contact.name || "Fonction (nom à retrouver)"}
                      </p>
                      <p className="text-sm text-muted-foreground">{contact.role_title}</p>
                      {contact.relevance_factors.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                          {contact.relevance_factors.map((factor) => (
                            <li key={factor}>· {factor}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      Pertinence {contact.relevance_score ?? "—"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Les contacts « mock » sont des cibles génériques : retrouve le nom du bon
              interlocuteur avant d’envoyer.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Projets à mettre en avant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sélectionne les projets que tu veux mettre en avant dans ta candidature.
            </p>
            {DEFAULT_PROJECTS.map((project) => (
              <label
                key={project.id}
                className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedProjects.includes(project.id)}
                  onCheckedChange={(checked) => {
                    setSelectedProjects((prev) =>
                      checked
                        ? [...prev, project.id]
                        : prev.filter((id) => id !== project.id)
                    )
                  }}
                />
                <div className="min-w-0">
                  <p className="text-base font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                </div>
              </label>
            ))}
            {selectedProjects.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {selectedProjects.length} projet(s) sélectionné(s) — l&apos;IA les inclura dans l&apos;email si pertinent.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Candidature spontanée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base text-muted-foreground">
              Génère un email et un message LinkedIn personnalisés. L’IA cite une vraie
              information sur l’entreprise et n’invente jamais d’expérience.
            </p>
            <Button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Générer email + LinkedIn
                </>
              )}
            </Button>

            {messages.length > 0 ? (
              <ul className="space-y-4">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className="space-y-2 rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">
                        {message.kind === "email" ? "Email" : "LinkedIn"}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void copyText(message.body)}
                      >
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Copier
                      </Button>
                    </div>
                    {message.subject ? (
                      <p className="text-base font-medium">{message.subject}</p>
                    ) : null}
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
                      {message.body}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Suivi de prospection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as CompanyPipelineStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {PIPELINE_STATUS_LABEL[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-next-action">Prochaine action</Label>
                <Input
                  id="company-next-action"
                  type="date"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-notes">Notes</Label>
              <Textarea
                id="company-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="À qui écrire, ce que tu envoies, retours…"
              />
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => void handleDelete()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}