import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp, createSession, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  phone: z.string().regex(/^\+216\d{8}$/),
  code: z.string().length(6),
  name: z.string().min(2).max(60).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, code, name } = schema.parse(body);

    const result = await verifyOtp(phone, code);
    if (!result.valid) {
      return NextResponse.json({ error: result.reason }, { status: 401 });
    }

    // Upsert user
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: { phone, name: name ?? null },
      });
    } else if (name && !user.name) {
      user = await prisma.user.update({ where: { id: user.id }, data: { name } });
    }

    const token = await createSession(user.id);

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, role: user.role },
    });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return res;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
