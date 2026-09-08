import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { AdminCreateAccessForm } from "@/components/settings/admin-create-access-form";
import { AiPromptsPanel } from "@/components/settings/ai-prompts-panel";
import { AtsKeywordsPanel } from "@/components/settings/ats-keywords-panel";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthenticatedUser } from "@/lib/auth";
import { LOCAL_ADMIN_ID } from "@/lib/local-auth";

export default async function SettingsPage() {
  const { user } = await getAuthenticatedUser();
  const isAdmin = user?.id === LOCAL_ADMIN_ID;

  return (
    <AppShell>
      <div className="space-y-8">
        <GeneralSettingsForm />
        {isAdmin ? <AdminCreateAccessForm /> : null}
        <div className="space-y-6">
          <AtsKeywordsPanel />
          <AiPromptsPanel />
        </div>
      </div>
    </AppShell>
  );
}
