"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { TARGET_LOCATIONS, TARGET_ROLES } from "@/types";

const LOCATION_LABELS: Record<string, string> = {
  Paris: "Paris",
  remote: "Remote",
  hybrid: "Hybride",
};

export function MetiersPageClient() {
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const availableRoles = useMemo(
    () => TARGET_ROLES.filter((role) => !roles.includes(role)),
    [roles]
  );
  const availableLocations = useMemo(
    () => TARGET_LOCATIONS.filter((location) => !locations.includes(location)),
    [locations]
  );

  const canSubmit = roles.length > 0 && locations.length > 0;

  function addRole(value: string) {
    if (!value || roles.includes(value)) return;
    setRoles((prev) => [...prev, value]);
  }

  function addLocation(value: string) {
    if (!value || locations.includes(value)) return;
    setLocations((prev) => [...prev, value]);
  }

  function removeRole(value: string) {
    setRoles((prev) => prev.filter((role) => role !== value));
  }

  function removeLocation(value: string) {
    setLocations((prev) => prev.filter((location) => location !== value));
  }

  async function createAlertFromTargets(payload: {
    target_roles: string[];
    target_locations: string[];
  }) {
    const remotePreference = payload.target_locations.includes("remote")
      ? "remote"
      : payload.target_locations.includes("hybrid")
        ? "hybrid"
        : "any";

    const name = `${payload.target_roles.slice(0, 2).join(" / ")} — ${payload.target_locations
      .slice(0, 2)
      .map((l) => LOCATION_LABELS[l] ?? l)
      .join(", ")}`;

    const res = await fetch("/api/tracked-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        enabled: true,
        job_titles: payload.target_roles,
        keywords: [],
        excluded_keywords: [],
        locations: payload.target_locations.filter((l) => l !== "remote" && l !== "hybrid"),
        remote_preference: remotePreference,
        hybrid: payload.target_locations.includes("hybrid"),
        on_site: payload.target_locations.includes("Paris"),
        experience: [],
        contract_types: [],
        minimum_salary: null,
        currency: "EUR",
        industries: [],
        excluded_industries: [],
        company_size: null,
        company_culture: null,
        ai_preferences: {},
        minimum_match_score: null,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? "Impossible de créer l’alerte");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const payload = {
        target_roles: roles,
        target_locations: locations,
      };

      const profileRes = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const profileData = (await profileRes.json()) as { error?: string };
      if (!profileRes.ok) {
        throw new Error(profileData.error ?? "Impossible d’enregistrer les métiers");
      }

      await createAlertFromTargets(payload);

      const onboardingRes = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      const onboardingData = (await onboardingRes.json()) as { error?: string };
      if (!onboardingRes.ok) {
        throw new Error(onboardingData.error ?? "Impossible de finaliser l’inscription");
      }

      toast.success("Alerte créée — bienvenue");
      router.replace("/jobs?extension=1");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de la configuration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-muted/30">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-4">
        <Card className="mx-auto w-full max-w-lg shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Briefcase className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Choisis ton métier</CardTitle>
            <CardDescription>
              Sélectionne les postes et lieux recherchés. Chaque choix devient un tag.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="role-select">Poste</Label>
              <select
                id="role-select"
                className="flex h-11 w-full touch-manipulation rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:h-10 md:text-sm"
                defaultValue=""
                disabled={loading || availableRoles.length === 0}
                onChange={(e) => {
                  addRole(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  {availableRoles.length === 0
                    ? "Tous les postes sont sélectionnés"
                    : "Sélectionner un poste…"}
                </option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              {roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => removeRole(role)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground touch-manipulation"
                      aria-label={`Retirer ${role}`}
                    >
                      {role}
                      <X className="h-3.5 w-3.5 opacity-80" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun poste sélectionné.</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="location-select">Lieu / mode</Label>
              <select
                id="location-select"
                className="flex h-11 w-full touch-manipulation rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:h-10 md:text-sm"
                defaultValue=""
                disabled={loading || availableLocations.length === 0}
                onChange={(e) => {
                  addLocation(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  {availableLocations.length === 0
                    ? "Tous les lieux sont sélectionnés"
                    : "Sélectionner un lieu…"}
                </option>
                {availableLocations.map((location) => (
                  <option key={location} value={location}>
                    {LOCATION_LABELS[location] ?? location}
                  </option>
                ))}
              </select>

              {locations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {locations.map((location) => (
                    <button
                      key={location}
                      type="button"
                      onClick={() => removeLocation(location)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground touch-manipulation"
                      aria-label={`Retirer ${LOCATION_LABELS[location] ?? location}`}
                    >
                      {LOCATION_LABELS[location] ?? location}
                      <X className="h-3.5 w-3.5 opacity-80" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun lieu sélectionné.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-border/80 bg-background/95 px-4 py-4 backdrop-blur supports-backdrop-filter:bg-background/85 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-lg">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading || !canSubmit}
          >
            {loading ? "Création…" : "Créer mon alerte"}
          </Button>
        </form>
      </div>
    </div>
  );
}
