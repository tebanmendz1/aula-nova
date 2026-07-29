import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { appUrl, mailEnabled, sendMail } from "@/lib/mail";
import { newToken } from "@/lib/tokens";
import { clientIp,rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(3).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  const rate=rateLimit(`register:${clientIp(request)}`,5,60*60_000);if(!rate.allowed)return NextResponse.json({error:"Demasiados registros desde esta conexión."},{status:429});
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisa los datos ingresados." }, { status: 400 });

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (exists) return NextResponse.json({ error: "Ya existe una cuenta con este correo." }, { status: 409 });

    const initialAdmin = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const verification = newToken();
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hash(parsed.data.password, 12),
        role: parsed.data.email === initialAdmin ? "ADMIN" : "STUDENT",
        emailVerifiedAt: mailEnabled() ? null : new Date(),
        emailVerificationToken: mailEnabled() ? verification.hash : null,
        emailVerificationExpires: mailEnabled() ? new Date(Date.now()+24*60*60*1000) : null,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    if(mailEnabled()) await sendMail(user.email,"Verifica tu cuenta de AulaNova",`<h2>Hola, ${user.name}</h2><p>Confirma tu dirección de correo para activar todas las funciones.</p><p><a href="${appUrl()}/api/auth/verify?token=${verification.raw}">Verificar mi cuenta</a></p>`);

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, await createSessionToken(user), sessionCookieOptions);
    return response;
  } catch (error) {
    console.error("register_error", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta. Inténtalo nuevamente." }, { status: 500 });
  }
}
