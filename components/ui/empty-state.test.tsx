import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { Inbox } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"

import { EmptyState } from "./empty-state"

describe("EmptyState", () => {
  it("renders title, description and CTA with a decorative icon", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        icon={Inbox}
        title="Aucune offre"
        description="Importe ton premier CSV pour démarrer."
      >
        <button type="button">Importer</button>
      </EmptyState>
    )
    assert.match(html, /Aucune offre/)
    assert.match(html, /Importe ton premier CSV/)
    assert.match(html, /Importer/)
    assert.match(html, /aria-hidden="true"/)
    assert.match(html, /border-dashed/)
  })

  it("renders without icon or title", () => {
    const html = renderToStaticMarkup(
      <EmptyState size="inline" description="Rien ici pour le moment." />
    )
    assert.match(html, /Rien ici pour le moment\./)
    assert.doesNotMatch(html, /aria-hidden/)
  })
})
