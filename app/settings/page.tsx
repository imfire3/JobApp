import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { AiPromptsPanel } from "@/components/settings/ai-prompts-panel";
import { AtsKeywordsPanel } from "@/components/settings/ats-keywords-panel";
import { AppShell } from "@/components/layout/app-shell";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <GeneralSettingsForm />
        <div className="space-y-6">
          <AtsKeywordsPanel />
          <AiPromptsPanel />
        </div>
      </div>
    </AppShell>
  );
}
