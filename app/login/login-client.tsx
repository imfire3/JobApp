"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Keep in sync with lib/cv-analysis/service.ts MIN_CV_LENGTH */
const MIN_CV_LENGTH = 200;

type Mode = "login" | "signup" | "cv";

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  async function completeOnboarding() {
    const res = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? "Impossible de finaliser l’inscription");
    }
  }

  async function saveCvAndEnterApp() {
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

    await completeOnboarding();
    toast.success("CV enregistré — bienvenue");
    router.replace("/dashboard");
    router.refresh();
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
      };

      if (status.completed || status.has_cv) {
        router.push("/dashboard");
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
      await saveCvAndEnterApp();
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
      ? "Dernière étape avant le dashboard."
      : "Track PO/PM offers, score matches, generate cover letters.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className={`w-full shadow-lg ${mode === "cv" ? "max-w-2xl" : "max-w-md"}`}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Briefcase className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {mode !== "cv" ? (
            <div className="mb-4 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
              Demo: <span className="font-medium text-foreground">admin</span> /{" "}
              <span className="font-medium text-foreground">admin</span>
            </div>
          ) : null}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or username</Label>
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
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
                  placeholder="admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={5}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Patiente…" : "Se connecter"}
              </Button>
            </form>
          ) : null}

          {mode === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-4">
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
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="toi@email.com"
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Patiente…" : "Continuer"}
              </Button>
            </form>
          ) : null}

          {mode === "cv" ? (
            <form onSubmit={handleCv} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cv-pdf">Import PDF</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="cv-pdf"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                    className="sm:flex-1"
                    disabled={loading}
                  />
                  {pdfFile ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileUp className="h-3.5 w-3.5" />
                      {pdfFile.name}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cv-text">Ou colle ton CV</Label>
                <Textarea
                  id="cv-text"
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  rows={12}
                  disabled={loading}
                  placeholder="Expérience, compétences, outils, résultats…"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {cvText.trim().length} / {MIN_CV_LENGTH} caractères minimum
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Patiente…" : "Enregistrer et ouvrir le dashboard"}
              </Button>
            </form>
          ) : null}

          {mode !== "cv" ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Already have an account?" : "No account yet?"}{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                onClick={() => setMode(mode === "signup" ? "login" : "signup")}
              >
                {mode === "signup" ? "Sign in" : "Create one"}
              </button>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
