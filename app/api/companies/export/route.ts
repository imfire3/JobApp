import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { getAuthenticatedUser } from "@/lib/auth"

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error }, { status: 401 })

  let body: { companyIds?: string[] }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  let query = supabase
    .from("companies")
    .select("*")
    .eq("user_id", user.id)
    .order("opportunity_score", { ascending: false, nullsFirst: false })

  if (body.companyIds && body.companyIds.length > 0) {
    query = query.in("id", body.companyIds)
  }

  const { data: companies, error: queryError } = await query
  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  const rows = (companies ?? []).map((company) => {
    const enriched = (company.ai_enriched ?? {}) as Record<string, unknown>
    return {
      "Nom": company.name,
      "Domaine": company.domain,
      "Site": company.website ?? "",
      "Secteur": company.industry ?? (enriched.sector as string) ?? "",
      "Siège": company.headquarters ?? "",
      "Villes": (company.locations ?? []).join(", "),
      "Remote": company.remote_ok ? "Oui" : "Non",
      "Taille min": company.size_min ?? "",
      "Taille max": company.size_max ?? "",
      "Score match": company.match_score ?? "",
      "Score opportunité": company.opportunity_score ?? "",
      "Activité": (enriched.activity as string) ?? "",
      "Produits": (enriched.products as string) ?? "",
      "Positionnement": (enriched.positioning as string) ?? "",
      "Statut": company.status,
      "Notes": company.notes ?? "",
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Entreprises")

  worksheet["!cols"] = [
    { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 20 },
    { wch: 20 }, { wch: 30 }, { wch: 8 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 40 },
    { wch: 40 }, { wch: 40 }, { wch: 15 }, { wch: 30 },
  ]

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="entreprises-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
