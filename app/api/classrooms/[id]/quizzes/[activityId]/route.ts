import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
const types = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_TEXT",
] as const;
async function quiz(
  id: string,
  activityId: string,
  user: { sub: string; role: string },
) {
  return prisma.activity.findFirst({
    where: {
      id: activityId,
      type: "QUIZ",
      lesson: {
        module: {
          classroomId: id,
          ...(user.role === "TEACHER"
            ? { classroom: { teacherId: user.sub } }
            : {}),
        },
      },
    },
    include: {
      lesson: {
        select: {
          title: true,
          module: {
            select: { title: true, classroom: { select: { title: true } } },
          },
        },
      },
      topic: { select: { title: true } },
      quizQuestions: { orderBy: { position: "asc" } },
    },
  });
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> },
) {
  const user = await getRequestUser(request),
    { id, activityId } = await params;
  if (!user || !["ADMIN", "TEACHER"].includes(user.role))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const activity = await quiz(id, activityId, user);
  if (!activity)
    return NextResponse.json(
      { error: "Cuestionario no encontrado" },
      { status: 404 },
    );
  return NextResponse.json({ activity });
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; activityId: string }> },
) {
  const user = await getRequestUser(request),
    { id, activityId } = await params;
  if (!user || !["ADMIN", "TEACHER"].includes(user.role))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const activity = await quiz(id, activityId, user);
  if (!activity)
    return NextResponse.json(
      { error: "Cuestionario no encontrado" },
      { status: 404 },
    );
  const body = await request.json(),
    action = String(body.action || "");
  try {
    if (action === "save_question") {
      const parsed = z
        .object({
          questionId: z.string().optional(),
          prompt: z.string().trim().min(3).max(2000),
          questionType: z.enum(types),
          options: z.array(z.string().trim().min(1).max(500)).max(20),
          correctAnswers: z.array(z.string()).min(1),
          points: z.coerce.number().positive().max(1000),
          explanation: z.string().max(3000).optional(),
        })
        .parse(body);
      const options =
        parsed.questionType === "TRUE_FALSE"
          ? ["Verdadero", "Falso"]
          : parsed.questionType === "SHORT_TEXT"
            ? []
            : parsed.options;
      if (
        !["SHORT_TEXT", "TRUE_FALSE"].includes(parsed.questionType) &&
        options.length < 2
      )
        throw new Error("OPTIONS");
      const correctAnswer =
        parsed.questionType === "MULTIPLE_CHOICE"
          ? JSON.stringify(parsed.correctAnswers.sort())
          : parsed.correctAnswers[0];
      if (parsed.questionId) {
        const existing = activity.quizQuestions.find(
          (q) => q.id === parsed.questionId,
        );
        if (!existing) throw new Error();
        await prisma.quizQuestion.update({
          where: { id: existing.id },
          data: {
            prompt: parsed.prompt,
            questionType: parsed.questionType,
            options,
            correctAnswer,
            points: parsed.points,
            explanation: parsed.explanation || null,
          },
        });
      } else {
        const position = activity.quizQuestions.length + 1;
        await prisma.quizQuestion.create({
          data: {
            activityId,
            prompt: parsed.prompt,
            questionType: parsed.questionType,
            options,
            correctAnswer,
            points: parsed.points,
            explanation: parsed.explanation || null,
            position,
          },
        });
      }
    } else if (action === "delete_question") {
      const questionId = String(body.questionId);
      await prisma.quizQuestion.deleteMany({
        where: { id: questionId, activityId },
      });
      const remaining = await prisma.quizQuestion.findMany({
        where: { activityId },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      await prisma.$transaction(
        remaining.map((q, index) =>
          prisma.quizQuestion.update({
            where: { id: q.id },
            data: { position: index + 1 },
          }),
        ),
      );
    } else if (action === "move_question") {
      const questionId = String(body.questionId),
        direction = body.direction === "up" ? -1 : 1,
        current = activity.quizQuestions.findIndex((q) => q.id === questionId),
        target = current + direction;
      if (current < 0 || target < 0 || target >= activity.quizQuestions.length)
        return NextResponse.json({ ok: true });
      const a = activity.quizQuestions[current],
        b = activity.quizQuestions[target];
      await prisma.$transaction([
        prisma.quizQuestion.update({
          where: { id: a.id },
          data: { position: -1 },
        }),
        prisma.quizQuestion.update({
          where: { id: b.id },
          data: { position: a.position },
        }),
        prisma.quizQuestion.update({
          where: { id: a.id },
          data: { position: b.position },
        }),
      ]);
    } else if (action === "settings") {
      const parsed = z
        .object({
          title: z.string().trim().min(3).max(160),
          description: z.string().max(5000),
          maxScore: z.coerce.number().positive(),
          dueAt: z.string().optional(),
        })
        .parse(body);
      await prisma.activity.update({
        where: { id: activityId },
        data: {
          title: parsed.title,
          description: parsed.description,
          maxScore: parsed.maxScore,
          dueAt: parsed.dueAt ? new Date(parsed.dueAt) : null,
        },
      });
    } else throw new Error();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("quiz_builder_error", error);
    return NextResponse.json(
      {
        error: "No se pudo guardar. Revisa la pregunta, opciones y respuestas.",
      },
      { status: 400 },
    );
  }
}
