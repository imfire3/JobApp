"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, CheckCircle2, Eye, EyeOff, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AuthCardShell } from "@/components/auth/auth-card-shell";
import {
  ExtractionProgress,
  OnboardingProgress,
} from "@/components/onboarding/onboarding-progress";
import { cn } from "@/lib/utils";

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

type Mode = "login" | "signup" | "cv";

function initialMode(
  searchParams: URLSearchParams,
  allowSelfSignup: boolean
): Mode {
  if (allowSelfSignup && searchParams.get("signup") === "1") return "signup"
  if (searchParams.get("cv") === "1") return "cv"
  return "login"
}

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
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          tabIndex={0}
        >
          {visible ? (
            <Eye className="h-5 w-5" aria-hidden />
          ) : (
            <EyeOff className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

export default function LoginPageClient({
  allowSelfSignup = false,
}: {
  allowSelfSignup?: boolean
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>(() =>
    initialMode(searchParams, allowSelfSignup)
  );
  const [loading, setLoading] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [cvText, setCvText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsingCv, setParsingCv] = useState(false);
  const [cvReady, setCvReady] = useState(false);
  const [cvTab, setCvTab] = useState<"upload" | "paste">("upload");
  const pasteParseTimerRef = useRef<number | null>(null);
  const lastParsedPasteRef = useRef("");

  const canSubmitCv = !parsingCv && !loading && cvReady;

  const wantsCv = searchParams.get("cv") === "1"

  useEffect(() => {
    let cancelled = false;

    async function resumeOnboarding() {
      try {
        const statusRes = await fetch("/api/onboarding");
        if (cancelled) return;

        // Not logged in: CV import needs a session → signup first when allowed.
        if (statusRes.status === 401) {
          if (wantsCv && allowSelfSignup) {
            setMode("signup");
          }
          return;
        }

        if (!statusRes.ok) return;
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
          return;
        }

        // Logged in but no CV yet → always land on CV onboarding (never dashboard)
        setMode("cv");
        if (!wantsCv) {
          router.replace("/login?cv=1");
        }
      } catch {
        // stay on current login/cv step
      }
    }

    void resumeOnboarding();
    return () => {
      cancelled = true;
    };
  }, [router, wantsCv, allowSelfSignup]);

  async function handleFileChange(file: File | null) {
    if (!file) {
      setPdfFile(null);
      setCvReady(false);
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
      setCvReady(false);
      return;
    }

    setPdfFile(file);
    setCvReady(false);
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
        profile_filled?: boolean;
        profile_extract_error?: string | null;
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Impossible d’extraire le texte du CV");
      }
      const text = (data.extracted_text ?? "").trim();
      setCvText(text);
      const ready =
        Boolean(data.profile_filled) || text.length >= MIN_CV_LENGTH;
      if (!ready) {
        throw new Error(
          `CV trop court après extraction (min. ${MIN_CV_LENGTH} caractères)`
        );
      }
      setCvReady(true);
      if (data.profile_filled) {
        toast.success("CV analysé — tu peux continuer");
      } else if (data.profile_extract_error) {
        toast.success(
          `CV extrait · ${text.length} caractères${data.ocr_used ? " (OCR)" : ""}`
        );
        toast.message("Profil à compléter ensuite");
      } else {
        toast.success(
          `CV extrait · ${text.length} caractères${data.ocr_used ? " (OCR)" : ""}`
        );
      }
    } catch (error) {
      setPdfFile(null);
      setCvReady(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.error(
        error instanceof Error ? error.message : "Échec de l’extraction PDF"
      );
    } finally {
      setParsingCv(false);
    }
  }

  async function parsePastedCv(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < MIN_CV_LENGTH) {
      setCvReady(false);
      return;
    }
    if (trimmed === lastParsedPasteRef.current && cvReady) return;

    setParsingCv(true);
    setCvReady(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: trimmed }),
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Analyse du CV échouée");
      lastParsedPasteRef.current = trimmed;
      setCvReady(true);
      toast.success("CV analysé — tu peux continuer");
    } catch (error) {
      setCvReady(false);
      toast.error(
        error instanceof Error ? error.message : "Analyse du CV échouée"
      );
    } finally {
      setParsingCv(false);
    }
  }

  function handlePasteTextChange(value: string) {
    setCvText(value);
    setCvReady(false);
    if (pasteParseTimerRef.current) {
      window.clearTimeout(pasteParseTimerRef.current);
    }
    const trimmed = value.trim();
    if (trimmed.length < MIN_CV_LENGTH) return;
    pasteParseTimerRef.current = window.setTimeout(() => {
      void parsePastedCv(value);
    }, 400);
  }

  useEffect(() => {
    return () => {
      if (pasteParseTimerRef.current) {
        window.clearTimeout(pasteParseTimerRef.current);
      }
    };
  }, []);

  async function saveCvOnly() {
    if (cvTab === "upload" && pdfFile && cvReady) {
      return;
    }

    if (cvTab === "paste" && cvReady && cvText.trim().length >= MIN_CV_LENGTH) {
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Inscription échouée");
      }

      toast.success("Compte créé");
      setPassword("");
      setPasswordConfirm("");
      setMode("cv");
      router.replace("/login?cv=1");
      toast.message("Importe ton CV pour continuer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inscription échouée");
    } finally {
      setLoading(false);
    }
  }

  /** Localhost only: fill + create a disposable test account. */
  async function handleFakeFillSignup() {
    if (!allowSelfSignup) return
    const stamp = Date.now().toString(36)
    const fakeEmail = `dev+${stamp}@jobapp.local`
    const fakePassword = "password1"
    setIdentifier(fakeEmail)
    setPassword(fakePassword)
    setPasswordConfirm(fakePassword)
    setLoading(true)
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: fakeEmail,
          password: fakePassword,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      if (!response.ok) {
        throw new Error(payload.error ?? "Inscription échouée")
      }
      toast.success("Compte test créé")
      setPassword("")
      setPasswordConfirm("")
      setMode("cv")
      router.replace("/login?cv=1")
      toast.message("Importe ton CV pour continuer")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inscription échouée")
    } finally {
      setLoading(false)
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
      router.replace("/login?cv=1");
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
      // Import already persists structured profile server-side on file select;
      // paste/edit path triggers extract+persist via PUT /api/profile.
      await saveCvOnly();
      toast.success("CV enregistré — profil prêt");
      router.push("/onboarding/profile");
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
      ? "Ensuite on analyse ton profil, puis tu arrives sur le dashboard."
      : mode === "signup"
        ? "Crée ton compte, puis importe ton CV."
        : "Suis tes offres PO/PM, score les matches et génère des lettres.";

  if (mode === "cv") {
    return (
      <AuthCardShell className="!max-w-[640px]">
        <div
          className="flex w-full flex-col gap-8"
          data-ui="figma-cv-import-v2"
        >
          <OnboardingProgress current="cv" />

          <Card className="w-full gap-6 border border-border bg-card p-6 py-6 shadow-lg">
            <form onSubmit={handleCv} className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Briefcase className="size-8" aria-hidden />
                </div>
                <h1 className="text-[30px] font-medium leading-8 tracking-tight text-foreground">
                  Importe ton CV
                </h1>
                <p className="text-base leading-6 text-muted-foreground">
                  Ensuite on analyse ton profil, puis tu arrives sur le
                  dashboard.
                </p>
              </div>

              <Tabs
                value={cvTab}
                onValueChange={(value) => {
                  const next = value === "paste" ? "paste" : "upload"
                  setCvTab(next)
                  setCvReady(false)
                  if (next === "upload") {
                    setCvReady(
                      Boolean(pdfFile) && cvText.trim().length >= MIN_CV_LENGTH
                    )
                  } else if (
                    lastParsedPasteRef.current &&
                    lastParsedPasteRef.current === cvText.trim()
                  ) {
                    setCvReady(true)
                  }
                }}
                className="w-full gap-4"
              >
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-muted p-2">
                  <TabsTrigger
                    value="upload"
                    disabled={loading || parsingCv}
                    className={cn(
                      "h-auto rounded-lg border border-transparent bg-transparent px-3.5 py-2.5 text-[13px] font-medium leading-[18px] text-muted-foreground shadow-none",
                      "hover:text-foreground",
                      "data-active:border-border data-active:bg-background data-active:text-foreground data-active:shadow-none"
                    )}
                  >
                    Importer mon CV
                  </TabsTrigger>
                  <TabsTrigger
                    value="paste"
                    disabled={loading || parsingCv}
                    className={cn(
                      "h-auto rounded-lg border border-transparent bg-transparent px-3.5 py-2.5 text-[13px] font-medium leading-[18px] text-muted-foreground shadow-none",
                      "hover:text-foreground",
                      "data-active:border-border data-active:bg-background data-active:text-foreground data-active:shadow-none"
                    )}
                  >
                    Coller mon CV
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-0 outline-none">
                  <input
                    ref={fileInputRef}
                    id="cv-pdf"
                    type="file"
                    accept=".pdf,application/pdf,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    className="sr-only"
                    disabled={loading || parsingCv}
                    onChange={(e) =>
                      void handleFileChange(e.target.files?.[0] ?? null)
                    }
                  />
                  <div
                    className={cn(
                      "relative flex h-[220px] min-h-[220px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center transition-colors",
                      (pdfFile || parsingCv) && "border-primary/40 bg-primary/5"
                    )}
                  >
                    {parsingCv && cvTab === "upload" ? (
                      <div className="w-full max-w-md px-2">
                        <ExtractionProgress
                          active
                          label="Analyse du CV…"
                          className="border-0 bg-transparent p-0"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={loading || parsingCv}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full flex-col items-center justify-center gap-2 touch-manipulation transition-opacity disabled:opacity-50 hover:opacity-90"
                        aria-label="Importer un fichier CV"
                      >
                        {cvReady && pdfFile ? (
                          <CheckCircle2
                            className="size-8 text-primary"
                            aria-hidden
                          />
                        ) : (
                          <FileUp
                            className="size-8 text-foreground"
                            aria-hidden
                          />
                        )}
                        <span className="break-all text-lg font-semibold leading-6 text-foreground">
                          {pdfFile ? pdfFile.name : "Importer un fichier PDF"}
                        </span>
                        <span className="text-base leading-6 text-muted-foreground">
                          {pdfFile
                            ? `${formatFileSize(pdfFile.size)} · Appuie pour changer`
                            : "CV au format PDF ou image"}
                        </span>
                        {cvReady && pdfFile ? (
                          <span className="mt-1 text-base font-medium text-primary">
                            Analyse terminée
                          </span>
                        ) : null}
                      </button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="mt-0 outline-none">
                  <div className="relative flex h-[220px] min-h-[220px] flex-col rounded-2xl border border-dashed border-border bg-muted/20 p-3">
                    {parsingCv && cvTab === "paste" ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/80 p-4 backdrop-blur-[1px]">
                        <ExtractionProgress
                          active
                          label="Analyse du CV…"
                          className="w-full max-w-md border-0 bg-transparent"
                        />
                      </div>
                    ) : null}
                    <Label htmlFor="cv-text" className="sr-only">
                      Coller mon CV
                    </Label>
                    <Textarea
                      id="cv-text"
                      value={cvText}
                      onChange={(e) => handlePasteTextChange(e.target.value)}
                      disabled={loading || parsingCv}
                      placeholder="Colle ici le contenu de ton CV…"
                      className="h-full min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent font-mono text-base leading-6 shadow-none focus-visible:ring-0"
                    />
                  </div>
                  {cvText.trim().length > 0 && !parsingCv ? (
                    <p className="mt-2 text-base leading-6 text-muted-foreground">
                      {cvText.trim().length < MIN_CV_LENGTH
                        ? `${cvText.trim().length} / ${MIN_CV_LENGTH} caractères minimum`
                        : cvReady
                          ? `${cvText.trim().length} caractères · prêt`
                          : `${cvText.trim().length} caractères`}
                    </p>
                  ) : null}
                </TabsContent>
              </Tabs>

              <Button
                type="submit"
                size="lg"
                className="h-14 min-h-14 w-full text-lg font-medium"
                disabled={!canSubmitCv}
              >
                {loading || parsingCv ? "Analyse…" : "Suivant"}
              </Button>
            </form>
          </Card>
        </div>
      </AuthCardShell>
    );
  }

  if (mode === "signup") {
    if (!allowSelfSignup) {
      return null
    }
    return (
      <AuthCardShell>
        <Card className="w-full text-base shadow-lg">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Briefcase className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl leading-8 tracking-tight">
              {title}
            </CardTitle>
            <CardDescription className="text-base leading-6">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="signup-identifier">Email</Label>
                <Input
                  id="signup-identifier"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  enterKeyHint="next"
                  placeholder="monemail@gmail.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <PasswordField
                id="signup-password"
                label="Mot de passe"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                enterKeyHint="next"
                minLength={MIN_PASSWORD_LENGTH}
              />
              <PasswordField
                id="signup-password-confirm"
                label="Confirmer le mot de passe"
                value={passwordConfirm}
                onChange={setPasswordConfirm}
                autoComplete="new-password"
                enterKeyHint="go"
                minLength={MIN_PASSWORD_LENGTH}
              />
              <p className="text-base leading-6 text-muted-foreground">
                Au moins {MIN_PASSWORD_LENGTH} caractères. Les deux champs doivent
                être identiques.
              </p>
              <div className="relative z-10 space-y-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="relative z-10 w-full"
                  disabled={loading}
                  onClick={() => void handleFakeFillSignup()}
                  aria-label="Remplir avec des données de test"
                >
                  Fake fill data
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="relative z-10 w-full"
                  disabled={loading}
                >
                  {loading ? "Patiente…" : "Créer mon compte"}
                </Button>
              </div>
            </form>
            <p className="mt-6 text-center text-base leading-6 text-muted-foreground">
              Déjà un compte ?{" "}
              <Link
                href="/login"
                className="underline underline-offset-4 hover:text-foreground"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault()
                  setMode("login")
                  router.replace("/login")
                }}
              >
                Connexion
              </Link>
            </p>
          </CardContent>
        </Card>
      </AuthCardShell>
    )
  }

  return (
    <AuthCardShell>
      <Card className="w-full text-base shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Briefcase className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl leading-8 tracking-tight">
            {title}
          </CardTitle>
          <CardDescription className="text-base leading-6">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
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
            <div className="relative z-10 pt-2">
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
          <p className="mt-6 text-center text-base leading-6 text-muted-foreground">
            Pas encore de compte ?{" "}
            {allowSelfSignup ? (
              <Link
                href="/login?signup=1"
                className="underline underline-offset-4 hover:text-foreground"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault()
                  setMode("signup")
                  router.replace("/login?signup=1")
                }}
              >
                En créer un
              </Link>
            ) : (
              <Link
                href="/"
                className="underline underline-offset-4 hover:text-foreground"
                tabIndex={0}
              >
                Demander un accès démo
              </Link>
            )}
          </p>
        </CardContent>
      </Card>
    </AuthCardShell>
  );
}
