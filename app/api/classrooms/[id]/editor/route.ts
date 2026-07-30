import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const titleSchema = z.string().trim().min(3).max(160);
const activityTypes = ["ASSIGNMENT", "QUIZ", "FORUM", "PROJECT"] as const;
const resourceTypes = ["DOCUMENT", "VIDEO", "LINK", "AUDIO", "PRESENTATION", "INTERACTIVE"] as const;

async function owns(id: string, user: { sub: string; role: string }) {
  return prisma.classroom.findFirst({ where: { id, ...(user.role === "TEACHER" ? { teacherId: user.sub } : user.role === "ADMIN" ? {} : { id: "__none__" }) }, select: { id: true } });
}

async function resolveTarget(classroomId: string, lessonId?: string, topicId?: string) {
  if (topicId) {
    const topic = await prisma.topic.findFirst({ where: { id: topicId, lesson: { module: { classroomId } } }, select: { id: true, lessonId: true } });
    if (!topic) throw new Error("Subtema inválido");
    return { lessonId: topic.lessonId, topicId: topic.id };
  }
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, module: { classroomId } }, select: { id: true } });
  if (!lesson) throw new Error("Tema inválido");
  return { lessonId: lesson.id, topicId: null };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request), { id } = await params;
  if (!user || !await owns(id, user)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const classroom = await prisma.classroom.findUnique({ where: { id }, include: { modules: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" }, include: { topics: { orderBy: { position: "asc" }, include: { resources: true, activities: true } }, resources: { where: { topicId: null } }, activities: { where: { topicId: null } } } } } } } });
  return NextResponse.json({ classroom });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request), { id } = await params;
  if (!user || !await owns(id, user)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const body = await request.json();
  try {
    if (body.action === "division") {
      const position = await prisma.module.count({ where: { classroomId: id } }) + 1;
      await prisma.module.create({ data: { classroomId: id, title: titleSchema.parse(body.title), position, published: true } });
    } else if (body.action === "theme") {
      const module = await prisma.module.findFirst({ where: { id: String(body.parentId), classroomId: id } });
      if (!module) throw new Error("Unidad inválida");
      const position = await prisma.lesson.count({ where: { moduleId: module.id } }) + 1;
      await prisma.lesson.create({ data: { moduleId: module.id, title: titleSchema.parse(body.title), content: { text: z.string().trim().max(5000).parse(body.description || "") }, position, published: true } });
    } else if (body.action === "create_element") {
      const target = await resolveTarget(id, body.lessonId && String(body.lessonId), body.topicId && String(body.topicId));
      const title = titleSchema.parse(body.title), description = z.string().trim().max(5000).parse(body.description || "");
      if (body.elementType === "SUBTOPIC" || body.elementType === "TEXT") {
        const position = await prisma.topic.count({ where: { lessonId: target.lessonId } }) + 1;
        await prisma.topic.create({ data: { lessonId: target.lessonId, title, description, position } });
      } else if (activityTypes.includes(body.elementType)) {
        await prisma.activity.create({ data: { lessonId: target.lessonId, topicId: target.topicId, title, description, type: body.elementType, dueAt: body.dueAt ? new Date(body.dueAt) : null, maxScore: Math.max(1, Number(body.maxScore || 100)) } });
      } else if (resourceTypes.includes(body.elementType)) {
        const url = z.string().trim().min(1).max(4000).parse(body.url);
        await prisma.resource.create({ data: { lessonId: target.lessonId, topicId: target.topicId, title, type: body.elementType, url, size: body.size ? Number(body.size) : null } });
      } else throw new Error("Elemento inválido");
    } else if (body.action === "move_element") {
      const target = await resolveTarget(id, body.lessonId && String(body.lessonId), body.topicId && String(body.topicId));
      const elementId = String(body.elementId), kind = String(body.kind);
      if (kind === "topic") {
        const topic = await prisma.topic.findFirst({ where: { id: elementId, lesson: { module: { classroomId: id } } } });
        if (!topic) throw new Error("Elemento inválido");
        const position = await prisma.topic.count({ where: { lessonId: target.lessonId } }) + 1;
        await prisma.topic.update({ where: { id: elementId }, data: { lessonId: target.lessonId, position } });
      } else if (kind === "resource") {
        const item = await prisma.resource.findFirst({ where: { id: elementId, lesson: { module: { classroomId: id } } } });
        if (!item) throw new Error("Elemento inválido");
        await prisma.resource.update({ where: { id: elementId }, data: target });
      } else if (kind === "activity") {
        const item = await prisma.activity.findFirst({ where: { id: elementId, lesson: { module: { classroomId: id } } } });
        if (!item) throw new Error("Elemento inválido");
        await prisma.activity.update({ where: { id: elementId }, data: target });
      } else throw new Error("Elemento inválido");
    } else if (body.action === "delete_element") {
      const elementId = String(body.elementId), kind = String(body.kind);
      if (kind === "topic") await prisma.topic.deleteMany({ where: { id: elementId, lesson: { module: { classroomId: id } } } });
      else if (kind === "resource") await prisma.resource.deleteMany({ where: { id: elementId, lesson: { module: { classroomId: id } } } });
      else if (kind === "activity") await prisma.activity.deleteMany({ where: { id: elementId, lesson: { module: { classroomId: id } } } });
      else throw new Error("Elemento inválido");
    } else throw new Error("Acción inválida");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("course_editor_error", error);
    return NextResponse.json({ error: "No se pudo guardar el cambio. Revisa los datos." }, { status: 400 });
  }
}
