import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { clientIp,rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

export async function POST(request: Request) {
  const rate=rateLimit(`login:${clientIp(request)}`,10,15*60_000);if(!rate.allowed)return NextResponse.json({error:"Demasiados intentos. Inténtalo más tarde."},{status:429,headers:{"Retry-After":String(rate.retryAfter)}});
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !user.active || !(await compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }
    if(process.env.REQUIRE_EMAIL_VERIFICATION==="true"&&!user.emailVerifiedAt)return NextResponse.json({error:"Verifica tu correo antes de iniciar sesión."},{status:403});

    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    const response = NextResponse.json({ user: safeUser });
    response.cookies.set(SESSION_COOKIE, await createSessionToken(safeUser), sessionCookieOptions);
    return response;
  } catch (error) {
    console.error("login_error", error);
    return NextResponse.json({ error: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
