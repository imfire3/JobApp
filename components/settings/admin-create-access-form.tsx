"use client"

import { useState } from "react"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MIN_PASSWORD_LENGTH = 8

function isStrongPassword(password: string) {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

export function AdminCreateAccessForm() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isStrongPassword(password)) {
      toast.error(
        "Mot de passe : 8 caractères min., 1 majuscule et 1 caractère spécial"
      )
      return
    }
    setLoading(true)
    try {
      const response = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        user?: { email?: string }
      }
      if (!response.ok) {
        throw new Error(payload.error ?? "Création impossible")
      }
      toast.success(
        `Accès créé pour ${payload.user?.email ?? email}. Envoie les identifiants à la main.`
      )
      setFirstName("")
      setLastName("")
      setEmail("")
      setPassword("")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Création impossible"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5" aria-hidden />
          Créer un accès
        </CardTitle>
        <CardDescription>
          Réservé à l’admin. Crée un compte après une demande démo, puis envoie
          email et mot de passe à la personne.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-create-first-name">Prénom</Label>
              <Input
                id="admin-create-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-create-last-name">Nom</Label>
              <Input
                id="admin-create-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-create-email">Email</Label>
            <Input
              id="admin-create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-create-password">Mot de passe temporaire</Label>
            <Input
              id="admin-create-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="off"
              placeholder="Ex. DemoAcces1!"
            />
            <p className="text-xs text-muted-foreground">
              8 caractères min., 1 majuscule, 1 caractère spécial.
            </p>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Création…" : "Créer l’accès"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
