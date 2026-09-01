"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppWindow, Braces, Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ImportJobsTable } from "@/components/imports/import-jobs-table";
import { EXPECTED_IMPORT_COLUMNS } from "@/lib/imports/jobs-file";
import type { ParsedImportRow } from "@/lib/imports/jobs-file";

type ImportSummary = {
  total_rows: number;
  imported: number;
  duplicates: number;
  invalid: number;
  invalid_rows: Array<{ rowNumber: number; errors: string[] }>;
};

type WttjImportSummary = {
  received: number;
  imported: number;
  duplicates: number;
  invalid: number;
  deleted?: number;
  errors: Array<{ index: number; message: string }>;
};

export function ImportsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedImportRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | WttjImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [activeTab, setActiveTab] = useState<"json" | "sheet">("json");
  const [replaceExisting, setReplaceExisting] = useState(true);

  const invalidPreview = useMemo(() => {
    if (!summary) return [];
    if ("invalid_rows" in summary) {
      return summary.invalid_rows.filter((row) => row.rowNumber > 0).slice(0, 5);
    }
    return summary.errors.slice(0, 5).map((err) => ({
      rowNumber: err.index + 1,
      errors: [err.message],
    }));
  }, [summary]);

  function downloadCsvTemplate() {
    const header = EXPECTED_IMPORT_COLUMNS.join(",");
    const sampleRow = [
      "welcome_to_the_jungle",
      "Product Manager",
      "Alan",
      "Paris",
      "true",
      "60k-70k EUR",
      "2026-07-08",
      "https://www.welcometothejungle.com/fr/companies/alan/jobs/pm-paris",
      "Role description here",
    ].join(",");
    const content = `${header}\n${sampleRow}\n`;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jobs-import-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function downloadExcelTemplate() {
    const XLSX = await import("xlsx");
    const rows = [
      Object.fromEntries(EXPECTED_IMPORT_COLUMNS.map((col) => [col, ""])),
      {
        source: "welcome_to_the_jungle",
        title: "Product Manager",
        company: "Alan",
        location: "Paris",
        remote: "true",
        salary: "60k-70k EUR",
        posted_at: "2026-07-08",
        url: "https://www.welcometothejungle.com/fr/companies/alan/jobs/pm-paris",
        description: "Role description here",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...EXPECTED_IMPORT_COLUMNS] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "jobs");
    XLSX.writeFile(workbook, "jobs-import-template.xlsx");
  }

  function downloadJsonTemplate() {
    const sample = [
      {
        id: "wttj-example-1",
        reference: "REF-001",
        name: "Product Manager",
        url: "https://www.welcometothejungle.com/fr/companies/alan/jobs/pm-paris",
        contractType: "full_time",
        remote: "partial",
        language: "fr",
        salaryMin: 50000,
        salaryMax: 65000,
        salaryCurrency: "EUR",
        salaryPeriod: "yearly",
        experienceLevel: 3,
        publishedAt: "2026-07-08T10:00:00Z",
        category: "Product",
        summary: "<p>Own the product roadmap.</p>",
        offices: [{ city: "Paris", district: "11e", country_code: "FR" }],
        organizationName: "Alan",
        organizationSlug: "alan",
        organizationLogo: "https://cdn.example.com/logo.png",
        description: "<p>Role description here.</p>",
        skills: [{ name: { fr: "Agilité", en: "Agility" } }],
        tools: [{ name: "Notion" }],
      },
    ];
    const blob = new Blob([JSON.stringify(sample, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "apify-jobs-sample.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handlePreview(selectedFile: File) {
    setPreviewing(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/import-jobs/preview", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        rows?: ParsedImportRow[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Preview failed");
      }

      setPreviewRows(payload.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
      setPreviewRows([]);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setPreviewRows([]);
    setSummary(null);
    setError(null);

    if (selected) {
      await handlePreview(selected);
    }
  }

  async function handleWttjSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Select a JSON file first.");
      return;
    }

    setUploading(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (replaceExisting) {
        formData.append("replace", "true");
      }

      const response = await fetch(
        `/api/import-jobs/json${replaceExisting ? "?replace=true" : ""}`,
        {
          method: "POST",
          body: formData,
        }
      );
      const payload = (await response.json()) as WttjImportSummary & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Import failed");
      }

      setSummary(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSheetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Select a file first.");
      return;
    }

    setUploading(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import-jobs", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        summary?: ImportSummary;
        preview?: ParsedImportRow[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Import failed");
      }

      setSummary(payload.summary ?? null);
      if (payload.preview?.length) {
        setPreviewRows(payload.preview);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setUploading(false);
    }
  }

  const accept =
    activeTab === "json" ? ".json,application/json" : ".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Imports</h1>
        <p className="text-sm text-muted-foreground">
          Import your Apify scrape as JSON, preview the jobs in a table, then save them to your
          board.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "json" | "sheet")}>
        <TabsList>
          <TabsTrigger value="json" className="gap-2">
            <Braces className="h-4 w-4" />
            Apify JSON
          </TabsTrigger>
          <TabsTrigger value="sheet" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            CSV / Excel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="json" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import Apify JSON
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
                <Button type="button" variant="outline" onClick={downloadJsonTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download JSON sample
                </Button>
                <p className="w-full text-xs text-muted-foreground">
                  Export your Apify dataset as JSON (array or {"{ items: [...] }"}), upload it
                  here, preview, then import.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleWttjSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="json-upload">Apify JSON file (.json)</Label>
                  <Input
                    id="json-upload"
                    type="file"
                    accept={accept}
                    onChange={handleFileChange}
                  />
                </div>

                <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                  <Checkbox
                    id="replace-existing"
                    checked={replaceExisting}
                    onCheckedChange={(checked) => setReplaceExisting(checked === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="replace-existing" className="cursor-pointer">
                      Replace all my existing jobs
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Deletes your current jobs in Supabase before importing this file.
                    </p>
                  </div>
                </div>

                <Button type="submit" disabled={uploading || !file}>
                  {uploading
                    ? "Importing..."
                    : replaceExisting
                      ? "Replace & import WTTJ JSON"
                      : "Import WTTJ JSON"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sheet" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import CSV / Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
                <Button type="button" variant="outline" onClick={downloadExcelTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel template
                </Button>
                <Button type="button" variant="outline" onClick={downloadCsvTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV template
                </Button>
              </div>

              <form className="space-y-4" onSubmit={handleSheetSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="sheet-upload">CSV or Excel file</Label>
                  <Input
                    id="sheet-upload"
                    type="file"
                    accept={accept}
                    onChange={handleFileChange}
                  />
                </div>

                <Button type="submit" disabled={uploading || !file || previewRows.length === 0}>
                  {uploading ? "Importing..." : `Import ${previewRows.length} jobs`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="rounded-lg border bg-muted/40 p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <AppWindow className="h-4 w-4" />
          Apify workflow
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run your Apify actor → export dataset as JSON → upload here → preview in the table →
          import into Jobs.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {(previewing || previewRows.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>
              Preview {previewing ? "" : `(${previewRows.length} jobs)`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewing ? (
              <p className="text-sm text-muted-foreground">Parsing file...</p>
            ) : (
              <ImportJobsTable rows={previewRows} />
            )}
          </CardContent>
        </Card>
      )}

      {summary ? (
        <Card>
          <CardHeader>
            <CardTitle>Import summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {"received" in summary ? (
                <>
                  <Metric label="Received" value={summary.received} />
                  {summary.deleted !== undefined ? (
                    <Metric label="Deleted" value={summary.deleted} />
                  ) : null}
                  <Metric label="Imported" value={summary.imported} />
                  {summary.deleted === undefined ? (
                    <Metric label="Duplicates" value={summary.duplicates} />
                  ) : null}
                  <Metric label="Invalid" value={summary.invalid} />
                </>
              ) : (
                <>
                  <Metric label="Total rows" value={summary.total_rows} />
                  <Metric label="Imported" value={summary.imported} />
                  <Metric label="Duplicates" value={summary.duplicates} />
                  <Metric label="Invalid rows" value={summary.invalid} />
                </>
              )}
            </div>

            {summary.imported > 0 ? (
              <Link href="/jobs" className={buttonVariants({ variant: "outline" })}>
                View imported jobs in table
              </Link>
            ) : null}

            {invalidPreview.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Invalid row examples</p>
                <div className="space-y-2">
                  {invalidPreview.map((row) => (
                    <div key={row.rowNumber} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">Row {row.rowNumber}</p>
                      <p className="text-muted-foreground">{row.errors.join("; ")}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
