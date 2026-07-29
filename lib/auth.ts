import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "aulanova_session";

export type SessionUser = JWTPayload & {
  sub: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET debe tener al menos 32 caracteres");
  return new TextEncoder().encode(value);
}

export async function createSessionToken(user: { id: string; name: string; email: string; role: SessionUser["role"] }) {
  return new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return payload as SessionUser;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};
