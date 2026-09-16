<<<<<<< Updated upstream
import { AppShell } from "@/components/layout/app-shell"
import { TrackedJobsPage } from "@/components/jobs/tracked-jobs-page"
import { isSelfSignupAllowed } from "@/lib/auth/self-signup"
=======
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { TrackedJobsPage } from "@/components/jobs/tracked-jobs-page";
>>>>>>> Stashed changes

export default function JobsPage() {
  return (
    <AppShell>
<<<<<<< Updated upstream
      <TrackedJobsPage allowLocalDevTools={isSelfSignupAllowed()} />
=======
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading jobs…</div>}>
        <TrackedJobsPage />
      </Suspense>
>>>>>>> Stashed changes
    </AppShell>
  )
}
