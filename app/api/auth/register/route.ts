import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(3).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisa los datos ingresados." }, { status: 400 });

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (exists) return NextResponse.json({ error: "Ya existe una cuenta con este correo." }, { status: 409 });

    const initialAdmin = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hash(parsed.data.password, 12),
        role: parsed.data.email === initialAdmin ? "ADMIN" : "STUDENT",
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, await createSessionToken(user), sessionCookieOptions);
    return response;
  } catch (error) {
    console.error("register_error", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta. Inténtalo nuevamente." }, { status: 500 });
  }
}
