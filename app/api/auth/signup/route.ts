import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  getAuthSecret,
  getSessionCookieOptions,
  registerLocalUser,
  SESSION_COOKIE,
} from "@/lib/local-auth";

const signupSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let body: z.infer<typeof signupSchema>;
  try {
    body = signupSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const identifier = (body.identifier ?? body.email ?? "").trim();
  const result = registerLocalUser(identifier, body.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  const response = NextResponse.json({ user: result.user });
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken(result.user, getAuthSecret()),
    getSessionCookieOptions()
  );
  return response;
}
