import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJobInsertPayload } from "@/lib/jobs/mapper";
import { parseWebsitePaste, websitePasteRequestSchema } from "./website-paste";

const pastedWttjPage = `Trouver un job
Explorer les entreprises
Ressources
Candidatures
Messages
Mon espace

Retour aux résultats
NEXTON
Product Owner IA H/F
NEXTON
Consulting et Factory pour l'innovation digitale des grands comptes.
Enregistrer
Postuler
CDI
Paris
Télétravail fréquent
Salaire : non spécifié
> 4 ans
il y a 11 jours
Votre nouvelle entreprise
Paris - Bordeaux - Lyon
Vos missions au quotidien
NEXTON recrute un Product Owner IA H/F, en CDI, à Paris !
Définir et porter la vision produit.
Ce que l’on cherche
Qualifications
Au moins 5 ans d’expérience en tant que Product Owner ou Product Manager.
Informations supplémentaires
Pourquoi choisir NEXTON ?
Vous cherchez un job
WTTJ & Indeed → un seul fichier Excel/CSV
Lead Product Manager - AI Platform
Joko · https://www.welcometothejungle.com/fr/companies/joko/jobs/lead-product-manager-ai-platform`;

test("extracts the main WTTJ offer and preserves UTF-8 through JSON and the database mapping", async () => {
  const input = websitePasteRequestSchema.parse(JSON.parse(JSON.stringify({ text: pastedWttjPage })));
  const row = await parseWebsitePaste(input, async () => assert.fail("Known header must skip AI"));
  assert.ok(row);
  assert.equal(row.raw_data?.pasted_text, pastedWttjPage);
  assert.match(row.description ?? "", /Au moins 5 ans d’expérience/);
  assert.doesNotMatch(row.description ?? "", /Retour aux résultats|Joko|Lead Product Manager/);
  const insert = buildJobInsertPayload({ userId: "candidate", job: row, rawData: row.raw_data });
  assert.equal(insert.title, "Product Owner IA H/F");
  assert.equal(insert.company, "NEXTON");
  assert.equal(insert.city, "Paris");
  assert.equal(insert.contract_type, "CDI");
  assert.equal(insert.remote_mode, "hybrid");
  assert.equal(insert.experience_min_years, 5);
  assert.equal(insert.salary_min, null);
  assert.equal(insert.published_at, null);
  assert.equal(row.raw_data?.publication_label, "il y a 11 jours");

  const retry = await parseWebsitePaste(input, async () => assert.fail("Known header must skip AI"));
  assert.equal(retry?.url, row.url);
});

test("accepts grounded JSON excerpts and discards unsupported model values", async () => {
  const row = await parseWebsitePaste({
    url: "https://example.org/offer",
    text: "Retour aux rÃ©sultats\nÉquipe recrutement\nDéveloppeur C#\nAcme\nCDI\n2026-11-01\nMissions du poste",
  }, async () => ({
    title: "Développeur C#",
    company: "Acme",
    location: "Lyon",
    contract_type: "CDI",
    remote: "100 % remote",
    salary: "75 000 €",
    experience: null,
    published_at: "2026-11-01",
  }));
  assert.ok(row);
  assert.equal(row.title, "Développeur C#");
  assert.equal(row.company, "Acme");
  assert.equal(row.contract_type, "CDI");
  assert.equal(row.location, null);
  assert.equal(row.remote_mode, "unknown");
  assert.equal(row.salary, null);
  assert.equal(row.posted_at, "2026-11-01T00:00:00.000Z");
  assert.equal(row.url, "https://example.org/offer");
});

test("rejects malformed JSON rather than falling back to a page label", async () => {
  const row = await parseWebsitePaste({
    url: "",
    text: "Retour aux résultats\nDéveloppeur C#\nÉquipe produit",
  }, async () => ({ title: "Another title" }));
  assert.equal(row, null);
  assert.equal(
    await parseWebsitePaste({ url: "", text: "Retour aux résultats\nMessages\nPostuler" },
      async () => assert.fail("Navigation-only input must skip AI")),
    null,
  );
  assert.equal(websitePasteRequestSchema.safeParse({ text: "Offre", url: "file:///tmp/a" }).success, false);
});

test("recognizes WTTJ with extra header noise and never consumes extension offers", async () => {
  const row = await parseWebsitePaste({ url: "", text: `Site web\nRetour aux rÃ©sultats\nMenu secondaire\n${pastedWttjPage}` },
    async () => assert.fail("Known WTTJ header must skip AI"));
  assert.equal(row?.title, "Product Owner IA H/F");
  assert.equal(row?.company, "NEXTON");
  assert.equal(row?.experience_min_years, 5);
  assert.equal(row?.posted_at, null);
});

test("rejects ambiguous titles and strict JSON with extra or missing fields", async () => {
  for (const response of [null, "{invalid", { title: "Site web" }, {
    title: null, company: null, location: null, contract_type: null,
    remote: null, salary: null, experience: null, published_at: null,
  }, {
    title: "Product Owner", company: null, location: null, contract_type: null,
    remote: null, salary: null, experience: null, published_at: null, extra: "ignored?",
  }]) {
    assert.equal(await parseWebsitePaste({url: "", text: "Site web\nProduct Owner\nProduct Manager\nDeux annonces recommandées"}, async () => response), null);
  }
});
