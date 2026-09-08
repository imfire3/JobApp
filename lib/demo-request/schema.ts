import { z } from "zod"

export const demoRequestSchema = z
  .object({
    first_name: z.string().trim().min(1, "Prénom requis").max(80),
    last_name: z.string().trim().min(1, "Nom requis").max(80),
    email: z.string().trim().email("Email invalide").max(254),
    message: z.string().trim().max(2000, "Message trop long").optional(),
  })
  .transform((data) => ({
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    message:
      data.message && data.message.length > 0 ? data.message : undefined,
  }))

export type DemoRequestInput = {
  first_name: string
  last_name: string
  email: string
  message?: string
}
