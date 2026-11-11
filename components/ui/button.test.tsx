import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { Button, buttonVariants } from "./button"

describe("Button", () => {
  it("exposes typed variants", () => {
    const destructive = buttonVariants({ variant: "destructive", size: "sm" })
    assert.match(destructive, /bg-destructive\/10/)
    assert.match(destructive, /h-10/)
    const xs = buttonVariants({ size: "xs" })
    assert.match(xs, /h-8/)
  })

  it("renders children without loading state by default", () => {
    const html = renderToStaticMarkup(<Button>Importer</Button>)
    assert.match(html, /Importer/)
    assert.doesNotMatch(html, /aria-busy/)
    assert.doesNotMatch(html, /data-slot="button-spinner"/)
  })

  it("sets aria-busy, disables the button and shows a spinner when loading", () => {
    const html = renderToStaticMarkup(<Button loading>Envoyer</Button>)
    assert.match(html, /aria-busy="true"/)
    assert.match(html, /disabled=""/)
    assert.match(html, /data-slot="button-spinner"/)
    assert.match(html, /animate-spin/)
    assert.match(html, /Envoyer/)
  })

  it("keeps an explicit disabled prop", () => {
    const html = renderToStaticMarkup(<Button disabled>Envoyer</Button>)
    assert.match(html, /disabled=""/)
    assert.doesNotMatch(html, /aria-busy/)
  })
})
