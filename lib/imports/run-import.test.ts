import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildImportResultMessage } from "./run-import";

describe("buildImportResultMessage", () => {
  it("explains when every job is already on the board", () => {
    const message = buildImportResultMessage({
      total_rows: 1,
      imported: 0,
      duplicates: 1,
      updated: 0,
      invalid: 0,
      invalid_rows: [],
      already_on_board: [
        {
          id: "job-1",
          url: "https://example.com/a",
          title: "Product Owner",
          company: "Acme",
        },
      ],
    });
    assert.match(message, /déjà sur ton board/i);
    assert.match(message, /non réimportée/);
    assert.doesNotMatch(message, /ajoutée/);
  });

  it("combines new imports and duplicates", () => {
    const message = buildImportResultMessage({
      total_rows: 3,
      imported: 2,
      duplicates: 1,
      updated: 0,
      invalid: 0,
      invalid_rows: [],
      already_on_board: [],
    });
    assert.match(message, /2 offres ajoutées/);
    assert.match(message, /1 offre était déjà/);
  });
});
