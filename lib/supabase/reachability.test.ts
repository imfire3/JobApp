import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearSupabaseUnreachable,
  isSupabaseMarkedUnreachable,
  markSupabaseUnreachable,
  resetSupabaseReachabilityForTests,
} from "./reachability";

describe("supabase reachability cache", () => {
  afterEach(() => {
    resetSupabaseReachabilityForTests();
  });

  it("is reachable until marked down", () => {
    assert.equal(isSupabaseMarkedUnreachable(), false);
    markSupabaseUnreachable(60_000);
    assert.equal(isSupabaseMarkedUnreachable(), true);
  });

  it("expires after the ttl", () => {
    markSupabaseUnreachable(-1);
    assert.equal(isSupabaseMarkedUnreachable(), false);
  });

  it("clears the sticky mark so health can recover", () => {
    markSupabaseUnreachable(60_000);
    assert.equal(isSupabaseMarkedUnreachable(), true);
    clearSupabaseUnreachable();
    assert.equal(isSupabaseMarkedUnreachable(), false);
  });
});
