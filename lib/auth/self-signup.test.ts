import assert from "node:assert/strict"
import { describe, it, afterEach } from "node:test"
import { isSelfSignupAllowed } from "@/lib/auth/self-signup"

describe("isSelfSignupAllowed", () => {
  const previousAllow = process.env.ALLOW_SELF_SIGNUP
  const previousVercel = process.env.VERCEL

  afterEach(() => {
    if (previousAllow === undefined) delete process.env.ALLOW_SELF_SIGNUP
    else process.env.ALLOW_SELF_SIGNUP = previousAllow
    if (previousVercel === undefined) delete process.env.VERCEL
    else process.env.VERCEL = previousVercel
  })

  it("allows when ALLOW_SELF_SIGNUP=true even on Vercel", () => {
    process.env.VERCEL = "1"
    process.env.ALLOW_SELF_SIGNUP = "true"
    assert.equal(isSelfSignupAllowed(), true)
  })

  it("denies on Vercel by default", () => {
    delete process.env.ALLOW_SELF_SIGNUP
    process.env.VERCEL = "1"
    assert.equal(isSelfSignupAllowed(), false)
  })

  it("allows locally when not on Vercel", () => {
    delete process.env.ALLOW_SELF_SIGNUP
    delete process.env.VERCEL
    assert.equal(isSelfSignupAllowed(), true)
  })

  it("denies when ALLOW_SELF_SIGNUP=false", () => {
    delete process.env.VERCEL
    process.env.ALLOW_SELF_SIGNUP = "false"
    assert.equal(isSelfSignupAllowed(), false)
  })
})
