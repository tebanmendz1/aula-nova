import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks=vi.hoisted(()=>({
  getRequestUser:vi.fn(),
  findUnique:vi.fn(),
  updateMany:vi.fn(),
  enrollmentFind:vi.fn(),
  upsert:vi.fn(),
}));
vi.mock("@/lib/api-auth",()=>({getRequestUser:mocks.getRequestUser}));
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:vi.fn(async(callback:(tx:unknown)=>unknown)=>callback({classroom:{findUnique:mocks.findUnique,updateMany:mocks.updateMany},enrollment:{findUnique:mocks.enrollmentFind,upsert:mocks.upsert}}))}}));
vi.mock("@/lib/invite-code",()=>({newInviteCode:()=>"FFEEDDCCBB"}));

import { POST } from "../app/api/classrooms/join/route";

function request(code="ABCDEF1234"){return new Request("http://localhost/api/classrooms/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})}) as never}

describe("secure classroom invitations",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.getRequestUser.mockResolvedValue({sub:"student-1",role:"STUDENT"});mocks.enrollmentFind.mockResolvedValue(null);mocks.updateMany.mockResolvedValue({count:1});mocks.upsert.mockResolvedValue({id:"enrollment-1"})});
  it("rotates a single-use code before creating the enrollment",async()=>{mocks.findUnique.mockResolvedValue({id:"class-1",status:"ACTIVE",invitationMode:"SINGLE_USE"});const response=await POST(request());expect(response.status).toBe(200);expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:{id:"class-1",inviteCode:"ABCDEF1234"},data:{inviteCode:expect.not.stringMatching(/^ABCDEF1234$/)}}));expect(mocks.upsert).toHaveBeenCalledOnce()});
  it("does not rotate a reusable code",async()=>{mocks.findUnique.mockResolvedValue({id:"class-1",status:"ACTIVE",invitationMode:"REUSABLE"});const response=await POST(request());expect(response.status).toBe(200);expect(mocks.updateMany).not.toHaveBeenCalled();expect(mocks.upsert).toHaveBeenCalledOnce()});
  it("rejects a code already claimed by another request",async()=>{mocks.findUnique.mockResolvedValue({id:"class-1",status:"ACTIVE",invitationMode:"SINGLE_USE"});mocks.updateMany.mockResolvedValue({count:0});const response=await POST(request());expect(response.status).toBe(409);expect(mocks.upsert).not.toHaveBeenCalled()});
  it("rejects non-student users",async()=>{mocks.getRequestUser.mockResolvedValue({sub:"teacher-1",role:"TEACHER"});const response=await POST(request());expect(response.status).toBe(403);expect(mocks.findUnique).not.toHaveBeenCalled()});
});
