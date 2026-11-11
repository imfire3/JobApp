"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, Check, CheckCircle2, Circle, Eye, EyeOff, FileUp, MailCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AuthCardShell } from "@/components/auth/auth-card-shell";
import { CvImportProgress } from "@/components/cv/CvImportProgress";
import { cn } from "@/lib/utils";
import {
  PASSWORD_RULES,
  passwordRuleFailures,
} from "@/lib/auth/password-rules";

/** Keep in sync with lib/cv-analysis/service.ts MIN_CV_LENGTH */
const MIN_CV_LENGTH = 10;

const MAX_CV_FILE_SIZE_BYTES = 25 * 1024 * 1024;
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

type Mode = "login" | "signup" | "cv" | "confirm" | "forgot";

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
  onBlur,
  autoComplete,
  enterKeyHint,
  required = true,
  minLength,
  placeholder = "**********",
  showErrors = false,
  describedBy,
  invalid: invalidProp = false,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete: string;
  enterKeyHint?: "go" | "next" | "done";
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  showErrors?: boolean;
  describedBy?: string;
  invalid?: boolean;
  error?: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);

  const revealErrors = touched || showErrors;
  const visibleError = error && revealErrors ? error : null;
  const isInvalid = invalidProp || Boolean(visibleError);
  const errorId = `${id}-error`;
  const describedByValue =
    [
      describedBy ?? null,
      visibleError ? errorId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium leading-5 text-[#fafafa]">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          enterKeyHint={enterKeyHint}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            setTouched(true);
            onBlur?.();
          }}
          required={required}
          minLength={minLength}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedByValue}
          className="h-11 rounded-[6px] border-[#404040] bg-[#262626] px-3 pr-11 text-sm text-[#fafafa] placeholder:text-[#737373] focus-visible:border-[#737373] focus-visible:ring-1 focus-visible:ring-[#a3a3a3] dark:bg-[#262626]"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#737373] transition-colors hover:text-[#fafafa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3a3a3]"
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
      {visibleError && (
        <p id={errorId} role="alert" className="text-sm leading-5 text-destructive">
          {visibleError}
        </p>
      )}
    </div>
  );
}

