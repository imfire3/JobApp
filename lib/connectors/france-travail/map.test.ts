import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  clearFranceTravailTokenCache,
  getFranceTravailAccessToken,
  isFranceTravailConfigured,
  readFranceTravailAuthConfig,
} from "@/lib/connectors/france-travail/auth"
import {
  mapFranceTravailOffreToImportedJob,
  mapFranceTravailOffres,
} from "@/lib/connectors/france-travail/map"

describe("france-travail auth config", () => {
  it("reports not configured without env", () => {
    const prevId = process.env.FRANCE_TRAVAIL_CLIENT_ID
    const prevSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET
    const prevFtId = process.env.FT_CLIENT_ID
    const prevFtSecret = process.env.FT_CLIENT_SECRET
    delete process.env.FRANCE_TRAVAIL_CLIENT_ID
    delete process.env.FRANCE_TRAVAIL_CLIENT_SECRET
    delete process.env.FT_CLIENT_ID
    delete process.env.FT_CLIENT_SECRET
    try {
      assert.equal(isFranceTravailConfigured(), false)
      assert.equal(readFranceTravailAuthConfig(), null)
    } finally {
      if (prevId) process.env.FRANCE_TRAVAIL_CLIENT_ID = prevId
      else delete process.env.FRANCE_TRAVAIL_CLIENT_ID
      if (prevSecret) process.env.FRANCE_TRAVAIL_CLIENT_SECRET = prevSecret
      else delete process.env.FRANCE_TRAVAIL_CLIENT_SECRET
      if (prevFtId) process.env.FT_CLIENT_ID = prevFtId
      else delete process.env.FT_CLIENT_ID
      if (prevFtSecret) process.env.FT_CLIENT_SECRET = prevFtSecret
      else delete process.env.FT_CLIENT_SECRET
    }
  })

  it("fetches and caches OAuth token", async () => {
    clearFranceTravailTokenCache()
    let calls = 0
    const fetchImpl: typeof fetch = async () => {
      calls += 1
      return new Response(
        JSON.stringify({ access_token: "tok-1", expires_in: 3600 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }
    const token1 = await getFranceTravailAccessToken(
      { clientId: "id", clientSecret: "secret", scope: "api_offresdemploiv2 o2dsoffre" },
      fetchImpl
    )
    const token2 = await getFranceTravailAccessToken(
      { clientId: "id", clientSecret: "secret", scope: "api_offresdemploiv2 o2dsoffre" },
      fetchImpl
    )
    assert.equal(token1, "tok-1")
    assert.equal(token2, "tok-1")
    assert.equal(calls, 1)
    clearFranceTravailTokenCache()
  })
})

describe("france-travail map", () => {
  it("maps a typical offre payload", () => {
    const job = mapFranceTravailOffreToImportedJob({
      id: "123ABC",
      intitule: "Product Owner H/F",
      description: "Piloter le backlog en télétravail partiel",
      dateCreation: "2026-09-01T10:00:00Z",
      typeContrat: "CDI",
      typeContratLibelle: "Contrat à durée indéterminée",
      salaire: { libelle: "45k-55k EUR" },
      lieuTravail: { libelle: "75 - Paris" },
      entreprise: { nom: "Acme" },
      origineOffre: {
        urlOrigine: "https://candidat.francetravail.fr/offres/recherche/detail/123ABC",
      },
    })
    assert.ok(job)
    assert.equal(job?.title, "Product Owner H/F")
    assert.equal(job?.company, "Acme")
    assert.equal(job?.source, "france_travail")
    assert.equal(job?.remote, true)
    assert.equal(job?.contract_type, "Contrat à durée indéterminée")
    assert.match(job?.url ?? "", /123ABC/)
  })

  it("dedupes by url when mapping lists", () => {
    const jobs = mapFranceTravailOffres([
      {
        id: "A",
        intitule: "PO",
        entreprise: { nom: "X" },
        origineOffre: { urlOrigine: "https://example.com/a" },
      },
      {
        id: "A2",
        intitule: "PO 2",
        entreprise: { nom: "Y" },
        origineOffre: { urlOrigine: "https://example.com/a" },
      },
      {
        id: "B",
        intitule: "PM",
        entreprise: { nom: "Z" },
      },
    ])
    assert.equal(jobs.length, 2)
    assert.equal(jobs[0]?.url, "https://example.com/a")
    assert.match(jobs[1]?.url ?? "", /detail\/B/)
  })

  it("returns null when title or url missing", () => {
    assert.equal(
      mapFranceTravailOffreToImportedJob({ entreprise: { nom: "X" } }),
      null
    )
  })
})
