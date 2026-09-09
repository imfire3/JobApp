import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INVALID_OPENAI_KEY_MESSAGE,
  MISSING_OPENAI_KEY_MESSAGE,
  QUOTA_OPENAI_MESSAGE,
  mapOpenAIError,
  resolveOpenAIApiKey,
} from "./api-key";

describe("resolveOpenAIApiKey", () => {
  it("always uses the platform env key even when a user key is passed", () => {
    const previous = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-env";
    try {
      assert.equal(resolveOpenAIApiKey(" sk-user "), "sk-env");
    } finally {
      if (previous === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previous;
    }
  });

  it("uses env when no user key is provided", () => {
    const previous = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-env";
    try {
      assert.equal(resolveOpenAIApiKey(""), "sk-env");
      assert.equal(resolveOpenAIApiKey(null), "sk-env");
    } finally {
      if (previous === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previous;
    }
  });

  it("throws a clear message when no platform key exists", () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      assert.throws(() => resolveOpenAIApiKey("sk-user"), (error: Error) => {
        assert.equal(error.message, MISSING_OPENAI_KEY_MESSAGE);
        return true;
      });
    } finally {
      if (previous === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previous;
    }
  });
});

describe("mapOpenAIError", () => {
  it("maps invalid key errors", () => {
    assert.equal(
      mapOpenAIError(new Error("Incorrect API key provided")).message,
      INVALID_OPENAI_KEY_MESSAGE
    );
  });

  it("maps quota errors", () => {
    assert.equal(
      mapOpenAIError(new Error("You exceeded your current quota")).message,
      QUOTA_OPENAI_MESSAGE
    );
  });
});
