import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-auth";

const schema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
}).refine(data => Object.keys(data).length > 0);

async function canAccess(id: string, user: Awaited<ReturnType<typeof getRequestUser>>) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "TEACHER") return !!(await prisma.classroom.findFirst({ where: { id, teacherId: user.sub }, select: { id: true } }));
  return !!(await prisma.enrollment.findFirst({ where: { classroomId: id, studentId: user.sub, status: "ACTIVE" }, select: { id: true } }));
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  const { id } = await context.params;
  if (!(await canAccess(id, user))) return NextResponse.json({ error: "No tienes acceso a esta aula." }, { status: 403 });
  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      enrollments: { where: { status: "ACTIVE" }, select: { id: true, progress: true, student: { select: { id: true, name: true, email: true } } } },
      announcements: { orderBy: { publishedAt: "desc" } },
      modules: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" }, include: { resources: true, progress: user?.role === "STUDENT" ? { where: { studentId: user.sub }, select: { completedAt: true } } : false, activities: { include: { submissions: user?.role === "STUDENT" ? { where: { studentId: user.sub }, include: { student: { select: { name: true } } } } : { include: { student: { select: { name: true } } } } } } } } } },
    },
  });
  return NextResponse.json({ classroom, role: user?.role, userId: user?.sub });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await context.params;
  const classroom = await prisma.classroom.findUnique({ where: { id }, select: { teacherId: true } });
  if (!classroom || (user.role !== "ADMIN" && classroom.teacherId !== user.sub)) return NextResponse.json({ error: "No tienes permiso para modificar esta aula." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Actualización inválida." }, { status: 400 });
  const updated = await prisma.classroom.update({ where: { id }, data: parsed.data, select: { id: true, title: true, description: true, color: true, inviteCode: true, status: true, createdAt: true, updatedAt: true, teacher: { select: { id: true, name: true, email: true } }, _count: { select: { enrollments: true, modules: true } } } });
  return NextResponse.json({ classroom: updated });
}
