import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "Solo los alumnos pueden matricularse con un código." }, { status: 403 });
  const parsed = z.object({ code: z.string().trim().min(4).max(20) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  const classroom = await prisma.classroom.findUnique({ where: { inviteCode: parsed.data.code.toUpperCase() }, select: { id: true, status: true } });
  if (!classroom || classroom.status !== "ACTIVE") return NextResponse.json({ error: "El código no corresponde a un aula activa." }, { status: 404 });
  await prisma.enrollment.upsert({ where: { classroomId_studentId: { classroomId: classroom.id, studentId: user.sub } }, create: { classroomId: classroom.id, studentId: user.sub }, update: { status: "ACTIVE" } });
  return NextResponse.json({ ok: true });
}
