import { AppShell } from "@/components/layout/app-shell"
import { ChromeExtensionPanel } from "@/components/imports/chrome-extension-panel"

export default function ExtensionPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Extension Chrome</h1>
          <p className="text-sm text-muted-foreground">
            Installe l’extension pour ajouter des offres Welcome to the Jungle dans JobTracker.
          </p>
        </div>
        <ChromeExtensionPanel />
      </div>
    </AppShell>
  )
}
