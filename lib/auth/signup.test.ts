import assert from "node:assert/strict"
import { describe, it, beforeEach, afterEach } from "node:test"
import { POST } from "@/app/api/auth/signup/route"
import { resetLocalUsersForTests } from "@/lib/local-auth"

describe("POST /api/auth/signup", () => {
  const previousAllow = process.env.ALLOW_SELF_SIGNUP
  const previousVercel = process.env.VERCEL

  beforeEach(() => {
    resetLocalUsersForTests()
    process.env.ALLOW_SELF_SIGNUP = "true"
    delete process.env.VERCEL
  })

  afterEach(() => {
    if (previousAllow === undefined) delete process.env.ALLOW_SELF_SIGNUP
    else process.env.ALLOW_SELF_SIGNUP = previousAllow
    if (previousVercel === undefined) delete process.env.VERCEL
    else process.env.VERCEL = previousVercel
  })

  it("creates a local user and sets session cookies when allowed", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dev-signup@example.com",
          password: "password1",
        }),
      })
    )
    assert.equal(response.status, 200)
    const body = (await response.json()) as {
      user?: { email?: string }
      error?: string
    }
    assert.equal(body.user?.email, "dev-signup@example.com")
    const cookie = response.headers.get("set-cookie") ?? ""
    assert.match(cookie, /jobapp_session=/)
    assert.match(cookie, /jobapp_onboarding=pending/)
  })

  it("rejects signup when self-signup is disabled", async () => {
    process.env.ALLOW_SELF_SIGNUP = "false"
    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "blocked@example.com",
          password: "password1",
        }),
      })
    )
    assert.equal(response.status, 403)
    const body = (await response.json()) as { error?: string }
    assert.match(body.error ?? "", /inscriptions sont fermées/i)
  })

  it("rejects short passwords", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "short@example.com",
          password: "short",
        }),
      })
    )
    assert.equal(response.status, 400)
  })

  it("rejects duplicate email with wrong password", async () => {
    const first = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dup@example.com",
          password: "password1",
        }),
      })
    )
    assert.equal(first.status, 200)

    const second = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dup@example.com",
          password: "otherpass",
        }),
      })
    )
    assert.equal(second.status, 409)
  })
})
