import { JobDetailLabPage } from "@/components/jobs/lab/job-detail-lab-page"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function JobDetailLabRoute({ params }: PageProps) {
  const { id } = await params
  return <JobDetailLabPage jobId={id} />
}
