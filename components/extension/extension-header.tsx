"use client"

import { useState } from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  PageHelpButton,
  PageHelpDialog,
} from "@/components/onboarding/page-help-button"
import { cn } from "@/lib/utils"

export function ExtensionHeader() {
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Extension</h1>
        <p className="text-base text-muted-foreground">
          Télécharge et installe l’extension Chrome pour enregistrer des offres
          depuis Welcome to the Jungle en CSV, puis importe-les dans JobTracker.
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <Link
          href="/jobs"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <ExternalLink className="size-4" />
          Voir le guide complet
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setHelpOpen(true)}
        >
          Voir les solutions
        </Button>
        <PageHelpButton pageId="extension" />
      </div>
      <PageHelpDialog
        pageId="extension"
        open={helpOpen}
        onOpenChange={setHelpOpen}
      />
    </div>
  )
}