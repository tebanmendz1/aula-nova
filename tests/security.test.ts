import { describe, expect, it } from "vitest";
import { hashToken, newToken } from "../lib/tokens";
import { clientIp, rateLimit } from "../lib/rate-limit";

describe("security helpers", () => {
  it("hashes recovery tokens", () => { const token=newToken(); expect(token.raw).toHaveLength(64); expect(token.hash).toBe(hashToken(token.raw)); expect(token.hash).not.toBe(token.raw) });
  it("generates unique tokens", () => { expect(newToken().raw).not.toBe(newToken().raw) });
  it("blocks requests over the limit", () => { const key=`test-${crypto.randomUUID()}`; expect(rateLimit(key,2,60_000).allowed).toBe(true); expect(rateLimit(key,2,60_000).allowed).toBe(true); expect(rateLimit(key,2,60_000).allowed).toBe(false) });
  it("reads the first proxy address", () => { expect(clientIp(new Request("https://test.local",{headers:{"x-forwarded-for":"203.0.113.1, 10.0.0.2"}}))).toBe("203.0.113.1") });
});
