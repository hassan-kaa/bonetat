import { prisma } from "./prisma";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";

const SESSION_COOKIE = "bonetat_session";
const SESSION_DURATION_DAYS = 30;
const OTP_EXPIRY_MINUTES = 10;

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtp(phone: string): Promise<string> {
  await prisma.otpCode.updateMany({
    where: { phone, used: false },
    data: { used: true },
  });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpCode.create({ data: { phone, code, expiresAt } });

  // Mock: print to console instead of sending SMS
  console.log(`\n📱 [MOCK OTP] Phone: ${phone} | Code: ${code}\n`);

  return code;
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ valid: boolean; reason?: string }> {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, code, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return { valid: false, reason: "Code invalide" };
  if (otp.expiresAt < new Date()) return { valid: false, reason: "Code expiré" };

  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
  return { valid: true };
}

export async function createSession(userId: string): Promise<string> {
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({ data: { userId, token, expiresAt } });
  return token;
}

export async function getSessionUser(token?: string) {
  const cookieStore = await cookies();
  const sessionToken = token ?? cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: { include: { vendor: true } } },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export { SESSION_COOKIE };

/** Approved partner behind the current session, or null */
export async function getVendorUser() {
  const user = await getSessionUser();
  if (!user?.vendor || user.vendor.status !== "APPROVED") return null;
  return { user, vendor: user.vendor };
}

export async function getAdminUser() {
  const user = await getSessionUser();
  return user?.role === "ADMIN" ? user : null;
}
