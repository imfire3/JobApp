import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { extractPdfText } from "./extract-pdf-text";

const fixturePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../test/fixtures/dummy.pdf"
);

describe("extractPdfText", () => {
  it("extracts text from a real PDF", async () => {
    const bytes = new Uint8Array(readFileSync(fixturePath));
    const text = await extractPdfText(bytes);
    assert.match(text, /Dummy PDF file/i);
  });

  it("rejects clearly invalid PDF bytes", async () => {
    await assert.rejects(() => extractPdfText(new Uint8Array([1, 2, 3, 4])));
  });
});
