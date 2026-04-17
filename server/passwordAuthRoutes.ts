import { Express, Request, Response } from "express";
import { createHmac, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { appUsers } from "@shared/schema";
import { eq, or } from "drizzle-orm";
import { authLimiter } from "./security";

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
  } catch { return null; }
}

function isStrongPassword(p: string): boolean {
  return p.length >= 6;
}

function sanitizeUsername(u: string): string {
  return u.trim().toLowerCase().replace(/[^a-z0-9_\u4e00-\u9fff]/g, "");
}

export function registerPasswordAuthRoutes(app: Express) {

  // POST /api/auth/password/register
  app.post("/api/auth/password/register", authLimiter, async (req: Request, res: Response) => {
    try {
      const { username, password, nickname } = req.body;

      if (!username || typeof username !== "string" || username.trim().length < 3) {
        return res.status(400).json({ error: "用户名至少 3 个字符" });
      }
      if (!password || !isStrongPassword(password)) {
        return res.status(400).json({ error: "密码至少 6 位" });
      }

      const clean = sanitizeUsername(username);
      if (clean.length < 2) {
        return res.status(400).json({ error: "用户名只能包含字母、数字、下划线或中文" });
      }

      // Check uniqueness
      const existing = await db.select({ id: appUsers.id })
        .from(appUsers).where(eq(appUsers.username, clean));
      if (existing.length > 0) {
        return res.status(409).json({ error: "用户名已被使用，请换一个" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const userId = randomBytes(16).toString("hex");
      const displayName = (nickname || clean).slice(0, 20);

      const [user] = await db.insert(appUsers).values({
        userId,
        phoneEncrypted: `pwd:${clean}`,   // satisfy NOT NULL; identifies as password-auth
        username: clean,
        passwordHash,
        nickname: displayName,
        isGuide: "no",
        lastLoginAt: new Date(),
      }).returning();

      const token = signSession({
        userId: user.userId,
        phoneEncrypted: user.phoneEncrypted,
        isGuide: false,
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      res.cookie("app_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.json({
        success: true,
        user: { userId: user.userId, nickname: user.nickname, isGuide: false, phoneMasked: "账号用户" },
      });
    } catch (e: any) {
      console.error("Register error:", e);
      res.status(500).json({ error: "注册失败，请稍后重试" });
    }
  });

  // POST /api/auth/password/login
  app.post("/api/auth/password/login", authLimiter, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "请填写用户名和密码" });
      }

      const clean = sanitizeUsername(username);
      const rows = await db.select().from(appUsers).where(eq(appUsers.username, clean));

      if (rows.length === 0) {
        return res.status(401).json({ error: "用户名或密码不正确" });
      }

      const user = rows[0];
      if (!user.passwordHash) {
        return res.status(401).json({ error: "该账号不支持密码登录，请使用其他方式" });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: "用户名或密码不正确" });
      }

      await db.update(appUsers).set({ lastLoginAt: new Date() }).where(eq(appUsers.id, user.id));

      const token = signSession({
        userId: user.userId,
        phoneEncrypted: user.phoneEncrypted,
        isGuide: user.isGuide === "yes",
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      res.cookie("app_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.json({
        success: true,
        user: {
          userId: user.userId,
          nickname: user.nickname,
          isGuide: user.isGuide === "yes",
          phoneMasked: "账号用户",
        },
      });
    } catch (e) {
      console.error("Login error:", e);
      res.status(500).json({ error: "登录失败，请稍后重试" });
    }
  });
}
