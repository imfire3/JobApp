"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(isSignUp ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Authentication failed");
      }

      toast.success(isSignUp ? "Account created" : "Signed in");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Briefcase className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">JobTracker</CardTitle>
          <CardDescription>
            Track PO/PM offers, score matches, generate cover letters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
            Demo account: <span className="font-medium text-foreground">admin</span> /{" "}
            <span className="font-medium text-foreground">admin</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder="admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={5}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "No account yet?"}{" "}
            <button
              type="button"
              className="font-medium text-foreground underline-offset-4 hover:underline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Sign in" : "Create one"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
