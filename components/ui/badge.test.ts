import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { badgeVariants } from "./badge"

describe("badgeVariants", () => {
  it("status variant is a compact pill without baked-in colors", () => {
    const status = badgeVariants({ variant: "status" })
    assert.match(status, /rounded-full/)
    assert.match(status, /text-xs/)
    assert.match(status, /font-medium/)
    assert.doesNotMatch(status, /bg-/)
  })

  it("score variant is a tabular-nums pill", () => {
    const score = badgeVariants({ variant: "score" })
    assert.match(score, /rounded-full/)
    assert.match(score, /tabular-nums/)
    assert.match(score, /font-semibold/)
  })

  it("tag variant keeps brand tokens", () => {
    const tag = badgeVariants({ variant: "tag" })
    assert.match(tag, /text-brand/)
    assert.match(tag, /bg-brand-foreground/)
    assert.match(tag, /border-brand\/50/)
  })
})
