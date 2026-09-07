"use client"

import Link from "next/link"
import { Download, ExternalLink, FolderOpen, Puzzle } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const CHROME_EXTENSION_ZIP_URL = "/downloads/jobtracker-chrome-extension.zip"

type ChromeExtensionPanelProps = {
  onGoToCsv?: () => void
}

export function ChromeExtensionPanel({ onGoToCsv }: ChromeExtensionPanelProps) {
  const handleCopyExtensionsUrl = async () => {
    try {
      await navigator.clipboard.writeText("chrome://extensions")
      toast.success("Lien copié — colle-le dans la barre d’adresse Chrome ou Arc")
    } catch {
      toast.error("Impossible de copier. Ouvre chrome://extensions manuellement.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="h-5 w-5" />
          Extension Google Chrome
        </CardTitle>
        <CardDescription>
          Enregistre des offres Welcome to the Jungle dans un CSV, puis importe-les dans
          JobTracker.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={CHROME_EXTENSION_ZIP_URL}
            download="jobtracker-chrome-extension.zip"
            className={buttonVariants({ size: "lg" })}
          >
            <Download className="mr-2 h-4 w-4" />
            Télécharger l’extension
          </a>
          <Button type="button" variant="outline" size="lg" onClick={() => void handleCopyExtensionsUrl()}>
            Copier chrome://extensions
          </Button>
          {onGoToCsv ? (
            <Button type="button" variant="secondary" size="lg" onClick={onGoToCsv}>
              Aller à CSV / Excel
            </Button>
          ) : (
            <Link href="/imports" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              Aller à CSV / Excel
            </Link>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Comment l’installer</h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                1
              </span>
              <span>
                Clique sur <strong className="text-foreground">Télécharger l’extension</strong>,
                puis dézippe le fichier{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  jobtracker-chrome-extension.zip
                </code>{" "}
                (tu obtiens un dossier).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                2
              </span>
              <span>
                Ouvre{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">chrome://extensions</code>{" "}
                (Chrome) ou{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">arc://extensions</code>{" "}
                (Arc) dans la barre d’adresse.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                3
              </span>
              <span className="flex items-start gap-2">
                <FolderOpen className="mt-0.5 h-4 w-4 shrink-0" />
                Active le <strong className="text-foreground">mode développeur</strong>, puis
                clique sur <strong className="text-foreground">Charger l’extension non
                empaquetée</strong> et sélectionne le dossier dézippé.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                4
              </span>
              <span>
                Sur une offre Welcome to the Jungle, ouvre le panneau JobTracker → lie un fichier
                CSV → ajoute l’offre.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                5
              </span>
              <span>
                Importe ce CSV dans JobTracker via{" "}
                <strong className="text-foreground">Imports → CSV / Excel</strong>.
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
          <a
            href="https://www.welcometothejungle.com"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
          >
            Ouvrir Welcome to the Jungle
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
