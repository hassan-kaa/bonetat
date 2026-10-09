import { NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);

  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
