import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function SourceDetailsRoute({
  params: _params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  await _params;
  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Connector details coming soon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-base text-muted-foreground">
          <p>
            This MVP focuses on importing jobs, selecting opportunities, and generating cover
            letters.
          </p>
          <Link href="/jobs" className={buttonVariants({ variant: "outline" })}>
            Voir les offres
          </Link>
        </CardContent>
      </Card>
    </AppShell>
  );
}
