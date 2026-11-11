import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { ErrorState } from "./error-state"

describe("ErrorState", () => {
  it("is announced via role=alert with a decorative icon", () => {
    const html = renderToStaticMarkup(
      <ErrorState title="Échec" description="Réessaie dans un instant." />
    )
    assert.match(html, /role="alert"/)
    assert.match(html, /Échec/)
    assert.match(html, /Réessaie dans un instant\./)
    assert.match(html, /aria-hidden="true"/)
    assert.match(html, /text-destructive/)
  })

  it("supports role=status for non-blocking errors", () => {
    const html = renderToStaticMarkup(
      <ErrorState role="status">Sauvegarde partielle</ErrorState>
    )
    assert.match(html, /role="status"/)
    assert.match(html, /Sauvegarde partielle/)
  })
})
