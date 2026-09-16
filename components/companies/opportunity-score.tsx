import { cn } from "@/lib/utils"
import type { CompanyOpportunityBreakdown } from "@/types"
import { scoreTone } from "@/components/companies/company-labels"

export function OpportunityScore({
  score,
  breakdown,
  className,
}: {
  score: number | null
  breakdown: CompanyOpportunityBreakdown | null
  className?: string
}) {
  const tone = scoreTone(score)
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div
        className={cn(
          "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border",
          tone === "good" && "border-emerald-300 bg-emerald-50 text-emerald-700",
          tone === "medium" && "border-amber-300 bg-amber-50 text-amber-700",
          tone === "low" && "border-muted bg-muted/40 text-muted-foreground",
          tone === "pending" && "border-muted bg-muted/40 text-muted-foreground"
        )}
      >
        <span className="text-2xl font-bold leading-none">
          {score == null ? "—" : `${score}`}
        </span>
        <span className="mt-1 text-xs font-medium">/ 100</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Score d’opportunité</p>
        {(breakdown?.why.length ?? 0) > 0 ? (
          <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            {breakdown!.why.slice(0, 4).map((reason) => (
              <li key={reason}>· {reason}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Calculé après une recherche : profil, secteur, lieu, produit, croissance, contact.
          </p>
        )}
      </div>
    </div>
  )
}