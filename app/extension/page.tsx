import { AppShell } from "@/components/layout/app-shell"
import { StickyPageHeader } from "@/components/layout/sticky-page-header"
import { ExtensionGuide } from "@/components/extension/extension-guide"
import { ExtensionHeader } from "@/components/extension/extension-header"

export default function ExtensionPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <StickyPageHeader>
          <ExtensionHeader />
        </StickyPageHeader>
        <ExtensionGuide />
      </div>
    </AppShell>
  )
}