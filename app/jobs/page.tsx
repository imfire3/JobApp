import { AppShell } from "@/components/layout/app-shell";
import { TrackedJobsPage } from "@/components/jobs/tracked-jobs-page";

export default function JobsPage() {
  return (
    <AppShell>
      <TrackedJobsPage />
    </AppShell>
  );
}
