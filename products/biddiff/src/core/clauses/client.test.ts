import { describe, it, expect } from "vitest";
import { LocalClauseClient } from "./client.js";

const client = new LocalClauseClient();

describe("LocalClauseClient.lookupSync", () => {
  it("resolves a clause present in the bundled dataset", () => {
    const info = client.lookupSync("52.212-1");
    expect(info).not.toBeNull();
    expect(info!.clauseNumber).toBe("52.212-1");
    expect(info!.regulation).toBe("FAR");
    expect(info!.title.length).toBeGreaterThan(0);
  });

  it("returns null for a clause not in the dataset", () => {
    expect(client.lookupSync("99.999-99")).toBeNull();
  });
});

describe("LocalClauseClient.lookup (async, with unknown-stub fallback)", () => {
  it("returns an entry for EVERY requested number (known + unknown)", async () => {
    const map = await client.lookup(["52.212-1", "99.999-99"]);
    expect(map.size).toBe(2);
    expect(map.get("52.212-1")!.title).not.toContain("not in local dataset");
    expect(map.get("99.999-99")!.title).toContain("not in local dataset");
  });

  it("infers the regulation of an unknown clause from its number prefix", async () => {
    const map = await client.lookup(["252.204-7012", "52.999-1", "12.345"]);
    // 252. → DFARS, 52. → FAR, anything else → OTHER.
    expect(map.get("252.204-7012")!.regulation).toBe("DFARS");
    expect(map.get("52.999-1")!.regulation).toBe("FAR");
    expect(map.get("12.345")!.regulation).toBe("OTHER");
  });

  it("handles an empty request", async () => {
    const map = await client.lookup([]);
    expect(map.size).toBe(0);
  });

  it("collapses duplicate requested numbers into a single map entry", async () => {
    const map = await client.lookup(["52.212-1", "52.212-1"]);
    expect(map.size).toBe(1);
  });
});
