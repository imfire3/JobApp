import type { ReactNode } from "react"
import {
  ArrowDown,
  Bell,
  Briefcase,
  LayoutGrid,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const MockJobCard = ({
  company,
  title,
  meta,
}: {
  company: string
  title: string
  meta?: string
}) => (
  <div className="rounded-lg border bg-background p-2.5 shadow-sm">
    <p className="truncate text-xs font-medium leading-tight">{title}</p>
    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{company}</p>
    {meta ? (
      <p className="mt-1 truncate text-[10px] text-muted-foreground">{meta}</p>
    ) : null}
  </div>
)

export const BoardIllustration = () => {
  const columns = [
    {
      label: "À postuler",
      cards: [
        { company: "Notion", title: "Product Designer", meta: "Paris · CDI" },
        { company: "Doctolib", title: "PM Junior", meta: "Remote" },
      ],
    },
    {
      label: "Candidature envoyée",
      cards: [
        { company: "Alan", title: "Growth Manager", meta: "Il y a 2 j" },
      ],
    },
    {
      label: "Entretien",
      cards: [
        { company: "Spotify", title: "Data Analyst", meta: "Jeudi 14h" },
      ],
    },
    {
      label: "Offre",
      cards: [{ company: "Swile", title: "Ops Lead", meta: "À répondre" }],
    },
  ]

  return (
    <div
      className="w-full overflow-hidden rounded-2xl border bg-muted/40 p-3 sm:p-4"
      aria-hidden
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Board candidatures
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {columns.map((column) => (
          <div key={column.label} className="min-w-0 space-y-2">
            <div className="rounded-lg border bg-card px-2 py-1.5">
              <p className="truncate text-[11px] font-semibold tracking-tight">
                {column.label}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {column.cards.length}
              </p>
            </div>
            <div className="space-y-1.5">
              {column.cards.map((card) => (
                <MockJobCard key={`${column.label}-${card.title}`} {...card} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const WorkflowStep = ({
  label,
  children,
  highlight,
}: {
  label: string
  children: ReactNode
  highlight?: boolean
}) => (
  <div
    className={cn(
      "rounded-xl border bg-card p-3",
      highlight && "border-primary/40 bg-primary/5"
    )}
  >
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    {children}
  </div>
)

export const AiWorkflowIllustration = () => (
  <div className="w-full space-y-2" aria-hidden>
    <WorkflowStep label="Offre d’emploi">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
          AL
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium leading-tight">Alan</p>
          <p className="text-xs text-foreground">Product Manager</p>
          <p className="text-[11px] text-muted-foreground">
            Paris · 55–65k € · CDI
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            welcometothejungle.com/jobs/…
          </p>
        </div>
      </div>
    </WorkflowStep>

    <div className="flex justify-center">
      <ArrowDown className="h-4 w-4 text-muted-foreground" />
    </div>

    <WorkflowStep label="Analyse IA" highlight>
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-foreground" />
        <span className="font-medium">Extraction des infos clés</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="text-[10px]">
          Entreprise
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          Poste
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          Localisation
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          Salaire
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          Description
        </Badge>
      </div>
    </WorkflowStep>

    <div className="flex justify-center">
      <ArrowDown className="h-4 w-4 text-muted-foreground" />
    </div>

    <WorkflowStep label="Candidature créée">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Product Manager · Alan</p>
          <p className="text-[11px] text-muted-foreground">Pré-remplie · À revoir</p>
        </div>
        <Badge className="shrink-0 text-[10px]">À postuler</Badge>
      </div>
    </WorkflowStep>
  </div>
)

export const BenefitsIllustration = () => {
  const items = [
    {
      icon: LayoutGrid,
      title: "Suivi clair",
      body: "Visualise immédiatement où en est chaque candidature.",
    },
    {
      icon: Sparkles,
      title: "Candidatures enrichies par l’IA",
      body: "CV, informations de l’offre et données utiles sont regroupés au même endroit.",
    },
    {
      icon: Bell,
      title: "Ne rate plus aucune relance",
      body: "Garde une vue claire sur les candidatures qui nécessitent une action.",
    },
  ]

  return (
    <div className="grid w-full gap-2.5 sm:gap-3" aria-hidden>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.title} size="sm" className="border bg-card">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted/60">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-1 text-left">
                <CardTitle className="text-sm">{item.title}</CardTitle>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            </CardHeader>
          </Card>
        )
      })}
      <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-muted-foreground">
        <Briefcase className="h-3.5 w-3.5" />
        Board · IA · Relances
      </div>
    </div>
  )
}
