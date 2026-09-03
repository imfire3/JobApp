import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOfflineClient } from "./offline";

describe("createOfflineClient", () => {
  it("resolves chained queries immediately", async () => {
    const supabase = createOfflineClient();
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", "user-1")
      .order("published_at", { ascending: false });

    assert.equal(data, null);
    assert.equal(error?.code, "SUPABASE_UNREACHABLE");
  });

  it("resolves insert chains immediately", async () => {
    const supabase = createOfflineClient();
    const { error } = await supabase.from("user_settings").insert({ id: "user-1" }).select("*").single();
    assert.equal(error?.code, "SUPABASE_UNREACHABLE");
  });
});
