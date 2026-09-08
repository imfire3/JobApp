"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, CheckCircle2, Eye, EyeOff, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AuthCardShell } from "@/components/auth/auth-card-shell";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";

/** Keep in sync with lib/cv-analysis/service.ts MIN_CV_LENGTH */
const MIN_CV_LENGTH = 200;
const MIN_PASSWORD_LENGTH = 8;

async function readApiJson<T extends Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.status === 401
        ? "Session expirée — reconnecte-toi"
        : res.status >= 500
          ? "Serveur indisponible — réessaie dans un instant"
          : "Réponse serveur invalide"
    );
  }
}

type Mode = "login" | "cv";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  enterKeyHint,
  required = true,
  minLength = MIN_PASSWORD_LENGTH,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  enterKeyHint?: "go" | "next" | "done";
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          enterKeyHint={enterKeyHint}
          placeholder="**********"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          className="pr-11"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          tabIndex={0}
        >
          {visible ? (
            <Eye className="h-4 w-4" aria-hidden />
          ) : (
            <EyeOff className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>(
    searchParams.get("cv") === "1" ? "cv" : "login"
  );
  const [loading, setLoading] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [cvText, setCvText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsingCv, setParsingCv] = useState(false);

  const canSubmitCv =
    !parsingCv && (Boolean(pdfFile) || cvText.trim().length > 0);

  useEffect(() => {
    let cancelled = false;

    async function resumeOnboarding() {
      try {
        const statusRes = await fetch("/api/onboarding");
        if (!statusRes.ok || cancelled) return;
        const status = (await statusRes.json().catch(() => ({}))) as {
          completed?: boolean;
          has_cv?: boolean;
          has_profile_reviewed?: boolean;
          has_tracked_search?: boolean;
          step?: string;
        };

        if (cancelled) return;

        if (status.completed || status.step === "done") {
          router.replace("/dashboard");
          return;
        }

        if (status.step === "api-keys" || status.has_profile_reviewed) {
          router.replace("/dashboard");
          return;
        }

        if (status.has_cv || status.step === "profile") {
          router.replace("/onboarding/profile");
        }
      } catch {
        // stay on current login/cv step
      }
    }

    void resumeOnboarding();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleFileChange(file: File | null) {
    if (!file) {
      setPdfFile(null);
      return;
    }
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage =
      ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type) ||
      /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!isPdf && !isImage) {
      toast.error("Choisis un fichier PDF ou une image (PNG/JPEG/WebP)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPdfFile(null);
      return;
    }

    setPdfFile(file);
    setParsingCv(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/import-cv", {
        method: "POST",
        body: formData,
      });
      const data = await readApiJson<{
        extracted_text?: string;
        text_length?: number;
        ocr_used?: boolean;
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Impossible d’extraire le texte du CV");
      }
      const text = (data.extracted_text ?? "").trim();
      setCvText(text);
      toast.success(
        text
          ? `CV extrait · ${text.length} caractères${data.ocr_used ? " (OCR)" : ""}`
          : `Fichier sélectionné : ${file.name}`
      );
    } catch (error) {
      setPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.error(
        error instanceof Error ? error.message : "Échec de l’extraction PDF"
      );
    } finally {
      setParsingCv(false);
    }
  }

  async function saveCvOnly() {
    if (pdfFile && cvText.trim().length >= MIN_CV_LENGTH) {
      // Already parsed + saved by import-cv on file select; refresh text if edited.
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText }),
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Sauvegarde CV échouée");
      return;
    }

    if (pdfFile) {
      const formData = new FormData();
      formData.append("file", pdfFile);
      const res = await fetch("/api/profile/import-cv", {
        method: "POST",
        body: formData,
      });
      const data = await readApiJson<{
        extracted_text?: string;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Import PDF échoué");
      const text = data.extracted_text ?? "";
      setCvText(text);
      if (text.trim().length < MIN_CV_LENGTH) {
        throw new Error(
          `CV trop court après extraction (min. ${MIN_CV_LENGTH} caractères). Complète le texte.`
        );
      }
      return;
    }

    if (cvText.trim().length < MIN_CV_LENGTH) {
      throw new Error(`Ajoute au moins ${MIN_CV_LENGTH} caractères de CV`);
    }
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cv_text: cvText }),
    });
    const data = await readApiJson<{ error?: string }>(res);
    if (!res.ok) throw new Error(data.error ?? "Sauvegarde CV échouée");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Connexion échouée");
      }

      toast.success("Connecté");
      const statusRes = await fetch("/api/onboarding");
      const status = (await statusRes.json().catch(() => ({}))) as {
        completed?: boolean;
        has_cv?: boolean;
        has_profile_reviewed?: boolean;
        has_tracked_search?: boolean;
        step?: string;
      };

      if (status.completed || status.step === "done" || status.has_profile_reviewed) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (status.has_cv || status.step === "profile") {
        router.push("/onboarding/profile");
        router.refresh();
        return;
      }

      setMode("cv");
      toast.message("Importe ton CV pour continuer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connexion échouée");
    } finally {
      setLoading(false);
    }
  }

  async function handleCv(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await saveCvOnly();
      toast.success("CV importé");
      router.push("/onboarding/profile");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import CV échoué");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "cv" ? "Importe ton CV" : "Connexion";
  const description =
    mode === "cv"
      ? "Ensuite tu configureras tes clés API, puis tu arrives sur le dashboard."
      : "Track PO/PM offers, score matches, generate cover letters.";

  if (mode === "cv") {
    return (
      <AuthCardShell>
        <Card className="w-full shadow-lg">
          <form onSubmit={handleCv}>
            <CardHeader className="space-y-4 text-center">
              <OnboardingProgress current="cv" className="text-left" />
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Briefcase className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription className="pb-4">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  id="cv-pdf"
                  type="file"
                  accept=".pdf,application/pdf,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  className="sr-only"
                  disabled={loading || parsingCv}
                  onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  disabled={loading || parsingCv}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-center touch-manipulation transition-colors disabled:opacity-50 ${
                    pdfFile
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20 hover:border-primary hover:bg-muted/40 active:bg-muted/60"
                  }`}
                >
                  {pdfFile ? (
                    <CheckCircle2 className="h-7 w-7 text-primary" />
                  ) : (
                    <FileUp className="h-6 w-6 text-foreground" />
                  )}
                  <span className="break-all text-base font-semibold text-foreground">
                    {parsingCv
                      ? "Extraction du texte…"
                      : pdfFile
                        ? pdfFile.name
                        : "Importer un fichier PDF"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {pdfFile
                      ? `${formatFileSize(pdfFile.size)} · Appuie pour changer`
                      : "CV au format PDF"}
                  </span>
                </button>
                {pdfFile ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                    <p className="font-medium text-foreground">
                      {parsingCv ? "Analyse en cours…" : "Fichier prêt"}
                    </p>
                    <p className="mt-1 break-all text-muted-foreground">{pdfFile.name}</p>
                    <p className="mt-1 text-muted-foreground">{formatFileSize(pdfFile.size)}</p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv-text">Ou colle ton CV</Label>
                <Textarea
                  id="cv-text"
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  rows={10}
                  disabled={loading || parsingCv}
                  placeholder="Expérience, compétences, outils, résultats…"
                  className="max-h-[40vh] min-h-[180px] overflow-y-auto font-mono text-base md:text-sm"
                />
                {parsingCv ? (
                  <p className="text-xs text-muted-foreground">
                    Extraction automatique du PDF…
                  </p>
                ) : cvText.trim().length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {cvText.trim().length < MIN_CV_LENGTH
                      ? `${cvText.trim().length} / ${MIN_CV_LENGTH} caractères minimum`
                      : `${cvText.trim().length} caractères`}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading || parsingCv || !canSubmitCv}
              >
                {loading || parsingCv
                  ? "Patiente…"
                  : canSubmitCv
                    ? "Continuer"
                    : "Importer mon CV"}
              </Button>
            </CardContent>
          </form>
        </Card>
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell>
      <Card className="w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Briefcase className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or username</Label>
              <Input
                id="identifier"
                type="text"
                inputMode="email"
                autoComplete="username"
                enterKeyHint="next"
                placeholder="monemail@gmail.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              enterKeyHint="go"
              minLength={1}
            />
            <div className="relative z-10 pt-1">
              <Button
                type="submit"
                size="lg"
                className="relative z-10 w-full"
                disabled={loading}
              >
                {loading ? "Patiente…" : "Se connecter"}
              </Button>
            </div>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Pas encore de compte ? Demande un accès démo depuis la{" "}
            <Link
              href="/"
              className="underline underline-offset-4 hover:text-foreground"
              tabIndex={0}
            >
              page d’accueil
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </AuthCardShell>
  );
}
