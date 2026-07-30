import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-auth";
import { newInviteCode } from "@/lib/invite-code";

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "Solo los alumnos pueden matricularse con un código." }, { status: 403 });
  const parsed = z.object({ code: z.string().trim().min(4).max(20) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  const code = parsed.data.code.toUpperCase();
  try {
    await prisma.$transaction(async tx => {
      const classroom = await tx.classroom.findUnique({ where: { inviteCode: code }, select: { id: true, status: true, invitationMode: true } });
      if (!classroom || classroom.status !== "ACTIVE" || classroom.invitationMode === "CLOSED") throw new Error("INVALID_CODE");
      const existing = await tx.enrollment.findUnique({ where: { classroomId_studentId: { classroomId: classroom.id, studentId: user.sub } } });
      if (existing?.status === "ACTIVE") return;
      if (classroom.invitationMode === "SINGLE_USE") {
        const claimed = await tx.classroom.updateMany({ where: { id: classroom.id, inviteCode: code }, data: { inviteCode: newInviteCode() } });
        if (claimed.count !== 1) throw new Error("CODE_USED");
      }
      await tx.enrollment.upsert({ where: { classroomId_studentId: { classroomId: classroom.id, studentId: user.sub } }, create: { classroomId: classroom.id, studentId: user.sub, status:"PENDING" }, update: { status: "PENDING", requestedAt:new Date(), reviewedAt:null, reviewNote:null } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ ok: true, message:"Solicitud enviada. El docente debe aprobarla y emitir el contrato." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "CODE_USED") return NextResponse.json({ error: "Este código ya fue utilizado. Solicita uno nuevo al docente." }, { status: 409 });
    return NextResponse.json({ error: "El código no es válido, ya fue usado o la matrícula está cerrada." }, { status: 404 });
  }
}
