import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { POST } from "@/app/api/auth/signup/route"

describe("POST /api/auth/signup", () => {
  it("rejects public signup with 403", async () => {
    const response = await POST()
    assert.equal(response.status, 403)
    const body = (await response.json()) as { error?: string }
    assert.match(body.error ?? "", /inscriptions sont fermées/i)
  })
})
