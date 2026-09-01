"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CvAnalysisPanel } from "@/components/settings/cv-analysis-panel";
import { FileUp, Save } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { CvAnalysisResponse } from "@/types";

export function SettingsForm() {
  const [cvText, setCvText] = useState("");
  const [savedCvText, setSavedCvText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importingPdf, setImportingPdf] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CvAnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const loadAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    try {
      const res = await fetch("/api/profile/analyze-cv");
      if (!res.ok) {
        setAnalysis(null);
        return;
      }
      const data = (await res.json()) as { analysis: CvAnalysisResponse | null };
      setAnalysis(data.analysis ?? null);
    } catch {
      setAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        const profile = data.profile ?? {};
        const text = profile.cv_text ?? "";
        setCvText(text);
        setSavedCvText(text);
        setLastUpdatedAt(profile.updated_at ?? null);
      } catch {
        setCvText("");
        setSavedCvText("");
        setLastUpdatedAt(null);
      } finally {
        setLoading(false);
      }
    }
    void load();
    void loadAnalysis();
  }, [loadAnalysis]);

  const hasUnsavedCv = cvText !== savedCvText;
  const hasSavedCv = savedCvText.trim().length > 0;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv_text: cvText,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }
      const data = await res.json();
      const text = data.profile?.cv_text ?? cvText;
      setCvText(text);
      setSavedCvText(text);
      setLastUpdatedAt(data.profile?.updated_at ?? new Date().toISOString());
      await loadAnalysis();
      toast.success("CV context saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleImportPdf() {
    if (!pdfFile) {
      toast.error("Please select a PDF file first.");
      return;
    }

    setImportingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      const res = await fetch("/api/profile/import-cv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "PDF import failed");

      const text = data.extracted_text ?? "";
      setCvText(text);
      setSavedCvText(text);
      setLastUpdatedAt(data.profile?.updated_at ?? new Date().toISOString());
      setPdfFile(null);
      await loadAnalysis();
      toast.success("CV imported as AI context.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF import failed");
    } finally {
      setImportingPdf(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/profile/analyze-cv", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "CV analysis failed");
      }
      setAnalysis(data.analysis ?? null);
      toast.success("CV analysis complete");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CV analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CV Context</h1>
        <p className="text-sm text-muted-foreground">
          Your CV is used to personalize cover letters and power ATS-oriented analysis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CV text</CardTitle>
          <CardDescription>
            Paste your CV once and reuse it for batch cover letter generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3">
            <Label className="mb-2 block">Optional PDF upload</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                className="sm:flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleImportPdf}
                disabled={importingPdf || !pdfFile}
              >
                <FileUp className="mr-2 h-4 w-4" />
                {importingPdf ? "Importing..." : "Import PDF"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              MVP supports PDF extraction and text paste. We only store `cv_text`.
            </p>
          </div>

          <Textarea
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            rows={16}
            placeholder="Paste your real CV content here (experience, achievements, tools, context)."
            className="font-mono text-sm"
          />
          {lastUpdatedAt && (
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(lastUpdatedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save CV context"}
        </Button>
      </div>

      <CvAnalysisPanel
        analysis={analysis}
        analyzing={analyzing}
        loading={analysisLoading}
        hasUnsavedCv={hasUnsavedCv}
        hasSavedCv={hasSavedCv}
        onAnalyze={handleAnalyze}
      />
    </div>
  );
}
