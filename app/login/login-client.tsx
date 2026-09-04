"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, CheckCircle2, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Keep in sync with lib/cv-analysis/service.ts MIN_CV_LENGTH */
const MIN_CV_LENGTH = 200;

type Mode = "login" | "signup" | "cv";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [cvText, setCvText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const canSubmitSignup =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    signupPassword.trim().length >= 5;

  const canSubmitCv = Boolean(pdfFile) || cvText.trim().length >= MIN_CV_LENGTH;

  function handleFileChange(file: File | null) {
    if (!file) {
      setPdfFile(null);
      return;
    }
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Choisis un fichier PDF");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPdfFile(null);
      return;
    }
    setPdfFile(file);
    toast.success(`Fichier sélectionné : ${file.name}`);
  }

  async function saveCvOnly() {
    if (pdfFile) {
      const formData = new FormData();
      formData.append("file", pdfFile);
      const res = await fetch("/api/profile/import-cv", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        extracted_text?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Import PDF échoué");
      const text = data.extracted_text ?? "";
      setCvText(text);
      if (text.trim().length < MIN_CV_LENGTH) {
        throw new Error(
          `CV trop court après extraction (min. ${MIN_CV_LENGTH} caractères). Complète le texte.`
        );
      }
    } else {
      if (cvText.trim().length < MIN_CV_LENGTH) {
        throw new Error(`Ajoute au moins ${MIN_CV_LENGTH} caractères de CV`);
      }
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Sauvegarde CV échouée");
    }
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
        has_tracked_search?: boolean;
      };

      if (status.completed) {
        router.push(status.has_tracked_search ? "/jobs?extension=1" : "/dashboard");
        router.refresh();
        return;
      }

      if (status.has_cv) {
        router.push("/onboarding/metiers");
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password: signupPassword,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Inscription échouée");
      }

      toast.success("Compte créé — importe ton CV");
      setMode("cv");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inscription échouée");
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
      router.push("/onboarding/metiers");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import CV échoué");
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "cv"
      ? "Importe ton CV"
      : mode === "signup"
        ? "Créer un compte"
        : "Connexion";
  const description =
    mode === "cv"
      ? "Ensuite tu choisiras ton métier pour créer ta première alerte."
      : "Track PO/PM offers, score matches, generate cover letters.";

  if (mode === "cv") {
    return (
      <div className="flex h-dvh flex-col bg-muted/30">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-4">
          <Card className="mx-auto w-full max-w-2xl shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Briefcase className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  id="cv-pdf"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  disabled={loading}
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  disabled={loading}
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
                    {pdfFile ? pdfFile.name : "Importer un fichier PDF"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {pdfFile
                      ? `${formatFileSize(pdfFile.size)} · Appuie pour changer`
                      : "CV au format PDF"}
                  </span>
                </button>
                {pdfFile ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                    <p className="font-medium text-foreground">Fichier prêt</p>
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
                  disabled={loading || Boolean(pdfFile)}
                  placeholder="Expérience, compétences, outils, résultats…"
                  className="min-h-[180px] font-mono text-base md:text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {pdfFile
                    ? "Le texte sera extrait du PDF à l’import."
                    : `${cvText.trim().length} / ${MIN_CV_LENGTH} caractères minimum`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="sticky bottom-0 z-20 border-t border-border/80 bg-background/95 px-4 py-4 backdrop-blur supports-backdrop-filter:bg-background/85 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <form onSubmit={handleCv} className="mx-auto w-full max-w-2xl">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || !canSubmitCv}
            >
              {loading ? "Patiente…" : "Importer mon CV"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Briefcase className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            className="mb-4 w-full rounded-lg border bg-muted/50 p-3 text-left text-sm text-muted-foreground touch-manipulation active:bg-muted"
            onClick={() => {
              if (mode === "login") {
                setIdentifier("admin");
                setPassword("admin");
              }
            }}
          >
            Demo : <span className="font-medium text-foreground">admin</span> /{" "}
            <span className="font-medium text-foreground">admin</span>
            {mode === "login" ? (
              <span className="mt-1 block text-xs">Appuie ici pour remplir</span>
            ) : null}
          </button>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or username</Label>
                <Input
                  id="identifier"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  enterKeyHint="next"
                  placeholder="admin"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  placeholder="admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={5}
                />
              </div>
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
          ) : null}

          {mode === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">Prénom</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Nom</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  required
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="toi@gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Mot de passe</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={5}
                  autoComplete="new-password"
                />
              </div>
              <div className="relative z-10 pt-1">
                <Button
                  type="submit"
                  size="lg"
                  className="relative z-10 w-full"
                  disabled={loading || !canSubmitSignup}
                >
                  {loading ? "Patiente…" : "S'inscrire"}
                </Button>
              </div>
            </form>
          ) : null}

          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Tu as déjà un compte ?" : "Pas encore de compte ?"}
            </p>
            <Button
              type="button"
              variant="link"
              size="lg"
              className="w-full text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            >
              {mode === "signup" ? "Se connecter" : "Créer un compte"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
