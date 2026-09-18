import { AppShell } from "@/components/layout/app-shell"
import { TrackedJobsPage } from "@/components/jobs/tracked-jobs-page"
import { isSelfSignupAllowed } from "@/lib/auth/self-signup"

export default function JobsPage() {
  return (
    <AppShell>
      <TrackedJobsPage allowLocalDevTools={isSelfSignupAllowed()} />
    </AppShell>
  )
}
