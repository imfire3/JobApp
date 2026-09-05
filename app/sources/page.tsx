import { AppShell } from "@/components/layout/app-shell";
import { FakeSourcesPanel } from "@/components/sources/fake-sources-panel";

export default function SourcesRoutePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sources</h1>
          <p className="text-sm text-muted-foreground">
            Connecteurs démo — active ou désactive chaque source. Les imports CSV restent
            disponibles.
          </p>
        </div>
        <FakeSourcesPanel />
      </div>
    </AppShell>
  );
}
