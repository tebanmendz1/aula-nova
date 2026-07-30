import {describe,expect,it} from "vitest";
import {newInviteCode} from "../lib/invite-code";
describe("invite code generator",()=>{
  it("generates ten uppercase hexadecimal characters",()=>{expect(newInviteCode()).toMatch(/^[A-F0-9]{10}$/)});
  it("generates distinct codes",()=>{expect(newInviteCode()).not.toBe(newInviteCode())});
});
