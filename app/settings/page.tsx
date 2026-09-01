import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { AppShell } from "@/components/layout/app-shell";

export default function SettingsPage() {
  return (
    <AppShell>
      <GeneralSettingsForm />
    </AppShell>
  );
}
