"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Save } from "lucide-react";
import { toast } from "sonner";

type PromptBucket = {
  prompt: string;
  default_prompt: string;
  is_custom: boolean;
  user_message_template?: string;
  focuses?: string[];
  editable?: boolean;
};

type PromptsResponse = {
  cv_analysis?: PromptBucket;
  job_match?: PromptBucket;
  cover_letter?: PromptBucket;
  error?: string;
};

function PromptEditor({
  title,
  description,
  focuses,
  value,
  savedValue,
  isCustom,
  editable,
  userMessageTemplate,
  saving,
  loading,
  onChange,
  onSave,
  onReset,
}: {
  title: string;
  description: string;
  focuses?: string[];
  value: string;
  savedValue: string;
  isCustom: boolean;
  editable: boolean;
  userMessageTemplate?: string;
  saving: boolean;
  loading: boolean;
  onChange: (next: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showUserMessage, setShowUserMessage] = useState(false);
  const unsaved = value !== savedValue;

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex flex-wrap items-center gap-2">
          {title}
          {editable ? (
            isCustom ? (
              <Badge variant="secondary">Custom</Badge>
            ) : (
              <Badge variant="outline">Default</Badge>
            )
          ) : (
            <Badge variant="outline">Lecture seule</Badge>
          )}
          {unsaved && editable ? (
            <Badge variant="outline" className="border-amber-500/40 text-amber-700">
              Non sauvegardé
            </Badge>
          ) : null}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open ? (
        <div className="space-y-3 border-t px-4 py-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          {focuses?.length ? (
            <div className="flex flex-wrap gap-1">
              {focuses.map((focus) => (
                <Badge key={focus} variant="secondary">
                  {focus}
                </Badge>
              ))}
            </div>
          ) : null}
          <Label>{editable ? "System prompt" : "System prompt (non modifiable)"}</Label>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={14}
            disabled={loading || saving || !editable}
            className="font-mono text-xs"
            placeholder={loading ? "Chargement…" : "System prompt…"}
          />
          {userMessageTemplate ? (
            <div className="space-y-2">
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setShowUserMessage((prev) => !prev)}
              >
                {showUserMessage ? "Masquer" : "Voir"} le template du message utilisateur
              </button>
              {showUserMessage ? (
                <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  {userMessageTemplate}
                </pre>
              ) : null}
            </div>
          ) : null}
          {editable ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={onSave}
                disabled={loading || saving || !value.trim() || !unsaved}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onReset}
                disabled={loading || saving || (!isCustom && !unsaved)}
              >
                Reset défaut
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ce prompt est défini dans le code pour l’instant. Les prompts CV et match job
              sont éditables ci-dessus.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AiPromptsPanel() {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<"cv" | "job" | null>(null);

  const [cvPrompt, setCvPrompt] = useState("");
  const [cvSaved, setCvSaved] = useState("");
  const [cvDefault, setCvDefault] = useState("");
  const [cvCustom, setCvCustom] = useState(false);
  const [cvUserTemplate, setCvUserTemplate] = useState("");
  const [cvFocuses, setCvFocuses] = useState<string[]>([]);

  const [jobPrompt, setJobPrompt] = useState("");
  const [jobSaved, setJobSaved] = useState("");
  const [jobDefault, setJobDefault] = useState("");
  const [jobCustom, setJobCustom] = useState(false);
  const [jobUserTemplate, setJobUserTemplate] = useState("");
  const [jobFocuses, setJobFocuses] = useState<string[]>([]);

  const [coverPrompt, setCoverPrompt] = useState("");
  const [coverFocuses, setCoverFocuses] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/profile/cv-analysis-prompt");
        const data = (await res.json()) as PromptsResponse;
        if (!res.ok) throw new Error(data.error ?? "Impossible de charger les prompts");

        const cv = data.cv_analysis;
        const job = data.job_match;
        const cover = data.cover_letter;

        if (cv) {
          setCvPrompt(cv.prompt);
          setCvSaved(cv.prompt);
          setCvDefault(cv.default_prompt);
          setCvCustom(cv.is_custom);
          setCvUserTemplate(cv.user_message_template ?? "");
          setCvFocuses(cv.focuses ?? []);
        }
        if (job) {
          setJobPrompt(job.prompt);
          setJobSaved(job.prompt);
          setJobDefault(job.default_prompt);
          setJobCustom(job.is_custom);
          setJobUserTemplate(job.user_message_template ?? "");
          setJobFocuses(job.focuses ?? []);
        }
        if (cover) {
          setCoverPrompt(cover.prompt);
          setCoverFocuses(cover.focuses ?? []);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Chargement prompts échoué");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function saveField(
    key: "cv" | "job",
    payload: Record<string, string | null>
  ) {
    setSavingKey(key);
    try {
      const res = await fetch("/api/profile/cv-analysis-prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as PromptsResponse;
      if (!res.ok) throw new Error(data.error ?? "Enregistrement échoué");

      if (key === "cv" && data.cv_analysis) {
        setCvPrompt(data.cv_analysis.prompt);
        setCvSaved(data.cv_analysis.prompt);
        setCvDefault(data.cv_analysis.default_prompt);
        setCvCustom(data.cv_analysis.is_custom);
      }
      if (key === "job" && data.job_match) {
        setJobPrompt(data.job_match.prompt);
        setJobSaved(data.job_match.prompt);
        setJobDefault(data.job_match.default_prompt);
        setJobCustom(data.job_match.is_custom);
      }
      toast.success("Prompt enregistré");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement échoué");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompts IA</CardTitle>
        <CardDescription>
          Voir les prompts utilisés pour l’analyse CV, le match job et la cover letter. Tu peux
          modifier les prompts CV et match (ou garder les défauts).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PromptEditor
          title="Analyse CV (ATS)"
          description="Utilisé quand tu lances Analyze CV dans CV Context ou depuis une fiche job."
          focuses={cvFocuses}
          value={cvPrompt}
          savedValue={cvSaved}
          isCustom={cvCustom}
          editable
          userMessageTemplate={cvUserTemplate}
          saving={savingKey === "cv"}
          loading={loading}
          onChange={setCvPrompt}
          onSave={() =>
            void saveField("cv", { cv_analysis_system_prompt: cvPrompt })
          }
          onReset={() =>
            void saveField("cv", { cv_analysis_system_prompt: null })
          }
        />

        <PromptEditor
          title="Match fiche de poste"
          description="Utilisé sur /jobs/[id] et Analyze pour keywords, gaps et améliorations CV."
          focuses={jobFocuses}
          value={jobPrompt}
          savedValue={jobSaved}
          isCustom={jobCustom}
          editable
          userMessageTemplate={jobUserTemplate}
          saving={savingKey === "job"}
          loading={loading}
          onChange={setJobPrompt}
          onSave={() =>
            void saveField("job", { job_match_system_prompt: jobPrompt })
          }
          onReset={() =>
            void saveField("job", { job_match_system_prompt: null })
          }
        />

        <PromptEditor
          title="Cover letter"
          description="Utilisé pour générer les lettres de motivation."
          focuses={coverFocuses}
          value={coverPrompt || "Chargement…"}
          savedValue={coverPrompt}
          isCustom={false}
          editable={false}
          saving={false}
          loading={loading}
          onChange={() => {}}
          onSave={() => {}}
          onReset={() => {}}
        />

        {!loading && !cvDefault && !jobDefault ? (
          <p className="text-sm text-muted-foreground">Aucun prompt chargé.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
