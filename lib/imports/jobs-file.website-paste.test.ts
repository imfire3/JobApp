import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WEBSITE_PASTE_SOURCE,
  buildWebsitePasteRow,
  mergeWebsitePasteRow,
  parseJobsImportFile,
  rowsToCsvFile,
} from "./jobs-file";

describe("website paste import helpers", () => {
  it("returns null when content is empty", () => {
    assert.equal(buildWebsitePasteRow("https://example.com/job", "  "), null);
  });

  it("builds a row from pasted text and URL", () => {
    const row = buildWebsitePasteRow(
      "https://www.welcometothejungle.com/fr/companies/acme/jobs/dev",
      "Développeur Fullstack\n\nStack React / Node\nRemote possible"
    );

    assert.ok(row);
    assert.equal(row?.source, WEBSITE_PASTE_SOURCE);
    assert.equal(row?.title, "Développeur Fullstack");
    assert.equal(row?.company, "welcometothejungle.com");
    assert.equal(
      row?.url,
      "https://www.welcometothejungle.com/fr/companies/acme/jobs/dev"
    );
    assert.match(row?.description ?? "", /Stack React/);
  });

  it("merges paste over previous paste without dropping file rows", () => {
    const fileRow = {
      rowNumber: 1,
      source: "CSV Import",
      title: "From file",
      company: "Acme",
      location: null,
      remote: false,
      salary: null,
      posted_at: new Date().toISOString(),
      url: "https://example.com/a",
      description: null,
    };
    const paste = buildWebsitePasteRow("https://example.com/b", "Titre collé\nDesc");
    const merged = mergeWebsitePasteRow([fileRow], paste);
    assert.equal(merged.length, 2);
    assert.equal(merged[1]?.source, WEBSITE_PASTE_SOURCE);
    assert.equal(merged[1]?.rowNumber, 2);

    const replaced = mergeWebsitePasteRow(merged, buildWebsitePasteRow("", "Nouveau titre"));
    assert.equal(replaced.length, 2);
    assert.equal(replaced[1]?.title, "Nouveau titre");
  });

  it("serializes rows to a CSV that the parser accepts", async () => {
    const row = buildWebsitePasteRow("https://example.com/job-1", "Lead Dev\nMission");
    assert.ok(row);
    const file = rowsToCsvFile([row!]);
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseJobsImportFile(buffer);
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0]?.title, "Lead Dev");
    assert.equal(parsed.rows[0]?.url, "https://example.com/job-1");
  });
});
