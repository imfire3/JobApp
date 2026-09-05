import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isEmailTakenError } from "@/lib/supabase/ensure-local-user"

describe("isEmailTakenError", () => {
  it("matches Supabase duplicate email messages", () => {
    assert.equal(
      isEmailTakenError(
        "A user with this email address has already been registered"
      ),
      true
    )
    assert.equal(isEmailTakenError("Invalid API key"), false)
  })
})
