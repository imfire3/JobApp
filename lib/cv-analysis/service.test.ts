import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashCvContent, normalizeCvContent } from "./hash";
import { isCvContentStale, MIN_CV_LENGTH } from "./service";

describe("hashCvContent", () => {
  it("is stable for the same normalized content", () => {
    const a = hashCvContent("Hello\nWorld");
    const b = hashCvContent("Hello\r\nWorld");
    assert.equal(a, b);
  });

  it("changes when content changes", () => {
    const a = hashCvContent("Version 1");
    const b = hashCvContent("Version 2");
    assert.notEqual(a, b);
  });
});

describe("normalizeCvContent", () => {
  it("trims surrounding whitespace", () => {
    assert.equal(normalizeCvContent("  text  "), "text");
  });
});

describe("isCvContentStale", () => {
  it("returns false when no analysis hash exists", () => {
    assert.equal(isCvContentStale("saved cv", null), false);
  });

  it("returns true when saved CV hash differs from analysis hash", () => {
    const saved = "Product Owner with 5 years experience in SaaS.";
    const hash = hashCvContent(saved);
    assert.equal(isCvContentStale(`${saved} Updated`, hash), true);
  });

  it("returns false when hashes match", () => {
    const saved = "Product Owner with 5 years experience in SaaS.";
    const hash = hashCvContent(saved);
    assert.equal(isCvContentStale(saved, hash), false);
  });
});

describe("MIN_CV_LENGTH", () => {
  it("is at least 200 characters", () => {
    assert.ok(MIN_CV_LENGTH >= 200);
  });
});
