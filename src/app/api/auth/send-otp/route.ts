import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendOtp } from "@/lib/auth";

const schema = z.object({
  phone: z.string().regex(/^\+216\d{8}$/, "Numéro tunisien invalide (format: +21600000000)"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = schema.parse(body);

    const code = await sendOtp(phone);

    // Dev convenience: the SMS provider is mocked, so hand the code back outside production
    return NextResponse.json({
      success: true,
      message: "Code envoyé",
      ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
