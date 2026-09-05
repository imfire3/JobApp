"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, CheckCircle2, Eye, EyeOff, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AuthCardShell } from "@/components/auth/auth-card-shell";

/** Keep in sync with lib/cv-analysis/service.ts MIN_CV_LENGTH */
const MIN_CV_LENGTH = 200;
const MIN_PASSWORD_LENGTH = 8;

/** Common email TLDs — reject unknown / incomplete extensions */
const KNOWN_EMAIL_TLDS = new Set([
  "com",
  "net",
  "org",
  "edu",
  "gov",
  "io",
  "co",
  "app",
  "dev",
  "ai",
  "me",
  "info",
  "biz",
  "fr",
  "be",
  "ch",
  "ca",
  "uk",
  "de",
  "es",
  "it",
  "nl",
  "pt",
  "eu",
  "us",
  "online",
  "tech",
  "cloud",
  "email",
  "pro",
]);

function isValidEmail(value: string) {
  const email = value.trim().toLowerCase();
  const match = email.match(/^[^\s@]+@([^\s@]+\.)+([a-z]{2,24})$/i);
  if (!match) return false;
  const tld = match[2]?.toLowerCase() ?? "";
  return KNOWN_EMAIL_TLDS.has(tld);
}

type Mode = "login" | "signup" | "cv";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function isStrongPassword(password: string) {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= MIN_PASSWORD_LENGTH,
    uppercase: /[A-Z]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function PasswordRule({
  ok,
  active,
  label,
}: {
  ok: boolean;
  active: boolean;
  label: string;
}) {
  const color = !active
    ? "text-muted-foreground"
    : ok
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

  return (
    <li className={`flex items-center gap-2 text-xs ${color}`}>
      <span aria-hidden className="font-semibold">
        {active ? (ok ? "✓" : "✗") : "•"}
      </span>
      <span>{label}</span>
    </li>
  );
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [showPasswordMismatch, setShowPasswordMismatch] = useState(false);

  const [cvText, setCvText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsingCv, setParsingCv] = useState(false);

  const passwordChecks = getPasswordChecks(signupPassword);
  const passwordRulesActive = signupPassword.length > 0;
  const emailLooksValid = isValidEmail(email);
  const showEmailError = email.trim().length > 0 && !emailLooksValid;
  const canSubmitSignup =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    emailLooksValid &&
    isStrongPassword(signupPassword) &&
    signupPasswordConfirm.length > 0;

  const canSubmitCv =
    !parsingCv &&
    (Boolean(pdfFile) || cvText.trim().length >= MIN_CV_LENGTH);

  useEffect(() => {
    let cancelled = false;

    async function resumeOnboarding() {
      try {
        const statusRes = await fetch("/api/onboarding");
        if (!statusRes.ok || cancelled) return;
        const status = (await statusRes.json().catch(() => ({}))) as {
          completed?: boolean;
          has_cv?: boolean;
          has_tracked_search?: boolean;
          step?: string;
        };

        if (cancelled) return;

        if (status.completed || status.has_tracked_search) {
          router.replace(status.has_tracked_search ? "/jobs?extension=1" : "/dashboard");
          return;
        }

        if (status.has_cv || status.step === "metiers") {
          router.replace("/onboarding/api-keys");
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
    if (!isPdf) {
      toast.error("Choisis un fichier PDF");
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
      const data = (await res.json()) as {
        extracted_text?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Impossible d’extraire le texte du PDF");
      }
      const text = (data.extracted_text ?? "").trim();
      setCvText(text);
      toast.success(
        text
          ? `CV extrait · ${text.length} caractères`
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
      const data = (await res.json()) as { error?: string };
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
    const data = (await res.json()) as { error?: string };
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
        has_tracked_search?: boolean;
      };

      if (status.completed) {
        router.push(status.has_tracked_search ? "/jobs?extension=1" : "/dashboard");
        router.refresh();
        return;
      }

      if (status.has_cv) {
        router.push("/onboarding/api-keys");
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
    if (!isStrongPassword(signupPassword)) {
      toast.error(
        "Mot de passe : 8 caractères min., 1 majuscule et 1 caractère spécial"
      );
      return;
    }
    if (signupPassword !== signupPasswordConfirm) {
      setShowPasswordMismatch(true);
      return;
    }
    setShowPasswordMismatch(false);
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
      router.push("/onboarding/api-keys");
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
      ? "Ensuite tu configureras tes clés API, puis ton métier."
      : "Track PO/PM offers, score matches, generate cover letters.";

  if (mode === "cv") {
    return (
      <AuthCardShell>
        <Card className="w-full shadow-lg">
          <form onSubmit={handleCv}>
            <CardHeader className="text-center">
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
                  accept=".pdf,application/pdf"
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
                    {cvText.trim().length} caractères
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
                  placeholder="monemail@gmail.com"
                  aria-invalid={showEmailError || undefined}
                  aria-describedby={showEmailError ? "email-error" : undefined}
                />
                {showEmailError ? (
                  <p
                    id="email-error"
                    className="text-xs text-red-600 dark:text-red-400"
                    role="alert"
                  >
                    Ce n’est pas un bon email
                  </p>
                ) : null}
              </div>
              <PasswordField
                id="signup-password"
                label="Mot de passe"
                value={signupPassword}
                onChange={(value) => {
                  setSignupPassword(value);
                  setShowPasswordMismatch(false);
                }}
                autoComplete="new-password"
                enterKeyHint="next"
              />
              <PasswordField
                id="signup-password-confirm"
                label="Confirmer le mot de passe"
                value={signupPasswordConfirm}
                onChange={(value) => {
                  setSignupPasswordConfirm(value);
                  setShowPasswordMismatch(false);
                }}
                autoComplete="new-password"
                enterKeyHint="done"
              />
              <ul className="space-y-1.5" aria-live="polite">
                <PasswordRule
                  active={passwordRulesActive}
                  ok={passwordChecks.minLength}
                  label="8 caractères minimum"
                />
                <PasswordRule
                  active={passwordRulesActive}
                  ok={passwordChecks.uppercase}
                  label="Au moins une majuscule"
                />
                <PasswordRule
                  active={passwordRulesActive}
                  ok={passwordChecks.special}
                  label="Au moins un caractère spécial"
                />
              </ul>
              {showPasswordMismatch ? (
                <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                  Les deux mots de passe ne correspondent pas
                </p>
              ) : null}
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
    </AuthCardShell>
  );
}
