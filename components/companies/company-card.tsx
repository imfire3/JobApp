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
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/companies/${company.id}`}
                className="text-base font-semibold leading-snug hover:underline"
              >
                {company.name}
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Site
                  </a>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {locationLabel}
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
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault()
                  if (window.confirm(`Supprimer « ${company.name} » ?`)) {
                    onDelete(company.id)
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {company.ai_enriched?.activity ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {company.ai_enriched.activity}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {company.sectors.slice(0, 3).map((sector) => (
            <Badge key={sector} variant="secondary">
              {sector}
            </Badge>
          ))}
          <Badge variant="outline">{companySizeLabel(company.size_min, company.size_max)}</Badge>
          {company.remote_ok ? <Badge variant="outline">Remote</Badge> : null}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Badge
            variant={
              company.status === "opportunity" || company.status === "interview"
                ? "default"
                : company.status === "refused"
                  ? "destructive"
                  : "secondary"
            }
            className="h-auto text-sm"
          >
            {PIPELINE_STATUS_LABEL[company.status]}
          </Badge>
          <Link
            href={`/companies/${company.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground"
          >
            Voir la fiche
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
