"use client"

import Link from "next/link"
import { Building2, ChevronRight, Globe, MapPin, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  PIPELINE_STATUS_LABEL,
  companySizeLabel,
} from "@/components/companies/company-labels"
import type { Company } from "@/types"

export function CompanyCard({
  company,
  onDelete,
}: {
  company: Company
  onDelete?: (companyId: string) => void
}) {
  const locations = company.locations.length ? company.locations : []
  const locationLabel =
    locations.length > 0
      ? locations.slice(0, 2).join(", ")
      : company.headquarters ?? "Localisation inconnue"

  return (
    <Card className="h-full rounded-app-surface border-app-border bg-app-surface text-app-text shadow-none transition-colors hover:border-app-border-strong hover:bg-app-surface-raised">
      <CardContent className="flex h-full flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-app-control border border-app-border bg-app-control">
              <Building2 className="size-4 text-app-text-subtle" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/companies/${company.id}`}
                className="line-clamp-2 text-sm font-medium leading-5 text-app-text-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary"
              >
                {company.name}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-4 text-app-text-secondary">
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                  >
                    <Globe className="size-3.5" aria-hidden />
                    Site de l’entreprise
                  </a>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span className="line-clamp-1">{locationLabel}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-app-control text-app-text-secondary hover:bg-app-control hover:text-app-danger"
                aria-label={`Supprimer ${company.name}`}
                onClick={(e) => {
                  e.preventDefault()
                  if (window.confirm(`Supprimer « ${company.name} » ?`)) {
                    onDelete(company.id)
                  }
                }}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>

        {company.ai_enriched?.activity ? (
          <p className="mt-3 line-clamp-3 flex-1 text-xs leading-[18px] text-app-text-secondary">
            {company.ai_enriched.activity}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {company.sectors.slice(0, 2).map((sector) => (
            <Badge key={sector} variant="secondary" className="h-6 rounded-[5px] bg-app-control px-2 text-[11px] font-normal text-app-text-subtle">
              {sector}
            </Badge>
          ))}
          <Badge variant="outline" className="h-6 rounded-[5px] border-app-border px-2 text-[11px] font-normal text-app-text-secondary">{companySizeLabel(company.size_min, company.size_max)}</Badge>
          {company.remote_ok ? <Badge variant="outline" className="h-6 rounded-[5px] border-app-border px-2 text-[11px] font-normal text-app-text-secondary">Télétravail</Badge> : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-app-border pt-2">
          <Badge
            variant={
              company.status === "opportunity" || company.status === "interview"
                ? "default"
                : company.status === "refused"
                  ? "destructive"
                  : "secondary"
            }
            className="h-6 rounded-[5px] border border-app-border bg-app-control px-2 text-[11px] font-normal text-app-text-subtle"
          >
            {PIPELINE_STATUS_LABEL[company.status]}
          </Badge>
          <Link
            href={`/companies/${company.id}`}
            className="inline-flex min-h-8 items-center gap-1 rounded-[5px] px-1 text-xs font-medium text-app-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary"
          >
            Voir la fiche
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
