import { Request, Response, Express } from "express";
import { createHmac, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { phoneAuthCodes, appUsers } from "@shared/schema";
import { encrypt, decrypt, maskPhone } from "./crypto";
import { authLimiter, validatePhone } from "./security";

const SESSION_SECRET = process.env.SESSION_SECRET || "travel-app-session-secret-v1";

function signSession(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const sig = createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
  return `${data}.${sig}`;
}

function verifySession(token: string): any | null {
  try {
    const [data, sig] = token.split(".");
    const expected = createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionUser(req: Request): { userId: string; phoneEncrypted: string; isGuide: boolean } | null {
  const token = req.cookies?.app_session;
  if (!token) return null;
  const session = verifySession(token);
  if (!session) return null;
  return session;
}

export function registerPhoneAuthRoutes(app: Express) {
  app.use(cookieParser());

  // POST /api/auth/phone/send – Generate & return OTP (mock SMS)
  app.post("/api/auth/phone/send", authLimiter, async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;
      if (!phone || !validatePhone(phone)) {
        return res.status(400).json({ error: "手机号格式不正确，请输入11位中国大陆手机号" });
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await bcrypt.hash(code, 10);
      const phoneEncrypted = encrypt(phone);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      await db.insert(phoneAuthCodes).values({ phoneEncrypted, codeHash, expiresAt, used: "no" });

      // In production, send via SMS API. In dev, return code in response.
      res.json({
        success: true,
        message: `验证码已发送至 ${maskPhone(phone)}`,
        // DEV ONLY – remove in production
        devCode: process.env.NODE_ENV === "production" ? undefined : code,
      });
    } catch (e: any) {
      res.status(500).json({ error: "发送验证码失败，请稍后重试" });
    }
  });

  // POST /api/auth/phone/verify – Verify OTP and create session
  app.post("/api/auth/phone/verify", authLimiter, async (req: Request, res: Response) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !validatePhone(phone)) {
        return res.status(400).json({ error: "手机号格式不正确" });
      }
      if (!code || code.length !== 6) {
        return res.status(400).json({ error: "验证码格式不正确" });
      }

      const phoneEncrypted = encrypt(phone);

      // Find most recent unused code for this phone
      const allCodes = await db
        .select()
        .from(phoneAuthCodes)
        .orderBy(desc(phoneAuthCodes.createdAt))
        .limit(5);

      // Find matching code for this phone
      let matchedCode: typeof allCodes[0] | null = null;
      for (const c of allCodes) {
        if (c.used === "yes") continue;
        if (new Date(c.expiresAt).getTime() < Date.now()) continue;
        // Decrypt stored phone to compare
        const storedPhone = decrypt(c.phoneEncrypted);
        if (storedPhone !== phone) continue;
        const valid = await bcrypt.compare(code, c.codeHash);
        if (valid) { matchedCode = c; break; }
      }

      if (!matchedCode) {
        return res.status(401).json({ error: "验证码不正确或已过期，请重新获取" });
      }

      // Mark code as used
      await db.update(phoneAuthCodes).set({ used: "yes" }).where(eq(phoneAuthCodes.id, matchedCode.id));

      // Find or create app user
      const existingUsers = await db.select().from(appUsers).limit(200);
      let appUser = existingUsers.find((u) => decrypt(u.phoneEncrypted) === phone);

      if (!appUser) {
        const userId = randomBytes(16).toString("hex");
        const [created] = await db.insert(appUsers).values({
          userId,
          phoneEncrypted,
          nickname: `游客${phone.slice(-4)}`,
          isGuide: "no",
        }).returning();
        appUser = created;
      } else {
        await db.update(appUsers).set({ lastLoginAt: new Date() }).where(eq(appUsers.id, appUser.id));
      }

      const sessionPayload = {
        userId: appUser.userId,
        phoneEncrypted: appUser.phoneEncrypted,
        isGuide: appUser.isGuide === "yes",
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      };

      const token = signSession(sessionPayload);
      res.cookie("app_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        user: {
          userId: appUser.userId,
          nickname: appUser.nickname,
          isGuide: appUser.isGuide === "yes",
          phoneMasked: maskPhone(phone),
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: "验证失败，请稍后重试" });
    }
  });

  // GET /api/auth/phone/me – Get current session user
  app.get("/api/auth/phone/me", async (req: Request, res: Response) => {
    const session = getSessionUser(req);
    if (!session) return res.json({ user: null });

    const allUsers = await db.select().from(appUsers).limit(500);
    const appUser = allUsers.find((u) => u.userId === session.userId);
    if (!appUser) return res.json({ user: null });

    const phone = decrypt(appUser.phoneEncrypted);
    res.json({
      user: {
        userId: appUser.userId,
        nickname: appUser.nickname,
        avatarUrl: appUser.avatarUrl,
        isGuide: appUser.isGuide === "yes",
        phoneMasked: maskPhone(phone),
      },
    });
  });

  // POST /api/auth/phone/logout
  app.post("/api/auth/phone/logout", (req: Request, res: Response) => {
    res.clearCookie("app_session");
    res.json({ success: true });
  });

  // PUT /api/auth/phone/nickname
  app.put("/api/auth/phone/nickname", async (req: Request, res: Response) => {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "请先登录" });
    const { nickname } = req.body;
    if (!nickname || nickname.length < 1 || nickname.length > 20) {
      return res.status(400).json({ error: "昵称长度1-20字" });
    }
    const allUsers = await db.select().from(appUsers).limit(500);
    const appUser = allUsers.find((u) => u.userId === session.userId);
    if (!appUser) return res.status(404).json({ error: "用户不存在" });
    await db.update(appUsers).set({ nickname }).where(eq(appUsers.id, appUser.id));
    res.json({ success: true });
  });
}
