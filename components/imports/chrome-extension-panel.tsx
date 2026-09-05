"use client"

import Link from "next/link"
import { Download, FolderOpen, Puzzle } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ChromeExtensionPanelProps = {
  onGoToCsv?: () => void
}

export function ChromeExtensionPanel({ onGoToCsv }: ChromeExtensionPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="h-5 w-5" />
          Extension Google Chrome
        </CardTitle>
        <CardDescription>
          Ajoute des offres Welcome to the Jungle dans un CSV, puis importe-les dans JobTracker.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold">Installation</h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                1
              </span>
              <span>
                Ouvre{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">chrome://extensions</code>{" "}
                (ou <code className="rounded bg-muted px-1 py-0.5 text-xs">arc://extensions</code>)
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                2
              </span>
              <span className="flex items-start gap-2">
                <FolderOpen className="mt-0.5 h-4 w-4 shrink-0" />
                Active le mode développeur, puis charge le dossier{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">chrome-extension</code> du
                projet
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                3
              </span>
              <span>
                Sur une offre WTTJ, clique l’onglet JobTracker → lie un fichier CSV → ajoute
                l’offre
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                4
              </span>
              <span className="flex items-start gap-2">
                <Download className="mt-0.5 h-4 w-4 shrink-0" />
                Importe ce CSV via l’onglet <strong className="text-foreground">CSV / Excel</strong>
              </span>
            </li>
          </ol>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Fichier CSV</p>
          <p className="mt-1">
            Un seul fichier est réécrit à chaque ajout (pas de nouveaux fichiers). Colonnes :
            source, title, company, location, remote, salary, posted_at, url, apply_url,
            description.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {onGoToCsv ? (
            <Button type="button" variant="outline" onClick={onGoToCsv}>
              Aller à CSV / Excel
            </Button>
          ) : (
            <Link href="/imports" className={buttonVariants({ variant: "outline" })}>
              Aller à CSV / Excel
            </Link>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard?.writeText("chrome://extensions")
            }}
          >
            Copier chrome://extensions
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
