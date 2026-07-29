import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const ActivitySchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(3000),
  type: z.enum(["ASSIGNMENT", "QUIZ", "FORUM", "PROJECT"]),
});

const PlanSchema = z.object({
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().max(3000),
  divisions: z.array(z.object({
    title: z.string().trim().min(3).max(160),
    themes: z.array(z.object({
      title: z.string().trim().min(3).max(160),
      description: z.string().trim().max(5000),
      topics: z.array(z.object({
        title: z.string().trim().min(3).max(160),
        description: z.string().trim().max(3000),
      })).max(15),
      activity: ActivitySchema.nullable(),
    })).max(12),
  })).min(1).max(12),
});

async function owner(id: string, user: { sub: string; role: string }) {
  return prisma.classroom.findFirst({
    where: { id, ...(user.role === "TEACHER" ? { teacherId: user.sub } : user.role === "ADMIN" ? {} : { id: "__none__" }) },
    select: { id: true },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  const { id } = await params;
  if (!user || !await owner(id, user)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: { modules: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" }, include: { topics: { orderBy: { position: "asc" } }, resources: true, activities: true } } } } },
  });
  return NextResponse.json({ classroom });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  const { id } = await params;
  if (!user || !await owner(id, user)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const body = await request.json();

  try {
    if (body.action === "division") {
      const title = z.string().trim().min(3).max(160).parse(body.title);
      const position = await prisma.module.count({ where: { classroomId: id } }) + 1;
      await prisma.module.create({ data: { classroomId: id, title, position, published: true } });
    } else if (body.action === "theme") {
      const title = z.string().trim().min(3).max(160).parse(body.title);
      const description = z.string().trim().max(5000).parse(body.description || "");
      const module = await prisma.module.findFirst({ where: { id: String(body.parentId), classroomId: id } });
      if (!module) throw new Error("Módulo inválido");
      const position = await prisma.lesson.count({ where: { moduleId: module.id } }) + 1;
      await prisma.lesson.create({ data: { moduleId: module.id, title, content: { text: description }, position, published: true } });
    } else if (body.action === "topic") {
      const title = z.string().trim().min(3).max(160).parse(body.title);
      const description = z.string().trim().max(3000).parse(body.description || "");
      const lesson = await prisma.lesson.findFirst({ where: { id: String(body.parentId), module: { classroomId: id } } });
      if (!lesson) throw new Error("Tema inválido");
      const position = await prisma.topic.count({ where: { lessonId: lesson.id } }) + 1;
      await prisma.topic.create({ data: { lessonId: lesson.id, title, description, position } });
    } else if (body.action === "import_plan") {
      const plan = PlanSchema.parse(body.plan);
      await prisma.$transaction(async (tx) => {
        let modulePosition = await tx.module.count({ where: { classroomId: id } });
        for (const division of plan.divisions) {
          const module = await tx.module.create({ data: { classroomId: id, title: division.title, position: ++modulePosition, published: true } });
          let lessonPosition = 0;
          for (const theme of division.themes) {
            const lesson = await tx.lesson.create({ data: { moduleId: module.id, title: theme.title, content: { text: theme.description }, position: ++lessonPosition, published: true } });
            if (theme.topics.length) await tx.topic.createMany({ data: theme.topics.map((topic, index) => ({ lessonId: lesson.id, title: topic.title, description: topic.description, position: index + 1 })) });
            if (theme.activity) await tx.activity.create({ data: { lessonId: lesson.id, ...theme.activity, maxScore: 100 } });
          }
        }
      });
    } else {
      throw new Error("Acción inválida");
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la estructura. Revisa los datos e inténtalo de nuevo." }, { status: 400 });
  }
}
