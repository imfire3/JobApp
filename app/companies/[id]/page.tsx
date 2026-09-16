import { CompanyDetailPage } from "@/components/companies/company-detail-page";

export default async function CompanyDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompanyDetailPage companyId={id} />;
}