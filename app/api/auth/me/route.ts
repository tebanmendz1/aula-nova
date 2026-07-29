import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const user = await verifySessionToken(token);
    return NextResponse.json({ user: { id: user.sub, name: user.name, email: user.email, role: user.role } });
  } catch {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
}
