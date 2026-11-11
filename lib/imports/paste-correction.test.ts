import assert from "node:assert/strict"
import { test } from "node:test"
import { buildPasteCorrection, signPasteCorrection, readPasteCorrection } from "./paste-correction"
import { parseWebsitePaste } from "./website-paste"

test("correction allowlist preserves CRM fields and publication remains unknown", async () => {
  const row = await parseWebsitePaste({url:"",text:"NEXTON\nProduct Owner IA H/F\nNEXTON\nCDI\nParis\nTélétravail fréquent\nil y a 11 jours\nVos missions au quotidien\nNEXTON recrute un Product Owner IA H/F\nQualifications\nAu moins 5 ans d’expérience produit."},async()=>assert.fail("deterministic"))
  assert.ok(row)
  const fields = buildPasteCorrection(row,"user")
  assert.equal(fields.title,"Product Owner IA H/F")
  assert.equal(fields.remote_mode,"hybrid")
  assert.equal(fields.experience_min_years,5)
  assert.equal(fields.published_at,null)
  for (const key of ["status","notes","cover_letter","selected","user_id","url","raw_data"]) assert.ok(!(key in fields),key)
  const ticket = {userId:"owner",jobId:"job",updatedAt:"version",expires:Date.now()+60_000,fields,source:row.raw_data!}
  const token = signPasteCorrection(ticket,"private-test-key")
  assert.deepEqual(readPasteCorrection(token,"private-test-key"),ticket)
  assert.equal(readPasteCorrection(token,"other-key"),null)
  assert.equal(readPasteCorrection(`${token}x`,"private-test-key"),null)
  assert.equal(readPasteCorrection(signPasteCorrection({...ticket,expires:0},"private-test-key"),"private-test-key"),null)
})
