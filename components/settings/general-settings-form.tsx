"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useTheme } from "next-themes";
import { PageHelpButton } from "@/components/onboarding/page-help-button";

type SettingsState = {
  theme: "light" | "dark" | "system";
  notifications_enabled: boolean;
  timezone: string;
  default_language: string;
  ai_provider: "openai" | "anthropic" | "gemini";
  openai_key: string;
  anthropic_key: string;
  gemini_key: string;
  resume_defaults: string;
  cover_letter_defaults: string;
  automation_defaults: string;
};

const defaultSettings: SettingsState = {
  theme: "dark",
  notifications_enabled: true,
  timezone: "Europe/Paris",
  default_language: "fr",
  ai_provider: "openai",
  openai_key: "",
  anthropic_key: "",
  gemini_key: "",
  resume_defaults: "{}",
  cover_letter_defaults: "{}",
  automation_defaults: '{"daily_sync_time":"08:00"}',
};

/** App is dark-first; DB default `system` must not flip the UI to light. */
function resolveTheme(value: unknown): SettingsState["theme"] {
  if (value === "light" || value === "dark") return value;
  return "dark";
}

export function GeneralSettingsForm() {
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load settings");
        const payload = data.settings ?? {};
        const theme = resolveTheme(payload.theme);
        setSettings({
          theme,
          notifications_enabled: payload.notifications_enabled ?? true,
          timezone: payload.timezone ?? "Europe/Paris",
          default_language: payload.default_language ?? "fr",
          ai_provider: payload.ai_provider ?? "openai",
          openai_key: payload.openai_key ?? "",
          anthropic_key: payload.anthropic_key ?? "",
          gemini_key: payload.gemini_key ?? "",
          resume_defaults: JSON.stringify(payload.resume_defaults ?? {}, null, 2),
          cover_letter_defaults: JSON.stringify(payload.cover_letter_defaults ?? {}, null, 2),
          automation_defaults: JSON.stringify(payload.automation_defaults ?? {}, null, 2),
        });
        setTheme(theme);
      } catch {
        setSettings(defaultSettings);
        setTheme("dark");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [setTheme]);

  async function saveSettings() {
    setSaving(true);
    try {
      const theme = resolveTheme(settings.theme);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          theme,
          openai_key: settings.openai_key || null,
          anthropic_key: settings.anthropic_key || null,
          gemini_key: settings.gemini_key || null,
          resume_defaults: JSON.parse(settings.resume_defaults || "{}"),
          cover_letter_defaults: JSON.parse(settings.cover_letter_defaults || "{}"),
          automation_defaults: JSON.parse(settings.automation_defaults || "{}"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save settings");
      setSettings((prev) => ({ ...prev, theme }));
      setTheme(theme);
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Card className="h-56 animate-pulse" />;
  }

  return (
    <div className="space-y-6" data-tour="guide-settings">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Réglages</h1>
          <p className="text-sm text-muted-foreground">
            Langue, thème et paramètres de l’assistant IA.
          </p>
        </div>
        <PageHelpButton pageId="settings" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select
              value={settings.theme === "system" ? "dark" : settings.theme}
              onValueChange={(value) => {
                const theme = resolveTheme(value);
                setSettings((prev) => ({ ...prev, theme }));
                setTheme(theme);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input
              value={settings.timezone}
              onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Default language</Label>
            <Input
              value={settings.default_language}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, default_language: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Notifications</Label>
            <Switch
              checked={settings.notifications_enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, notifications_enabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI provider</CardTitle>
          <CardDescription>Store provider keys in your own secure environment.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={settings.ai_provider}
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  ai_provider: value as SettingsState["ai_provider"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>OpenAI key</Label>
            <Input
              type="password"
              value={settings.openai_key}
              onChange={(e) => setSettings((prev) => ({ ...prev, openai_key: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Anthropic key</Label>
            <Input
              type="password"
              value={settings.anthropic_key}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, anthropic_key: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Gemini key</Label>
            <Input
              type="password"
              value={settings.gemini_key}
              onChange={(e) => setSettings((prev) => ({ ...prev, gemini_key: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Resume defaults (JSON)</Label>
            <Textarea
              rows={4}
              className="font-mono text-xs"
              value={settings.resume_defaults}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, resume_defaults: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Cover letter defaults (JSON)</Label>
            <Textarea
              rows={4}
              className="font-mono text-xs"
              value={settings.cover_letter_defaults}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, cover_letter_defaults: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Automation defaults (JSON)</Label>
            <Textarea
              rows={4}
              className="font-mono text-xs"
              value={settings.automation_defaults}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, automation_defaults: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
