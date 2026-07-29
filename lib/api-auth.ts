import { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function getRequestUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try { return await verifySessionToken(token); } catch { return null; }
}

export async function requireAdmin(request: NextRequest) {
  const user = await getRequestUser(request);
  return user?.role === "ADMIN" ? user : null;
}