function PasswordRequirements({
  id,
  value,
  revealErrors,
}: {
  id: string;
  value: string;
  revealErrors: boolean;
}) {
  const showFailures = value.length > 0 && revealErrors;

  return (
    <div id={id} className="space-y-1.5">
      <p className="text-sm leading-5 text-[#a3a3a3]">
        Votre mot de passe doit respecter les conditions suivantes :
      </p>
      <ul className="space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const pass = value.length > 0 && rule.test(value);
          const fail = showFailures && !pass;
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-start gap-2 text-sm leading-5",
                fail
                  ? "text-destructive"
                  : pass
                    ? "text-success"
                : "text-[#a3a3a3]"
              )}
            >
              {fail ? (
                <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              ) : pass ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              )}
              <span>{fail ? rule.error : rule.help}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function LoginPageClient({
  allowSelfSignup = false,
  hostedSignup = false,
}: {
  allowSelfSignup?: boolean
  hostedSignup?: boolean
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
  const [signupAttempted, setSignupAttempted] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const [cvText, setCvText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsingCv, setParsingCv] = useState(false);
  const [cvReady, setCvReady] = useState(false);
  const [cvTab, setCvTab] = useState<"upload" | "paste">("upload");
  const [importStep, setImportStep] = useState<"idle" | "upload" | "extract" | "analyze" | "save" | "done" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const pasteParseTimerRef = useRef<number | null>(null);
  const lastParsedPasteRef = useRef("");

  const canSubmitCv = !parsingCv && !loading && cvReady;
  const revealPasswordErrors = passwordTouched || signupAttempted;

  const wantsCv = searchParams.get("cv") === "1"
  const authError = searchParams.get("error")
  const justConfirmed = searchParams.get("confirmed") === "1"

  async function handleResendConfirmation() {
    const email = (confirmationEmail || identifier).trim()
    if (!email) {
      toast.error("Renseigne l’adresse e-mail du compte.")
      return
    }
    setResending(true)
    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        message?: string
      }
      if (!response.ok) throw new Error(payload.error ?? "Envoi impossible")
      toast.success(payload.message ?? "E-mail de confirmation renvoyé.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible")
    } finally {
      setResending(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier.trim()) {
      document.getElementById("forgot-identifier")?.focus()
      return
    }
    setLoading(true)
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier.trim() }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        message?: string
      }
      if (!response.ok) throw new Error(payload.error ?? "Envoi impossible")
      setForgotSent(true)
      toast.success(payload.message ?? "E-mail de réinitialisation envoyé.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false;
    let retried = false;

    async function resumeOnboarding() {
      try {
        const statusRes = await fetch("/api/onboarding");
        if (cancelled) return;

        // Not logged in: CV import needs a session → signup first when allowed.
        if (statusRes.status === 401) {
          // If we're on cv=1 (just signed up), retry once after a short delay
          // to allow session cookie to be ready
          if (wantsCv && !retried) {
            retried = true;
            await new Promise((r) => setTimeout(r, 300));
            if (!cancelled) {
              return resumeOnboarding();
            }
          }
          if (wantsCv && allowSelfSignup) {
            setMode("signup");
          } else if (wantsCv) {
            // Direct link to CV import without a session: ask the visitor to
            // sign in first, then the login handler resumes at the CV step.
            setMode("login");
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

  function startImportTimeline(options?: { paste?: boolean }) {
    const startedAt = Date.now();
    const uploadMs = options?.paste ? 0 : 2000;
    const apply = () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed < uploadMs) {
        setImportStep("upload");
        setImportMessage("Réception de ton fichier…");
      } else if (elapsed < 6000) {
        setImportStep("extract");
        setImportMessage("Lecture et extraction du texte…");
      } else if (elapsed < 18000) {
        setImportStep("analyze");
        setImportMessage("Analyse de tes expériences et compétences…");
      } else {
        setImportStep("save");
        setImportMessage(
          `Création de ton profil… (${Math.round(elapsed / 1000)}s)`
        );
      }
    };
    apply();
    const timer = window.setInterval(apply, 800);
    return () => window.clearInterval(timer);
  }

  async function handleFileChange(file: File | null) {
    if (!file) {
      setPdfFile(null);
      setCvReady(false);
      setImportStep("idle");
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

    if (file.size > MAX_CV_FILE_SIZE_BYTES) {
      toast.error("Ce fichier dépasse 25 Mo. Choisis une version plus légère.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPdfFile(null);
      setCvReady(false);
      return;
    }

    setPdfFile(file);
    setCvReady(false);
    setImportStep("upload");
    setImportMessage("Réception de ton fichier…");
    setParsingCv(true);
    const clearTimeline = startImportTimeline();

    try {
      let res: Response | undefined;
      let fetchError: unknown;
      let importConfirmedWithoutResponse = false;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          res = await fetch("/api/profile/import-cv", {
            method: "POST",
            body: formData,
          });
          fetchError = undefined;
          break;
        } catch (error) {
          fetchError = error;

          // The upload may have completed even if the browser lost the response.
          // Confirm persisted server state before sending the same CV again.
          try {
            const statusRes = await fetch("/api/onboarding", {
              cache: "no-store",
            });
            const status = await readApiJson<{
              has_cv?: boolean;
              has_profile_reviewed?: boolean;
              step?: string;
            }>(statusRes);
            if (
              statusRes.ok &&
              (status.has_cv ||
                status.has_profile_reviewed ||
                status.step === "profile" ||
                status.step === "done")
            ) {
              importConfirmedWithoutResponse = true;
              fetchError = undefined;
              break;
            }
          } catch {
            // The status check is best-effort; retry the upload once below.
          }

          if (attempt === 0) {
            setImportMessage("Connexion interrompue, nouvelle tentative…");
            await new Promise((resolve) => window.setTimeout(resolve, 500));
          }
        }
      }
      if (importConfirmedWithoutResponse) {
        setImportStep("done");
        setImportMessage("CV enregistré ! Redirection…");
        setCvReady(true);
        toast.success("CV importé — profil enregistré");
        router.push("/onboarding/profile");
        router.refresh();
        return;
      }
      if (fetchError || !res) {
        throw new Error(
          fetchError instanceof TypeError && fetchError.message === "Failed to fetch"
            ? "L’envoi du CV a été interrompu deux fois. Réessaie ou choisis un fichier de moins de 25 Mo."
            : fetchError instanceof Error
              ? fetchError.message
              : "Erreur réseau inattendue"
        );
      }
      const data = await readApiJson<{
        extracted_text?: string;
        text_length?: number;
        ocr_used?: boolean;
        profile_filled?: boolean;
        profile_extract_error?: string | null;
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Impossible d'extraire le texte du CV");
      }

      const text = (data.extracted_text ?? "").trim();
      setCvText(text);

      const ready =
        Boolean(data.profile_filled) || text.length >= MIN_CV_LENGTH;
      if (!ready) {
        throw new Error(
          "CV trop court après extraction (min. " + MIN_CV_LENGTH + " caractères)"
        );
      }

      // /api/profile/import-cv already persisted cv_text + structured profile
      // server-side. Do NOT call saveCvOnly() here: it closes over this render's
      // stale state (pdfFile/cvText are still null/empty) and would throw
      // "Ajoute au moins X caractères" even though the import succeeded.

      setImportStep("done");
      setImportMessage("Profil prêt ! Redirection…");

      setCvReady(true);
      toast.success("CV importé — redirection vers ton dashboard");

      setTimeout(() => {
        router.push("/onboarding/profile");
        router.refresh();
      }, 800);
    } catch (error) {
      setImportStep("error");
      setImportMessage(error instanceof Error ? error.message : "Erreur lors de l'import");
      setPdfFile(null);
      setCvReady(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.error(
        error instanceof Error ? error.message : "Échec de l'extraction PDF"
      );
    } finally {
      clearTimeline();
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
    const clearTimeline = startImportTimeline({ paste: true });
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
      setImportStep("done");
      setImportMessage("CV analysé !");
      toast.success("CV analysé — tu peux continuer");
    } catch (error) {
      setCvReady(false);
      setImportStep("error");
      setImportMessage(
        error instanceof Error ? error.message : "Analyse du CV échouée"
      );
      toast.error(
        error instanceof Error ? error.message : "Analyse du CV échouée"
      );
    } finally {
      clearTimeline();
      setParsingCv(false);
    }
  }

  function handlePasteTextChange(value: string) {
    setCvText(value);
    setCvReady(false);
    setImportStep("idle");
    setImportMessage("");
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
      // Ne bloque jamais si le CV existe déjà côté serveur (état local perdu
      // après un rechargement / navigation). Seul vrai cas bloquant : rien nulle part.
      try {
        const statusRes = await fetch("/api/onboarding", { cache: "no-store" });
        const status = await readApiJson<{
          has_cv?: boolean;
          has_profile_reviewed?: boolean;
          step?: string;
        }>(statusRes);
        if (
          statusRes.ok &&
          (status.has_cv ||
            status.has_profile_reviewed ||
            status.step === "profile" ||
            status.step === "done")
        ) {
          return;
        }
      } catch {
        // On retombe sur le message d'erreur ci-dessous.
      }
      throw new Error(
        "Importe un fichier PDF ou colle le texte de ton CV pour continuer"
      );
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
    setSignupAttempted(true);
    if (passwordRuleFailures(password).length > 0) {
      document.getElementById("signup-password")?.focus();
      return;
    }
    if (password !== passwordConfirm) {
      document.getElementById("signup-password-confirm")?.focus();
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, first_name: firstName, last_name: lastName }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        confirmation_required?: boolean;
        email?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Inscription échouée");
      }

      setPassword("");
      setPasswordConfirm("");

      if (payload.confirmation_required) {
        setConfirmationEmail(payload.email ?? identifier);
        setMode("confirm");
        toast.success("Compte créé — confirme ton adresse e-mail");
        return;
      }

      toast.success("Compte créé");
      setMode("cv");
      // Small delay to ensure session cookie is set before navigation
      setTimeout(() => {
        router.replace("/login?cv=1");
      }, 150);
      toast.message("Importe ton CV pour continuer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inscription échouée");
    } finally {
      setLoading(false);
    }
  }

  function handleFakeFillSignup() {
    if (!allowSelfSignup) return
    const stamp = Date.now().toString(36)
    const fakePassword = "Password1!"
    setIdentifier(`dev+${stamp}@jobapp.local`)
    setPassword(fakePassword)
    setPasswordConfirm(fakePassword)
    setFirstName("Jean")
    setLastName("Dupont")
    setPasswordTouched(false)
    setSignupAttempted(false)
    toast.message("Données de test renseignées. Vérifie-les avant de créer le compte.")
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
      const payload = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!response.ok) {
        if (payload.code === "email_not_confirmed") {
          setConfirmationEmail(identifier.trim());
          setMode("confirm");
        }
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
      : "Suis tes offres PO/PM, score les matches et génère des lettres.";

  if (mode === "cv") {
    return (
      <AuthCardShell className="!max-w-[640px]">
        <div
          className="flex w-full flex-col gap-8"
          data-ui="figma-cv-import-v2"
        >
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
                  Ton CV sert de base aux analyses, aux Correspondances et aux
                  lettres. Importe un fichier ou colle son texte — tu pourras
                  vérifier le profil juste après.
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
                      <div className="w-full max-w-md px-2 flex items-center justify-center">
                        <CvImportProgress
                          active
                          step={importStep}
                          message={importMessage}
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
                          {pdfFile ? pdfFile.name : "Importer un fichier PDF ou une image"}
                        </span>
                        <span className="text-base leading-6 text-muted-foreground">
                          {pdfFile
                            ? `${formatFileSize(pdfFile.size)} · Appuie pour changer`
                            : "PDF, PNG, JPEG ou WebP · 25 Mo maximum"}
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
                        <CvImportProgress
                          active
                          step={importStep}
                          message={importMessage}
                          className="w-full max-w-md border-0 bg-transparent"
                        />
                      </div>
                    ) : (cvText.trim().length > 0 && !cvReady && cvTab === "paste" && importStep !== "error" && importStep !== "done" ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/80 p-4 backdrop-blur-[1px]">
                        <CvImportProgress
                          active
                          step="analyze"
                          message="Analyse du texte collé…"
                          className="w-full max-w-md border-0 bg-transparent"
                        />
                      </div>
                    ) : null)}
                    <Label htmlFor="cv-text" className="sr-only">
                      Coller mon CV
                    </Label>
                    <Textarea
                      id="cv-text"
                      value={cvText}
                      onChange={(e) => handlePasteTextChange(e.target.value)}
                      disabled={loading || parsingCv}
                      placeholder="Colle ici le contenu de ton CV…"
                      className="h-full min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent font-mono text-base leading-6 shadow-none focus-visible:border-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
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

              {importStep === "error" ? (
                <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4" role="alert">
                  <p className="text-base font-medium leading-6 text-foreground">
                    L’import n’a pas abouti.
                  </p>
                  <p className="text-base leading-6 text-muted-foreground">
                    {importMessage || "Vérifie ton fichier ou colle le texte de ton CV."}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Réessayer avec un fichier
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setCvTab("paste")
                        setImportStep("idle")
                        setImportMessage("")
                      }}
                    >
                      Coller le texte du CV
                    </Button>
                  </div>
                </div>
              ) : null}

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
      <AuthCardShell className="!max-w-[500px]">
        <Card className="w-full rounded-[8px] border-[#404040] bg-[#171717] p-6 text-base text-[#fafafa] shadow-none">
          <CardHeader className="gap-3 px-0 pt-0 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-[8px] bg-white text-[#0a0a0a]">
              <Briefcase className="size-6" aria-hidden />
            </div>
            <CardTitle className="text-xl font-medium leading-6 tracking-tight text-[#fafafa]">
              {title}
            </CardTitle>
            <CardDescription className="text-sm leading-5 text-[#a3a3a3]">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-identifier" className="text-sm font-medium leading-5 text-[#fafafa]">Email</Label>
                <Input
                  id="signup-identifier"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  enterKeyHint="next"
                  placeholder="monemail@gmail.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-11 rounded-[6px] border-[#404040] bg-[#262626] px-3 text-sm text-[#fafafa] placeholder:text-[#737373] focus-visible:border-[#737373] focus-visible:ring-1 focus-visible:ring-[#a3a3a3] dark:bg-[#262626]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-first-name" className="text-sm font-medium leading-5 text-[#fafafa]">Prénom</Label>
                  <Input
                    id="signup-first-name"
                    type="text"
                    autoComplete="given-name"
                    enterKeyHint="next"
                    placeholder="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 rounded-[6px] border-[#404040] bg-[#262626] px-3 text-sm text-[#fafafa] placeholder:text-[#737373] focus-visible:border-[#737373] focus-visible:ring-1 focus-visible:ring-[#a3a3a3] dark:bg-[#262626]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-last-name" className="text-sm font-medium leading-5 text-[#fafafa]">Nom</Label>
                  <Input
                    id="signup-last-name"
                    type="text"
                    autoComplete="family-name"
                    enterKeyHint="next"
                    placeholder="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 rounded-[6px] border-[#404040] bg-[#262626] px-3 text-sm text-[#fafafa] placeholder:text-[#737373] focus-visible:border-[#737373] focus-visible:ring-1 focus-visible:ring-[#a3a3a3] dark:bg-[#262626]"
                    required
                  />
                </div>
              </div>
              <PasswordField
                id="signup-password"
                label="Mot de passe"
                placeholder="Saisissez votre mot de passe"
                value={password}
                onChange={setPassword}
                onBlur={() => setPasswordTouched(true)}
                autoComplete="new-password"
                enterKeyHint="next"
                showErrors={signupAttempted}
                describedBy="signup-password-requirements"
                invalid={
                  revealPasswordErrors && passwordRuleFailures(password).length > 0
                }
              />
              <PasswordField
                id="signup-password-confirm"
                label="Confirmer le mot de passe"
                placeholder="Confirmez votre mot de passe"
                value={passwordConfirm}
                onChange={setPasswordConfirm}
                autoComplete="new-password"
                enterKeyHint="go"
                showErrors={signupAttempted}
                error={
                  passwordConfirm.length > 0 && password !== passwordConfirm
                    ? "Les mots de passe ne correspondent pas."
                    : null
                }
              />
              <PasswordRequirements
                id="signup-password-requirements"
                value={password}
                revealErrors={revealPasswordErrors}
              />
              <div className="pt-1">
                {!hostedSignup ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mb-3 h-11 w-full rounded-[6px] border-[#525252] bg-[#262626] text-sm font-medium text-[#d4d4d4] hover:bg-[#333] hover:text-white"
                    disabled={loading}
                    onClick={handleFakeFillSignup}
                  >
                    Fake fill data
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  className="h-12 w-full rounded-[6px] bg-white text-sm font-medium text-[#0a0a0a] hover:bg-[#e5e5e5] focus-visible:ring-[#a3a3a3]"
                  disabled={loading}
                >
                  {loading ? "Patiente…" : "Créer mon compte"}
                </Button>
              </div>
            </form>
            <p className="mt-4 text-center text-sm leading-5 text-[#a3a3a3]">
              Déjà un compte ?{" "}
              <Link
                href="/login"
                className="text-[#d4d4d4] underline underline-offset-4 hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3a3a3]"
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

  if (mode === "confirm") {
    return (
      <AuthCardShell className="!max-w-[500px]">
        <Card className="w-full rounded-[8px] border-[#404040] bg-[#171717] p-6 text-base text-[#fafafa] shadow-none">
          <CardHeader className="gap-3 px-0 pt-0 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-[8px] bg-white text-[#0a0a0a]">
              <MailCheck className="size-6" aria-hidden />
            </div>
            <CardTitle className="text-xl font-medium leading-6 tracking-tight text-[#fafafa]">
              Vérifie ta boîte mail
            </CardTitle>
            <CardDescription className="text-sm leading-5 text-[#a3a3a3]">
              Un lien de confirmation a été envoyé à{" "}
              <span className="font-medium text-[#fafafa]">
                {confirmationEmail || identifier || "ton adresse"}
              </span>
              . Ouvre-le pour activer ton compte, puis importe ton CV.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-0 pb-0">
            <p className="text-sm leading-5 text-[#a3a3a3]">
              Le lien expire au bout d’un moment. Si tu ne le trouves pas,
              vérifie les indésirables ou renvoie-le.
            </p>
            <Button
              type="button"
              className="h-12 w-full rounded-[6px] bg-white text-sm font-medium text-[#0a0a0a] hover:bg-[#e5e5e5]"
              onClick={() => void handleResendConfirmation()}
              disabled={resending}
            >
              {resending ? "Envoi…" : "Renvoyer l’e-mail de confirmation"}
            </Button>
            <Link
              href="/login"
              className="block text-center text-sm text-[#d4d4d4] underline underline-offset-4 hover:text-white"
              onClick={(e) => {
                e.preventDefault()
                setMode("login")
                router.replace("/login")
              }}
            >
              Retour à la connexion
            </Link>
          </CardContent>
        </Card>
      </AuthCardShell>
    )
  }

  if (mode === "forgot") {
    return (
      <AuthCardShell className="!max-w-[500px]">
        <Card className="w-full rounded-[8px] border-[#404040] bg-[#171717] p-6 text-base text-[#fafafa] shadow-none">
          <CardHeader className="gap-3 px-0 pt-0 text-center">
            <CardTitle className="text-xl font-medium leading-6 tracking-tight text-[#fafafa]">
              Récupérer mon mot de passe
            </CardTitle>
            <CardDescription className="text-sm leading-5 text-[#a3a3a3]">
              Indique l’adresse de ton compte. Tu recevras un lien pour définir
              un nouveau mot de passe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-0 pb-0">
            {forgotSent ? (
              <p className="rounded-[6px] border border-[#404040] bg-[#262626] p-3 text-sm leading-5 text-[#d4d4d4]">
                Si un compte existe pour cette adresse, un e-mail vient d’être
                envoyé. Pense à vérifier les indésirables.
              </p>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-identifier" className="text-sm font-medium leading-5 text-[#fafafa]">
                    Email
                  </Label>
                  <Input
                    id="forgot-identifier"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11 rounded-[6px] border-[#404040] bg-[#262626] px-3 text-sm text-[#fafafa] placeholder:text-[#737373] focus-visible:border-[#737373] focus-visible:ring-1 focus-visible:ring-[#a3a3a3] dark:bg-[#262626]"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full rounded-[6px] bg-white text-sm font-medium text-[#0a0a0a] hover:bg-[#e5e5e5]"
                  disabled={loading}
                >
                  {loading ? "Envoi…" : "Envoyer le lien"}
                </Button>
              </form>
            )}
            <Link
              href="/login"
              className="block text-center text-sm text-[#d4d4d4] underline underline-offset-4 hover:text-white"
              onClick={(e) => {
                e.preventDefault()
                setMode("login")
                router.replace("/login")
              }}
            >
              Retour à la connexion
            </Link>
          </CardContent>
        </Card>
      </AuthCardShell>
    )
  }

  return (
    <AuthCardShell className="!max-w-[500px]">
      <Card className="w-full rounded-[8px] border-[#404040] bg-[#171717] p-6 text-base text-[#fafafa] shadow-none">
        <CardHeader className="gap-3 px-0 pt-0 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-[8px] bg-white text-[#0a0a0a]">
            <Briefcase className="size-6" aria-hidden />
          </div>
          <CardTitle className="text-xl font-medium leading-6 tracking-tight text-[#fafafa]">
            {title}
          </CardTitle>
          <CardDescription className="text-sm leading-5 text-[#a3a3a3]">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {justConfirmed ? (
            <p
              role="status"
              className="mb-4 rounded-[6px] border border-[#166534] bg-[#052e16] px-3 py-2 text-sm leading-5 text-[#bbf7d0]"
            >
              Adresse confirmée. Connecte-toi pour importer ton CV.
            </p>
          ) : null}
          {authError === "lien-expire" ? (
            <div
              role="alert"
              className="mb-4 space-y-2 rounded-[6px] border border-[#7f1d1d] bg-[#2a0a0a] px-3 py-2 text-sm leading-5 text-[#fecaca]"
            >
              <p>
                Ce lien est expiré ou a déjà été utilisé. Connecte-toi, ou
                renvoie un e-mail de confirmation.
              </p>
              <button
                type="button"
                onClick={() => void handleResendConfirmation()}
                disabled={resending}
                className="font-medium underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3a3a3]"
              >
                {resending ? "Envoi…" : "Renvoyer l’e-mail de confirmation"}
              </button>
            </div>
          ) : null}
          {authError === "auth" && !justConfirmed ? (
            <p
              role="alert"
              className="mb-4 rounded-[6px] border border-[#7f1d1d] bg-[#2a0a0a] px-3 py-2 text-sm leading-5 text-[#fecaca]"
            >
              La connexion n’a pas abouti. Réessaie ou demande un nouvel accès.
            </p>
          ) : null}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-medium leading-5 text-[#fafafa]">Email</Label>
              <Input
                id="identifier"
                type="text"
                inputMode="email"
                autoComplete="username"
                enterKeyHint="next"
                placeholder="monemail@gmail.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-11 rounded-[6px] border-[#404040] bg-[#262626] px-3 text-sm text-[#fafafa] placeholder:text-[#737373] focus-visible:border-[#737373] focus-visible:ring-1 focus-visible:ring-[#a3a3a3] dark:bg-[#262626]"
                required
              />
            </div>
            <PasswordField
              id="password"
              label="Mot de passe"
              placeholder="Saisissez votre mot de passe"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              enterKeyHint="go"
              minLength={1}
            />
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setForgotSent(false)
                  setMode("forgot")
                }}
                className="rounded-sm text-sm text-[#a3a3a3] underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3a3a3]"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="pt-1">
              <Button
                type="submit"
                className="h-12 w-full rounded-[6px] bg-white text-sm font-medium text-[#0a0a0a] hover:bg-[#e5e5e5] focus-visible:ring-[#a3a3a3]"
                disabled={loading}
              >
                {loading ? "Patiente…" : "Se connecter"}
              </Button>
            </div>
          </form>
          <p className="mt-4 text-center text-sm leading-5 text-[#a3a3a3]">
            Pas encore de compte ?{" "}
            {allowSelfSignup ? (
              <Link
                href="/login?signup=1"
                className="text-[#d4d4d4] underline underline-offset-4 hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3a3a3]"
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
                href="/acces"
                className="text-[#d4d4d4] underline underline-offset-4 hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3a3a3]"
                tabIndex={0}
              >
                Demander un accès
              </Link>
            )}
          </p>
        </CardContent>
      </Card>
    </AuthCardShell>
  );
}
