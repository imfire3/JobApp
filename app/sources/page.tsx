import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function SourcesRoutePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sources</h1>
          <p className="text-sm text-muted-foreground">
            Connectors are optional in this MVP. Use Imports to add jobs from CSV/Excel.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Coming soon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Live connectors (Apify/Browse AI/Octoparse/custom scrapers) will be plugged later.
            </p>
            <Link href="/imports" className={buttonVariants({ variant: "outline" })}>
              Go to Imports
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
