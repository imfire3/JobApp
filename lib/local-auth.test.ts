import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  authenticateLocalUser,
  createSessionToken,
  registerLocalUser,
  resetLocalUsersForTests,
  verifySessionToken,
} from "./local-auth";

const SECRET = "test-auth-secret";

describe("authenticateLocalUser", () => {
  beforeEach(() => {
    resetLocalUsersForTests();
  });

  it("accepts the seeded admin username and password", () => {
    const result = authenticateLocalUser("admin", "admin");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.user.email, "admin@gmail.com");
    assert.equal(result.user.id.length > 0, true);
  });

  it("accepts the seeded admin email and password", () => {
    const result = authenticateLocalUser("admin@gmail.com", "admin");
    assert.equal(result.ok, true);
  });

  it("rejects a wrong password", () => {
    const result = authenticateLocalUser("admin", "nope");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /invalid/i);
  });
});

describe("registerLocalUser", () => {
  beforeEach(() => {
    resetLocalUsersForTests();
  });

  it("creates a new local account and returns the user", () => {
    const result = registerLocalUser("new.user@example.com", "secret1");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.user.email, "new.user@example.com");

    const login = authenticateLocalUser("new.user@example.com", "secret1");
    assert.equal(login.ok, true);
  });

  it("logs in the seeded admin instead of failing signup", () => {
    const result = registerLocalUser("admin@gmail.com", "admin");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.user.email, "admin@gmail.com");
  });

  it("rejects a duplicate email with a different password", () => {
    const created = registerLocalUser("dup@example.com", "secret1");
    assert.equal(created.ok, true);
    const duplicate = registerLocalUser("dup@example.com", "other-pass");
    assert.equal(duplicate.ok, false);
    if (duplicate.ok) return;
    assert.match(duplicate.error, /exists/i);
  });

  it("rejects missing credentials", () => {
    const result = registerLocalUser("  ", "");
    assert.equal(result.ok, false);
  });
});

describe("session token", () => {
  it("round-trips a valid user", () => {
    const user = { id: "user-1", email: "admin@gmail.com" };
    const token = createSessionToken(user, SECRET, 1_700_000_000);
    const parsed = verifySessionToken(token, SECRET, 1_700_000_000);
    assert.deepEqual(parsed, user);
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken(
      { id: "user-1", email: "admin@gmail.com" },
      SECRET,
      1_700_000_000
    );
    const parsed = verifySessionToken(`${token}x`, SECRET, 1_700_000_000);
    assert.equal(parsed, null);
  });

  it("rejects an expired token", () => {
    const token = createSessionToken(
      { id: "user-1", email: "admin@gmail.com" },
      SECRET,
      1_700_000_000
    );
    const parsed = verifySessionToken(token, SECRET, 1_800_000_000);
    assert.equal(parsed, null);
  });
});
