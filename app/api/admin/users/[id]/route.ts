import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const updateSchema = z.object({
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]).optional(),
  active: z.boolean().optional(),
}).refine(value => value.role !== undefined || value.active !== undefined);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Acceso restringido" }, { status: 403 });
  const { id } = await context.params;
  if (admin.sub === id) return NextResponse.json({ error: "No puedes cambiar tu propia cuenta." }, { status: 400 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Actualización inválida." }, { status: 400 });
  try {
    const user = await prisma.user.update({
      where: { id }, data: parsed.data,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, _count: { select: { classrooms: true, enrollments: true } } },
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }
}
