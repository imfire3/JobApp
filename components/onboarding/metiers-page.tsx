"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCardShell } from "@/components/auth/auth-card-shell";
import { nativeSelectClassName, nativeSelectChevronStyle } from "@/components/ui/native-select";
import { FRANCE_CITIES } from "@/lib/onboarding/france-cities";
import { TARGET_ROLES } from "@/types";

const PLACE_OPTIONS = FRANCE_CITIES;

const REMOTE_OPTIONS = [
  { value: "remote", label: "Télétravail" },
  { value: "hybrid", label: "Hybride" },
  { value: "onsite", label: "Présentiel" },
] as const;

const REMOTE_LABELS: Record<string, string> = {
  remote: "Télétravail",
  hybrid: "Hybride",
  onsite: "Présentiel",
};

const CONTRACT_OPTIONS = ["CDI", "CDD", "Freelance", "Stage", "Alternance"] as const;

const OTHER_ROLE_VALUE = "__other__";

export function MetiersPageClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [places, setPlaces] = useState<string[]>([]);
  const [remoteModes, setRemoteModes] = useState<string[]>([]);
  const [contracts, setContracts] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState(3);
  const [distanceKm, setDistanceKm] = useState(25);
  const [minimumSalary, setMinimumSalary] = useState("");
  const [acceptNoSalary, setAcceptNoSalary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtherRole, setShowOtherRole] = useState(false);
  const [otherRole, setOtherRole] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function gate() {
      try {
        const res = await fetch("/api/onboarding");
        const status = (await res.json().catch(() => ({}))) as {
          completed?: boolean;
          has_cv?: boolean;
          has_tracked_search?: boolean;
          step?: string;
        };

        if (cancelled) return;

        if (status.completed || status.has_tracked_search) {
          router.replace("/jobs?extension=1");
          return;
        }

        if (!status.has_cv) {
          router.replace("/login?cv=1");
          return;
        }

        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    }

    void gate();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const availableRoles = useMemo(
    () => TARGET_ROLES.filter((role) => !roles.includes(role)),
    [roles]
  );
  const availablePlaces = useMemo(
    () => PLACE_OPTIONS.filter((place) => !places.includes(place)),
    [places]
  );
  const availableRemoteModes = useMemo(
    () => REMOTE_OPTIONS.filter((mode) => !remoteModes.includes(mode.value)),
    [remoteModes]
  );
  const availableContracts = useMemo(
    () => CONTRACT_OPTIONS.filter((contract) => !contracts.includes(contract)),
    [contracts]
  );

  const parsedMinimumSalary = Number(minimumSalary);
  const salaryOk =
    acceptNoSalary ||
    (Number.isFinite(parsedMinimumSalary) && parsedMinimumSalary > 0);

  const canSubmit =
    roles.length > 0 &&
    places.length > 0 &&
    remoteModes.length > 0 &&
    contracts.length > 0 &&
    salaryOk;

  function addRole(value: string) {
    const trimmed = value.trim();
    if (!trimmed || roles.includes(trimmed)) return;
    setRoles((prev) => [...prev, trimmed]);
  }

  function addOtherRole() {
    const trimmed = otherRole.trim();
    if (!trimmed) {
      toast.error("Écris un poste pour l’ajouter");
      return;
    }
    if (roles.includes(trimmed)) {
      toast.error("Ce poste est déjà ajouté");
      return;
    }
    addRole(trimmed);
    setOtherRole("");
    setShowOtherRole(false);
  }

  function addPlace(value: string) {
    if (!value || places.includes(value)) return;
    setPlaces((prev) => [...prev, value]);
  }

  function addRemoteMode(value: string) {
    if (!value || remoteModes.includes(value)) return;
    setRemoteModes((prev) => [...prev, value]);
  }

  function addContract(value: string) {
    if (!value || contracts.includes(value)) return;
    setContracts((prev) => [...prev, value]);
  }

  function removeRole(value: string) {
    setRoles((prev) => prev.filter((role) => role !== value));
  }

  function removePlace(value: string) {
    setPlaces((prev) => prev.filter((place) => place !== value));
  }

  function removeRemoteMode(value: string) {
    setRemoteModes((prev) => prev.filter((mode) => mode !== value));
  }

  function removeContract(value: string) {
    setContracts((prev) => prev.filter((contract) => contract !== value));
  }

  async function createAlertFromTargets(payload: {
    target_roles: string[];
    target_locations: string[];
    experience_years: number;
    contract_types: string[];
    minimum_salary: number | null;
    maximum_distance: number;
  }) {
    const remotePreference = payload.target_locations.includes("remote")
      ? "remote"
      : payload.target_locations.includes("hybrid")
        ? "hybrid"
        : "any";

    const name = `${payload.target_roles.slice(0, 2).join(" / ")} — ${payload.target_locations
      .slice(0, 2)
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
        locations: payload.target_locations.filter(
          (l) => l !== "remote" && l !== "hybrid" && l !== "onsite"
        ),
        maximum_distance: payload.maximum_distance,
        remote_preference: remotePreference,
        hybrid: payload.target_locations.includes("hybrid"),
        on_site:
          payload.target_locations.includes("onsite") ||
          payload.target_locations.some((l) => !["remote", "hybrid", "onsite"].includes(l)),
        experience: [`${payload.experience_years}`],
        contract_types: payload.contract_types,
        minimum_salary: payload.minimum_salary,
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
      const targetLocations = [
        ...places,
        ...remoteModes.filter((mode) => mode === "remote" || mode === "hybrid"),
      ];

      const payload = {
        target_roles: roles,
        target_locations: targetLocations,
        experience_years: experienceYears,
        contract_types: contracts,
        minimum_salary: acceptNoSalary ? null : parsedMinimumSalary,
        maximum_distance: distanceKm,
      };

      const profileRes = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_roles: payload.target_roles,
          target_locations: payload.target_locations,
        }),
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
    <AuthCardShell>
      {!ready ? (
        <Card className="w-full shadow-lg">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Chargement…
          </CardContent>
        </Card>
      ) : (
      <Card className="w-full shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Briefcase className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Choisis ton métier</CardTitle>
            <CardDescription className="pb-4">
              Sélectionne les postes, lieux et mode de travail. Chaque choix devient un
              tag.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="role-select">Poste</Label>
              <select
                id="role-select"
                className={nativeSelectClassName}
                style={nativeSelectChevronStyle}
                defaultValue=""
                disabled={loading}
                onChange={(e) => {
                  const value = e.target.value;
                  e.target.value = "";
                  if (value === OTHER_ROLE_VALUE) {
                    setShowOtherRole(true);
                    return;
                  }
                  setShowOtherRole(false);
                  addRole(value);
                }}
              >
                <option value="" disabled>
                  Sélectionner un poste…
                </option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
                <option value={OTHER_ROLE_VALUE}>Autre</option>
              </select>

              {showOtherRole ? (
                <div className="flex gap-2">
                  <Input
                    id="other-role"
                    value={otherRole}
                    onChange={(e) => setOtherRole(e.target.value)}
                    placeholder="Ex. Scrum Master"
                    disabled={loading}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOtherRole();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addOtherRole}
                    disabled={loading || otherRole.trim().length === 0}
                    className="shrink-0"
                  >
                    Ajouter
                  </Button>
                </div>
              ) : null}

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

            <div className="space-y-2">
              <Label htmlFor="location-select">Lieux</Label>
              <select
                id="location-select"
                className={nativeSelectClassName}
                style={nativeSelectChevronStyle}
                defaultValue=""
                disabled={loading}
                onChange={(e) => {
                  addPlace(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  Sélectionner un lieu…
                </option>
                {availablePlaces.map((place) => (
                  <option key={place} value={place}>
                    {place}
                  </option>
                ))}
              </select>

              {places.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {places.map((place) => (
                    <button
                      key={place}
                      type="button"
                      onClick={() => removePlace(place)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground touch-manipulation"
                      aria-label={`Retirer ${place}`}
                    >
                      {place}
                      <X className="h-3.5 w-3.5 opacity-80" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun lieu sélectionné.</p>
              )}

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="distance-slider" className="mb-0">
                    Périmètre
                  </Label>
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {distanceKm} km
                  </span>
                </div>
                <input
                  id="distance-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={distanceKm}
                  disabled={loading}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:opacity-50"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={distanceKm}
                  aria-label="Périmètre en kilomètres"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 km</span>
                  <span>100 km</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remote-select">Télétravail</Label>
              <select
                id="remote-select"
                className={nativeSelectClassName}
                style={nativeSelectChevronStyle}
                defaultValue=""
                disabled={loading || availableRemoteModes.length === 0}
                onChange={(e) => {
                  addRemoteMode(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  {availableRemoteModes.length === 0
                    ? "Tous les modes sont sélectionnés"
                    : "Sélectionner un mode…"}
                </option>
                {availableRemoteModes.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>

              {remoteModes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {remoteModes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => removeRemoteMode(mode)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground touch-manipulation"
                      aria-label={`Retirer ${REMOTE_LABELS[mode] ?? mode}`}
                    >
                      {REMOTE_LABELS[mode] ?? mode}
                      <X className="h-3.5 w-3.5 opacity-80" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun mode sélectionné.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract-select">Contrat</Label>
              <select
                id="contract-select"
                className={nativeSelectClassName}
                style={nativeSelectChevronStyle}
                defaultValue=""
                disabled={loading || availableContracts.length === 0}
                onChange={(e) => {
                  addContract(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  {availableContracts.length === 0
                    ? "Tous les contrats sont sélectionnés"
                    : "Sélectionner un contrat…"}
                </option>
                {availableContracts.map((contract) => (
                  <option key={contract} value={contract}>
                    {contract}
                  </option>
                ))}
              </select>

              {contracts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {contracts.map((contract) => (
                    <button
                      key={contract}
                      type="button"
                      onClick={() => removeContract(contract)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground touch-manipulation"
                      aria-label={`Retirer ${contract}`}
                    >
                      {contract}
                      <X className="h-3.5 w-3.5 opacity-80" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun contrat sélectionné.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum-salary">Salaire minimum (€ / an)</Label>
              <Input
                id="minimum-salary"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                placeholder="Ex. 45000"
                value={minimumSalary}
                disabled={loading || acceptNoSalary}
                onChange={(e) => setMinimumSalary(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={acceptNoSalary}
                  disabled={loading}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setAcceptNoSalary(next);
                    if (next) setMinimumSalary("");
                  }}
                />
                Offres sans salaire unique
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="experience-slider" className="mb-0">
                  Niveau d’expérience
                </Label>
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {experienceYears} {experienceYears <= 1 ? "an" : "ans"}
                </span>
              </div>
              <input
                id="experience-slider"
                type="range"
                min={0}
                max={10}
                step={1}
                value={experienceYears}
                disabled={loading}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:opacity-50"
                aria-valuemin={0}
                aria-valuemax={10}
                aria-valuenow={experienceYears}
                aria-label="Niveau d’expérience en années"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>10</span>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || !canSubmit}
            >
              {loading ? "Création…" : "Créer mon alerte"}
            </Button>
          </CardContent>
        </form>
      </Card>
      )}
    </AuthCardShell>
  );
}
