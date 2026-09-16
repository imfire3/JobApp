import { AppShell } from "@/components/layout/app-shell"
import { TrackedSearchFormPage } from "@/components/jobs/tracked-search-form-page"

export default async function EditTrackedSearchPage({
  params,
}: {
  params: Promise<{ searchId: string }>
}) {
  const { searchId } = await params
  return (
    <AppShell>
      <TrackedSearchFormPage searchId={searchId} />
    </AppShell>
  )
}
