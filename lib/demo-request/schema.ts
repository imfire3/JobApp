import { z } from "zod"

export const demoRequestSchema = z
  .object({
    first_name: z.string().trim().min(1, "Prénom requis").max(80),
    last_name: z.string().trim().min(1, "Nom requis").max(80),
    email: z.string().trim().email("Email invalide").max(254),
    message: z.string().trim().max(2000, "Message trop long").optional(),
    /** Honeypot — leave empty. Bots that fill it are rejected silently. */
    website: z.string().trim().max(200).optional(),
  })
  .transform((data) => ({
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    message:
      data.message && data.message.length > 0 ? data.message : undefined,
    website: data.website && data.website.length > 0 ? data.website : undefined,
  }))

export type DemoRequestInput = {
  first_name: string
  last_name: string
  email: string
  message?: string
  website?: string
}
