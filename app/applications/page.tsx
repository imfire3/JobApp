"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from "@/types";
import { toast } from "sonner";
import { formatRelativeDate } from "@/lib/jobs/utils";
import { PageHelpButton } from "@/components/onboarding/page-help-button";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  to_apply: "À candidater",
  applied: "Candidaté",
  hr_interview: "Entretien RH",
  technical_interview: "Entretien technique",
  case_study: "Étude de cas",
  offer: "Offre",
  rejected: "Refusé",
  accepted: "Accepté",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    company: "",
    position: "",
    date_applied: "",
    status: "to_apply" as ApplicationStatus,
    interview_date: "",
    notes: "",
  });

  async function load() {
    try {
      const res = await fetch("/api/applications");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossible de charger les candidatures");
      setApplications(data.applications ?? []);
    } catch (error) {
      setApplications([]);
      toast.error(
        error instanceof Error ? error.message : "Impossible de charger les candidatures"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<ApplicationStatus, Application[]>();
    for (const status of APPLICATION_STATUSES) map.set(status, []);
    for (const app of applications) map.get(app.status)?.push(app);
    return map;
  }, [applications]);

  async function createApplication(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          date_applied: form.date_applied || null,
          interview_date: form.interview_date || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossible de créer la candidature");
      setApplications((prev) => [data.application, ...prev]);
      setForm({
        company: "",
        position: "",
        date_applied: "",
        status: "to_apply",
        interview_date: "",
        notes: "",
      });
      toast.success("Candidature créée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer la candidature");
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, status: ApplicationStatus) {
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Impossible de mettre à jour le statut");
      return;
    }
    setApplications((prev) => prev.map((app) => (app.id === id ? data.application : app)));
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <StickyPageHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Candidatures</h1>
              <p className="text-sm text-muted-foreground">
                Suivi CRM : pipeline, dates d’entretien, notes et historique.
              </p>
            </div>
            <PageHelpButton pageId="applications" />
          </div>
        </StickyPageHeader>

        <Card>
          <CardHeader>
            <CardTitle>Créer une candidature</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-3" onSubmit={createApplication}>
              <div className="space-y-2">
                <Label>Entreprise</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Poste</Label>
                <Input
                  value={form.position}
                  onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, status: value as ApplicationStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date de candidature</Label>
                <Input
                  type="date"
                  value={form.date_applied}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, date_applied: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Date d’entretien</Label>
                <Input
                  type="datetime-local"
                  value={form.interview_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, interview_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <Button type="submit" disabled={creating}>
                  {creating ? "Création…" : "Créer la candidature"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="h-56 animate-pulse" />
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Aucune candidature pour l’instant. Crée-en une ci-dessus, ou marque une
              offre comme « Candidaté » depuis Offres.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {APPLICATION_STATUSES.map((status) => (
              <Card key={status}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {STATUS_LABEL[status]} ({grouped.get(status)?.length ?? 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(grouped.get(status) ?? []).map((application) => (
                    <div key={application.id} className="rounded-lg border p-3">
                      <p className="font-medium">{application.position}</p>
                      <p className="text-sm text-muted-foreground">{application.company}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Applied: {application.date_applied ?? "—"}
                        {application.interview_date
                          ? ` · Entretien : ${formatRelativeDate(application.interview_date)}`
                          : ""}
                      </p>
                      {application.notes && (
                        <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                          {application.notes}
                        </p>
                      )}
                      <div className="mt-3">
                        <Select
                          value={application.status}
                          onValueChange={(value) =>
                            updateStatus(application.id, value as ApplicationStatus)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLICATION_STATUSES.map((nextStatus) => (
                              <SelectItem key={nextStatus} value={nextStatus}>
                                {STATUS_LABEL[nextStatus]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
