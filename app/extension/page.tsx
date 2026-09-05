import { AppShell } from "@/components/layout/app-shell"
import { ChromeExtensionPanel } from "@/components/imports/chrome-extension-panel"
import { PageHelpButton } from "@/components/onboarding/page-help-button"

export default function ExtensionPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6" data-tour="guide-extension">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Extension</h1>
            <p className="text-sm text-muted-foreground">
              Installe l’extension pour enregistrer des offres Welcome to the Jungle en CSV.
            </p>
          </div>
          <PageHelpButton pageId="extension" />
        </div>
        <ChromeExtensionPanel />
      </div>
    </AppShell>
  )
}
