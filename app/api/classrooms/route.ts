import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-auth";
import { newInviteCode } from "@/lib/invite-code";

const schema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6d5dfc"),
  status: z.enum(["DRAFT", "ACTIVE"]).default("DRAFT"),
});

const classroomSelect = {
  id: true, title: true, description: true, color: true, inviteCode: true, invitationMode: true, status: true, createdAt: true, updatedAt: true,
  teacher: { select: { id: true, name: true, email: true } },
  _count: { select: { enrollments: true, modules: true } },
} as const;

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const where = user.role === "ADMIN" ? {} : user.role === "TEACHER" ? { teacherId: user.sub } : { enrollments: { some: { studentId: user.sub, status: "ACTIVE" as const } } };
  const classrooms = await prisma.classroom.findMany({ where, select: classroomSelect, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ classrooms });
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user || !["ADMIN", "TEACHER"].includes(user.role)) return NextResponse.json({ error: "Solo los docentes pueden crear aulas." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del aula." }, { status: 400 });
  try {
    const classroom = await prisma.classroom.create({ data: { ...parsed.data, teacherId: user.sub, inviteCode: newInviteCode() }, select: classroomSelect });
    return NextResponse.json({ classroom }, { status: 201 });
  } catch (error) {
    console.error("create_classroom_error", error);
    return NextResponse.json({ error: "No se pudo crear el aula." }, { status: 500 });
  }
}
