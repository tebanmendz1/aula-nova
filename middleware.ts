import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose/jwt/verify";

const publicRoutes = ["/login", "/registro"];

async function validSession(token?: string) {
  if (!token || !process.env.AUTH_SECRET) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = publicRoutes.includes(path);
  const authenticated = await validSession(request.cookies.get("aulanova_session")?.value);

  if (!authenticated && !isPublic) return NextResponse.redirect(new URL("/login", request.url));
  if (authenticated && isPublic) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/registro", "/admin/:path*"],
};
