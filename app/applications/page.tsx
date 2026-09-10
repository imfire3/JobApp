"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
} from "@/types";
import { toast } from "sonner";
import { formatRelativeDate } from "@/lib/jobs/utils";
import { cn } from "@/lib/utils";
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

/** Pipeline for offers already applied to (excludes wishlist `to_apply`). */
const PIPELINE_STATUSES = APPLICATION_STATUSES.filter(
  (status): status is Exclude<ApplicationStatus, "to_apply"> =>
    status !== "to_apply"
);

const emptyForm = {
  company: "",
  position: "",
  date_applied: "",
  status: "applied" as ApplicationStatus,
  interview_date: "",
  notes: "",
};

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"pipeline" | "table">("pipeline");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
  const [draftDateApplied, setDraftDateApplied] = useState("");
  const [draftInterviewDate, setDraftInterviewDate] = useState("");
  const [draftStatus, setDraftStatus] = useState<ApplicationStatus>("applied");
  const [meetingNote, setMeetingNote] = useState("");
  const [form, setForm] = useState(emptyForm);

  const selected = useMemo(
    () => applications.find((app) => app.id === selectedId) ?? null,
    [applications, selectedId]
  );

  async function load(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data bootstrap on mount
    void load();
  }, []);

  const pipelineApplications = useMemo(
    () => applications.filter((app) => app.status !== "to_apply"),
    [applications]
  );

  const grouped = useMemo(() => {
    const map = new Map<ApplicationStatus, Application[]>();
    for (const status of PIPELINE_STATUSES) map.set(status, []);
    for (const app of pipelineApplications) map.get(app.status)?.push(app);
    return map;
  }, [pipelineApplications]);

  function openApplication(application: Application) {
    setSelectedId(application.id);
    setDraftNotes(application.notes ?? "");
    setDraftDateApplied(application.date_applied ?? "");
    setDraftInterviewDate(toDatetimeLocalValue(application.interview_date));
    setDraftStatus(
      application.status === "to_apply" ? "applied" : application.status
    );
    setMeetingNote("");
  }

  async function patchApplication(
    id: string,
    body: Record<string, unknown>
  ): Promise<Application | null> {
    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Impossible de mettre à jour la candidature");
      return null;
    }
    const application = data.application as Application;
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? application : app))
    );
    return application;
  }

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
      setForm(emptyForm);
      setCreateOpen(false);
      toast.success("Candidature créée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer la candidature");
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, status: ApplicationStatus) {
    await patchApplication(id, { status });
  }

  async function handleSaveDetails() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await patchApplication(selected.id, {
        status: draftStatus,
        date_applied: draftDateApplied || null,
        interview_date: draftInterviewDate
          ? new Date(draftInterviewDate).toISOString()
          : null,
        notes: draftNotes.trim() || null,
      });
      if (updated) toast.success("Candidature enregistrée");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMeetingNote() {
    if (!selected) return;
    const note = meetingNote.trim();
    if (!note) {
      toast.error("Écris une note de réunion");
      return;
    }
    setSaving(true);
    try {
      const updated = await patchApplication(selected.id, {
        history_note: note,
      });
      if (updated) {
        setMeetingNote("");
        toast.success("Note de réunion ajoutée");
      }
    } finally {
      setSaving(false);
    }
  }

  const historyEntries = useMemo(() => {
    if (!selected || !Array.isArray(selected.history)) return [];
    return [...selected.history].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    );
  }, [selected]);

  return (
    <AppShell>
      <div className="space-y-6">
        <StickyPageHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Candidatures</h1>
              <p className="text-base text-muted-foreground">
                Offres où tu as postulé — pipeline, entretiens et notes de réunion.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PageHelpButton pageId="applications" />
              <Button
                type="button"
                variant="outline"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Rafraîchir
              </Button>
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle candidature
              </Button>
            </div>
          </div>
        </StickyPageHeader>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Pipeline
            {!loading ? (
              <span className="ml-2 font-normal text-muted-foreground">
                · {pipelineApplications.length}
              </span>
            ) : null}
          </h2>
        </div>

        <Tabs
          value={view}
          onValueChange={(value) => setView(value as "pipeline" | "table")}
        >
          <TabsList>
            <TabsTrigger value="pipeline">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="table">
              <List className="mr-2 h-4 w-4" />
              Tableau
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4">
            {loading ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {PIPELINE_STATUSES.map((status) => (
                  <div
                    key={status}
                    className="min-w-[220px] flex-1 rounded-xl border bg-muted/40 p-3"
                  >
                    <div className="mb-3 h-5 w-24 animate-pulse rounded bg-muted" />
                    <div className="space-y-2">
                      <div className="h-20 animate-pulse rounded-lg bg-muted" />
                      <div className="h-20 animate-pulse rounded-lg bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pipelineApplications.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center space-y-4">
                <p className="text-base text-muted-foreground">
                  Aucune candidature envoyée. Crée-en une, ou marque une offre comme
                  « Candidaté » depuis Offres.
                </p>
                <Button type="button" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle candidature
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {PIPELINE_STATUSES.map((status) => {
                  const columnApps = grouped.get(status) ?? [];
                  return (
                    <section
                      key={status}
                      className="flex min-w-[220px] max-w-[280px] flex-1 flex-col rounded-xl border bg-muted/30 p-3"
                    >
                      <header className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold">
                          {STATUS_LABEL[status]}
                        </h3>
                        <span className="rounded-full bg-background px-2 py-0.5 text-base text-muted-foreground">
                          {columnApps.length}
                        </span>
                      </header>
                      <div className="flex min-h-[120px] flex-1 flex-col gap-2">
                        {columnApps.length === 0 ? (
                          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-base text-muted-foreground">
                            Aucune
                          </p>
                        ) : (
                          columnApps.map((application) => (
                            <article
                              key={application.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Ouvrir ${application.position} chez ${application.company}`}
                              className={cn(
                                "cursor-pointer rounded-lg border bg-background p-3 shadow-sm transition-shadow hover:shadow-md",
                                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                              )}
                              onClick={() => openApplication(application)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openApplication(application);
                                }
                              }}
                            >
                              <p className="line-clamp-2 text-base font-medium leading-snug">
                                {application.position}
                              </p>
                              <p className="mt-1 truncate text-base text-muted-foreground">
                                {application.company}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="h-auto text-sm">
                                  {STATUS_LABEL[application.status]}
                                </Badge>
                                {application.interview_date ? (
                                  <span className="text-sm text-muted-foreground">
                                    Entretien {formatRelativeDate(application.interview_date)}
                                  </span>
                                ) : null}
                              </div>
                              {application.notes ? (
                                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                  {application.notes}
                                </p>
                              ) : null}
                            </article>
                          ))
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="table" className="mt-4">
            {loading ? (
              <div className="h-56 animate-pulse rounded-xl border bg-muted/40" />
            ) : pipelineApplications.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-base text-muted-foreground">
                Aucune candidature pour l’instant.
              </div>
            ) : (
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Poste</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Postulé</TableHead>
                      <TableHead>Entretien</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pipelineApplications.map((application) => (
                      <TableRow
                        key={application.id}
                        className="cursor-pointer"
                        onClick={() => openApplication(application)}
                      >
                        <TableCell className="font-medium">
                          {application.position}
                        </TableCell>
                        <TableCell>{application.company}</TableCell>
                        <TableCell>{application.date_applied ?? "—"}</TableCell>
                        <TableCell>
                          {application.interview_date
                            ? formatRelativeDate(application.interview_date)
                            : "—"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={application.status}
                            onValueChange={(value) =>
                              void updateStatus(
                                application.id,
                                value as ApplicationStatus
                              )
                            }
                          >
                            <SelectTrigger className="h-9 w-[180px]">
                              <SelectValue>
                                {STATUS_LABEL[application.status]}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {PIPELINE_STATUSES.map((nextStatus) => (
                                <SelectItem key={nextStatus} value={nextStatus}>
                                  {STATUS_LABEL[nextStatus]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openApplication(application);
                            }}
                          >
                            Notes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle candidature</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createApplication}>
            <div className="space-y-2">
              <Label htmlFor="app-company">Entreprise</Label>
              <Input
                id="app-company"
                value={form.company}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, company: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-position">Poste</Label>
              <Input
                id="app-position"
                value={form.position}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, position: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value as ApplicationStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="app-date-applied">Date de candidature</Label>
                <Input
                  id="app-date-applied"
                  type="date"
                  value={form.date_applied}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, date_applied: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-interview-date">Date d’entretien</Label>
                <Input
                  id="app-interview-date"
                  type="datetime-local"
                  value={form.interview_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      interview_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-notes">Notes</Label>
              <Textarea
                id="app-notes"
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Création…" : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-lg"
          aria-describedby={undefined}
        >
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl leading-7">
                  {selected.position}
                </SheetTitle>
                <SheetDescription>{selected.company}</SheetDescription>
                {selected.job_id ? (
                  <Link
                    href={`/jobs/${selected.job_id}`}
                    className="mt-2 inline-flex items-center gap-1.5 text-base font-medium text-foreground underline-offset-4 hover:underline"
                    tabIndex={0}
                  >
                    Voir l’offre
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </Link>
                ) : null}
              </SheetHeader>

              <div className="flex flex-col gap-6 px-4 pb-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select
                    value={draftStatus}
                    onValueChange={(value) =>
                      setDraftStatus(value as ApplicationStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="detail-date-applied">Date de candidature</Label>
                    <Input
                      id="detail-date-applied"
                      type="date"
                      value={draftDateApplied}
                      onChange={(e) => setDraftDateApplied(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-interview-date">Date d’entretien</Label>
                    <Input
                      id="detail-interview-date"
                      type="datetime-local"
                      value={draftInterviewDate}
                      onChange={(e) => setDraftInterviewDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-notes">Notes</Label>
                  <Textarea
                    id="detail-notes"
                    rows={5}
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="Préparation, contacts, points à retenir…"
                  />
                </div>

                <div className="space-y-3 rounded-xl border p-4">
                  <Label htmlFor="meeting-note">Note de réunion</Label>
                  <Textarea
                    id="meeting-note"
                    rows={3}
                    value={meetingNote}
                    onChange={(e) => setMeetingNote(e.target.value)}
                    placeholder="Compte-rendu d’entretien, feedback RH…"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving || !meetingNote.trim()}
                    onClick={() => void handleAddMeetingNote()}
                  >
                    Ajouter au journal
                  </Button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-medium">Historique</h3>
                  {historyEntries.length === 0 ? (
                    <p className="text-base text-muted-foreground">
                      Aucune entrée pour l’instant.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {historyEntries.map((entry, index) => (
                        <li
                          key={`${entry.at}-${index}`}
                          className="rounded-lg border p-3"
                        >
                          <p className="text-base text-muted-foreground">
                            {formatRelativeDate(entry.at)}
                            {" · "}
                            {STATUS_LABEL[entry.status] ?? entry.status}
                          </p>
                          {entry.note ? (
                            <p className="mt-1 whitespace-pre-wrap text-base">
                              {entry.note}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <SheetFooter>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveDetails()}
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
