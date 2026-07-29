import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getRequestUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Activity = z.object({
  title: z.string(),
  description: z.string(),
  type: z.enum(["ASSIGNMENT", "QUIZ", "FORUM", "PROJECT"]),
});
const Plan = z.object({
  title: z.string(),
  summary: z.string(),
  divisions: z.array(z.object({
    title: z.string(),
    themes: z.array(z.object({
      title: z.string(),
      description: z.string(),
      topics: z.array(z.object({ title: z.string(), description: z.string() })),
      activity: Activity.nullable(),
    })),
  })),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  const { id } = await params;
  if (!user || user.role === "STUDENT") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  if (!rateLimit(`ai:${user.sub}:${clientIp(request)}`, 10, 60 * 60_000).allowed) return NextResponse.json({ error: "Límite de generaciones alcanzado" }, { status: 429 });
  const classroom = await prisma.classroom.findFirst({ where: { id, ...(user.role === "TEACHER" ? { teacherId: user.sub } : {}) }, select: { title: true, description: true } });
  if (!classroom) return NextResponse.json({ error: "Aula inválida" }, { status: 404 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Configura OPENAI_API_KEY en EasyPanel para activar el asistente" }, { status: 503 });

  const body = await request.json();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      input: [
        { role: "system", content: "Eres un diseñador instruccional experto. Genera una estructura curricular clara en español. Las divisiones son unidades, los temas son lecciones y los subtemas son conceptos concretos. Incluye una actividad evaluable variada por tema cuando aporte valor; en caso contrario usa null. Devuelve contenido listo para que un docente lo revise y nunca lo publiques automáticamente." },
        { role: "user", content: `Curso: ${classroom.title}. Descripción: ${classroom.description || ""}. Solicitud: ${String(body.prompt || "").slice(0, 3000)}. Nivel: ${String(body.level || "intermedio").slice(0, 80)}. Duración: ${String(body.duration || "8 semanas").slice(0, 80)}.` },
      ],
      text: { format: zodTextFormat(Plan, "course_plan") },
    });
    if (!response.output_parsed) return NextResponse.json({ error: "La IA no produjo una propuesta utilizable" }, { status: 422 });
    return NextResponse.json({ plan: response.output_parsed });
  } catch (error) {
    console.error("course_ai_error", error);
    return NextResponse.json({ error: "No se pudo generar el contenido con IA" }, { status: 502 });
  }
}
