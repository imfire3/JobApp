"use client"

import { useState } from "react"
import { Cable, Plus } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type FakeSource = {
  id: string
  name: string
  description: string
  connected: boolean
}

const INITIAL_SOURCES: FakeSource[] = [
  {
    id: "apify",
    name: "Apify",
    description: "Actors & scrapers pour collecter des offres.",
    connected: true,
  },
  {
    id: "browse-ai",
    name: "Browse AI",
    description: "Robots no-code sur pages carrière.",
    connected: true,
  },
  {
    id: "octoparse",
    name: "Octoparse",
    description: "Extraction visuelle de listing jobs.",
    connected: false,
  },
  {
    id: "wttj",
    name: "Welcome to the Jungle",
    description: "Import via extension / CSV (MVP).",
    connected: true,
  },
  {
    id: "custom-scraper",
    name: "Custom scraper",
    description: "Connecteur maison (webhook / script).",
    connected: false,
  },
  {
    id: "linkedin-jobs",
    name: "LinkedIn Jobs",
    description: "À brancher plus tard.",
    connected: false,
  },
]

export function FakeSourcesPanel() {
  const [sources, setSources] = useState(INITIAL_SOURCES)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [website, setWebsite] = useState("")

  function handleToggle(id: string, connected: boolean) {
    setSources((prev) =>
      prev.map((source) => (source.id === id ? { ...source, connected } : source))
    )
  }

  function handleOpenDialog() {
    setName("")
    setWebsite("")
    setDialogOpen(true)
  }

  function handleAddSource() {
    const trimmedName = name.trim()
    const trimmedWebsite = website.trim()
    if (!trimmedName && !trimmedWebsite) {
      toast.error("Ajoute un nom ou une URL de site")
      return
    }

    const displayName = trimmedName || trimmedWebsite
    const description = trimmedWebsite
      ? trimmedWebsite
      : "Source ajoutée manuellement."

    setSources((prev) => [
      {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `source-${Date.now()}`,
        name: displayName,
        description,
        connected: true,
      },
      ...prev,
    ])
    setDialogOpen(false)
    toast.success("Source ajoutée")
  }

  const connectedCount = sources.filter((source) => source.connected).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {connectedCount} connectée{connectedCount === 1 ? "" : "s"} · démo locale (non persistée)
        </p>
        <Button type="button" size="sm" onClick={handleOpenDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Ajouter une source
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une source</DialogTitle>
            <DialogDescription>
              Ajoute un connecteur ou l’URL d’un site carrière.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <Label htmlFor="source-name" className="mb-0">
                Nom de la source
              </Label>
              <Input
                id="source-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Apify, Indeed…"
              />
            </Field>
            <Field>
              <Label htmlFor="source-website" className="mb-0">
                Site web
              </Label>
              <Input
                id="source-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={handleAddSource}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2">
        {sources.map((source) => (
          <Card key={source.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Cable className="h-4 w-4 shrink-0" />
                    {source.name}
                  </CardTitle>
                  <CardDescription className="break-all">{source.description}</CardDescription>
                </div>
                <Badge variant={source.connected ? "default" : "secondary"}>
                  {source.connected ? "Connected" : "Not connected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <Label htmlFor={`source-${source.id}`} className="mb-0 cursor-pointer">
                  {source.connected ? "Activée" : "Désactivée"}
                </Label>
                <Switch
                  id={`source-${source.id}`}
                  checked={source.connected}
                  onCheckedChange={(checked) => handleToggle(source.id, checked)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
