import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const createSchema = z.object({
  name: z.string().trim().min(3).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(8).max(72),
  role: z.enum(["TEACHER", "STUDENT"]),
});

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Acceso restringido" }, { status: 403 });
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, _count: { select: { classrooms: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Acceso restringido" }, { status: 403 });
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del usuario." }, { status: 400 });
    if (await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })) {
      return NextResponse.json({ error: "El correo ya está registrado." }, { status: 409 });
    }
    const { password, ...profile } = parsed.data;
    const user = await prisma.user.create({
      data: { ...profile, passwordHash: await hash(password, 12) },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, _count: { select: { classrooms: true, enrollments: true } } },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("create_user_error", error);
    return NextResponse.json({ error: "No se pudo crear el usuario." }, { status: 500 });
  }
}
