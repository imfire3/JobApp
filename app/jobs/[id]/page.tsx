import { JobDetailPage } from "@/components/jobs/job-detail-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobByIdPage({ params }: PageProps) {
  const { id } = await params;
  return <JobDetailPage jobId={id} />;
}
