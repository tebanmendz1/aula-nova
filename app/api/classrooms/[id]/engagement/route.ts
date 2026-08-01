import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-auth";
import { isQuizAnswerCorrect } from "@/lib/quiz";
async function access(id: string, user: { sub: string; role: string }) {
  return (
    user.role === "ADMIN" ||
    !!(await prisma.classroom.findFirst({
      where: {
        id,
        OR: [
          { teacherId: user.sub },
          { enrollments: { some: { studentId: user.sub, status: "ACTIVE" } } },
        ],
      },
      select: { id: true },
    }))
  );
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getRequestUser(request);
  if (!user)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  if (!(await access(id, user)))
    return NextResponse.json({ error: "Acceso restringido" }, { status: 403 });
  const activities = await prisma.activity.findMany({
    where: {
      lesson: { module: { classroomId: id } },
      type: { in: ["QUIZ", "FORUM"] },
    },
    include: {
      quizQuestions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          prompt: true,
          options: true,
          points: true,
          questionType: true,
          ...(user.role !== "STUDENT" ? { correctAnswer: true } : {}),
        },
      },
      lesson: {
        select: {
          title: true,
          module: { select: { title: true } },
        },
      },
      quizAttempts: {
        where: user.role === "STUDENT" ? { studentId: user.sub } : {},
        include: { student: { select: { name: true } } },
      },
      forumPosts: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
    orderBy: [
      { lesson: { module: { position: "asc" } } },
      { lesson: { position: "asc" } },
      { createdAt: "asc" },
    ],
  });
  const progress = await prisma.lessonProgress.findMany({
    where: { studentId: user.sub, lesson: { module: { classroomId: id } } },
    select: { lessonId: true, completedAt: true },
  });
  return NextResponse.json({ activities, progress, role: user.role });
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getRequestUser(request);
  if (!user)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  if (!(await access(id, user)))
    return NextResponse.json({ error: "Acceso restringido" }, { status: 403 });
  const b = await request.json();
  try {
    if (b.action === "quiz_attempt") {
      if (user.role !== "STUDENT") throw new Error();
      const activity = await prisma.activity.findFirst({
        where: {
          id: String(b.activityId),
          type: "QUIZ",
          lesson: { module: { classroomId: id } },
        },
        include: { quizQuestions: true },
      });
      if (!activity) throw new Error();
      const answers = b.answers || {};
      const score = activity.quizQuestions.reduce(
        (sum, q) =>
          sum +
          (isQuizAnswerCorrect(q.questionType, answers[q.id], q.correctAnswer)
            ? q.points
            : 0),
        0,
      );
      await prisma.quizAttempt.upsert({
        where: {
          activityId_studentId: {
            activityId: activity.id,
            studentId: user.sub,
          },
        },
        create: {
          activityId: activity.id,
          studentId: user.sub,
          answers,
          score,
        },
        update: { answers, score, submittedAt: new Date() },
      });
      return NextResponse.json({ ok: true, score });
    } else if (b.action === "forum_post") {
      const activity = await prisma.activity.findFirst({
        where: {
          id: String(b.activityId),
          type: "FORUM",
          lesson: { module: { classroomId: id } },
        },
        select: { id: true },
      });
      if (!activity) throw new Error();
      await prisma.forumPost.create({
        data: {
          activityId: activity.id,
          authorId: user.sub,
          body: String(b.body).trim(),
        },
      });
    } else if (b.action === "progress") {
      if (user.role !== "STUDENT") throw new Error();
      const lesson = await prisma.lesson.findFirst({
        where: { id: String(b.lessonId), module: { classroomId: id } },
        select: { id: true },
      });
      if (!lesson) throw new Error();
      if (b.completed)
        await prisma.lessonProgress.upsert({
          where: {
            lessonId_studentId: { lessonId: lesson.id, studentId: user.sub },
          },
          create: { lessonId: lesson.id, studentId: user.sub },
          update: { completedAt: new Date() },
        });
      else
        await prisma.lessonProgress.deleteMany({
          where: { lessonId: lesson.id, studentId: user.sub },
        });
      const total = await prisma.lesson.count({
        where: { module: { classroomId: id }, published: true },
      });
      const done = await prisma.lessonProgress.count({
        where: { studentId: user.sub, lesson: { module: { classroomId: id } } },
      });
      await prisma.enrollment.updateMany({
        where: { classroomId: id, studentId: user.sub },
        data: { progress: total ? Math.round((done / total) * 100) : 0 },
      });
    } else throw new Error();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 400 });
  }
}
