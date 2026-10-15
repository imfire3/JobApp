import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { Field, FieldDescription, FieldError, FieldLabel } from "./field"

describe("Field", () => {
  it("FieldLabel and FieldDescription render text", () => {
    const html = renderToStaticMarkup(
      <Field>
        <FieldLabel htmlFor="salary">Salaire maximal</FieldLabel>
        <FieldDescription>Brut annuel, hors prime.</FieldDescription>
        <input id="salary" name="salary" />
      </Field>
    )
    assert.match(html, /Salaire maximal/)
    assert.match(html, /for="salary"/)
    assert.match(html, /Brut annuel/)
  })

  it("FieldError announces via role=alert with a decorative icon", () => {
    const html = renderToStaticMarkup(
      <FieldError>Le salaire doit être supérieur à 0.</FieldError>
    )
    assert.match(html, /role="alert"/)
    assert.match(html, /Le salaire doit être supérieur à 0\./)
    assert.match(html, /aria-hidden="true"/)
    assert.match(html, /text-destructive/)
  })
})
