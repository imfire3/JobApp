import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Lab UX is now the default job detail; keep /lab as a stable alias. */
export default async function JobLabAliasPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/jobs/${id}`);
}
