"use client"

import { Check, Copy, Download, FolderOpen, Settings } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  CHROME_EXTENSION_DOWNLOAD_APPROX_SIZE,
  CHROME_EXTENSION_DOWNLOAD_NAME,
  CHROME_EXTENSIONS_URL,
  CHROME_EXTENSION_ZIP_URL,
} from "@/lib/imports/chrome-extension"

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-medium text-foreground">
      {n}
    </span>
  )
}

function handleCopyExtensionsUrl() {
  void navigator.clipboard
    .writeText(CHROME_EXTENSIONS_URL)
    .then(() => toast.success("Lien copié — colle-le dans la barre d’adresse Chrome"))
    .catch(() =>
      toast.error("Impossible de copier. Ouvre chrome://extensions manuellement.")
    )
}

export function ExtensionGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <StepNumber n={1} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                Télécharger l’extension
              </h2>
              <p className="mt-1 text-base text-muted-foreground">
                Clique sur le bouton ci-dessous pour télécharger le fichier
                d’extension (.zip).
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <a
              href={CHROME_EXTENSION_ZIP_URL}
              download={CHROME_EXTENSION_DOWNLOAD_NAME}
              className={buttonVariants({ size: "lg" })}
            >
              <Download className="size-4" />
              Télécharger l’extension
            </a>
            <p className="text-base text-muted-foreground">
              {CHROME_EXTENSION_DOWNLOAD_NAME}{" "}
              <span className="text-muted-foreground/70">
                ({CHROME_EXTENSION_DOWNLOAD_APPROX_SIZE})
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <StepNumber n={2} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                Dézipper le fichier
              </h2>
              <p className="mt-1 text-base text-muted-foreground">
                Une fois le téléchargement terminé, dézippe le fichier sur ton
                ordinateur.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-base">
            <FolderOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              Tu obtiendras un dossier avec au minimum :{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
                manifest.json
              </code>{" "}
              et d’autres fichiers.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <StepNumber n={3} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                Ouvrir les extensions Chrome
              </h2>
              <p className="mt-1 text-base text-muted-foreground">
                Dans ton navigateur Chrome, va sur la page des extensions.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              readOnly
              value={CHROME_EXTENSIONS_URL}
              className="font-mono sm:flex-1"
            />
            <Button variant="outline" onClick={handleCopyExtensionsUrl}>
              <Copy className="size-4" />
              Copier
            </Button>
          </div>
          <p className="text-base text-muted-foreground">
            Ou via le menu :{" "}
            <span className="text-foreground">⋮</span> &gt; Extensions &gt;
            Gérer les extensions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <StepNumber n={4} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                Activer le mode développeur
              </h2>
              <p className="mt-1 text-base text-muted-foreground">
                Sur la page des extensions, active le mode développeur pour
                pouvoir charger ton extension.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-base">
            <Settings className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              En haut à droite de la page, fais glisser le commutateur{" "}
              <span className="font-medium text-foreground">
                « Mode développeur »
              </span>{" "}
              vers la droite : il passe en bleu quand il est actif.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <StepNumber n={5} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                Charger l’extension non empaquetée
              </h2>
              <p className="mt-1 text-base text-muted-foreground">
                Sur la même page des extensions, clique sur le bouton
                « Charger l’extension non empaquetée » puis sélectionne le
                dossier que tu as dézippé, celui qui contient le fichier
                manifest.json.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-base">
            <FolderOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              Sélectionne le dossier (pas le fichier .zip). L’extension
              apparaît alors dans la liste des extensions installées.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <StepNumber n={6} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                Importer tes offres
              </h2>
              <p className="mt-1 text-base text-muted-foreground">
                Une fois l’extension installée, va sur Welcome to the Jungle,
                enregistre des offres, puis importe ton CSV dans JobTracker.
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-base">
            <p className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-foreground" />
              <span className="text-muted-foreground">
                C’est prêt ! Tu peux maintenant enregistrer des offres et les
                importer dans JobTracker via{" "}
                <Link
                  href="/jobs"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Imports → CSV / Excel
                </Link>
                .
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}