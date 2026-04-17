import { Express, Request, Response } from "express";
import { createHmac, randomUUID } from "crypto";
import { db } from "./db";
import { appUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

const SESSION_SECRET = process.env.SESSION_SECRET || "travel-app-session-secret-v1";

// ── credentials (set via environment secrets) ──
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || "";
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || "";
const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID || "";

function getBaseUrl(req: Request): string {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
  const proto = req.headers["x-forwarded-proto"] || (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}

function signSession(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const sig = createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
  return `${data}.${sig}`;
}

function setCookie(res: Response, userId: string, phoneEncrypted: string, isGuide: boolean) {
  // Use same session format as phoneAuthRoutes for compatibility with getSessionUser()
  const token = signSession({
    userId,
    phoneEncrypted,
    isGuide,
    exp: Date.now() + 30 * 24 * 3600 * 1000,
  });
  res.cookie("app_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 3600 * 1000,
    path: "/",
  });
}

async function findOrCreateOAuthUser(provider: string, openid: string, nickname: string, avatarUrl?: string) {
  // Use provider:openid as the unique key stored in phoneEncrypted
  const key = `${provider}:${openid}`;
  const existing = await db.select().from(appUsers).where(eq(appUsers.phoneEncrypted, key));
  if (existing.length > 0) {
    // Update nickname/avatar if changed
    await db.update(appUsers).set({ nickname, avatarUrl, lastLoginAt: new Date() }).where(eq(appUsers.id, existing[0].id));
    return { ...existing[0], nickname, avatarUrl };
  }
  const [newUser] = await db.insert(appUsers).values({
    userId: randomUUID(),
    phoneEncrypted: key,
    nickname,
    avatarUrl,
    isGuide: "no",
    lastLoginAt: new Date(),
  }).returning();
  return newUser;
}

export function registerOAuthRoutes(app: Express) {

  // ─────────────────── WeChat OAuth ───────────────────

  // Step 1: Start WeChat login → return redirect URL (or error if not configured)
  app.get("/api/auth/wechat/start", (req: Request, res: Response) => {
    if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
      return res.json({
        configured: false,
        message: "微信登录尚未配置，请联系管理员设置 WECHAT_APP_ID 和 WECHAT_APP_SECRET",
      });
    }
    const base = getBaseUrl(req);
    const callback = encodeURIComponent(`${base}/api/auth/wechat/callback`);
    const state = createHmac("sha256", SESSION_SECRET).update(Date.now().toString()).digest("hex").slice(0, 16);
    const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APP_ID}&redirect_uri=${callback}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
    res.json({ configured: true, url });
  });

  // Step 2: WeChat OAuth callback
  app.get("/api/auth/wechat/callback", async (req: Request, res: Response) => {
    const { code } = req.query;
    if (!code || !WECHAT_APP_ID || !WECHAT_APP_SECRET) {
      return res.redirect("/?auth_error=wechat_failed");
    }
    try {
      const tokenRes = await fetch(
        `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`
      );
      const token = await tokenRes.json() as any;
      if (token.errcode) throw new Error(token.errmsg);

      const infoRes = await fetch(
        `https://api.weixin.qq.com/sns/userinfo?access_token=${token.access_token}&openid=${token.openid}&lang=zh_CN`
      );
      const info = await infoRes.json() as any;

      const user = await findOrCreateOAuthUser("wechat", token.openid, info.nickname || "微信用户", info.headimgurl);
      setCookie(res, user.userId, user.phoneEncrypted, user.isGuide === "yes");
      res.redirect("/?auth_success=wechat");
    } catch (err) {
      console.error("WeChat OAuth error:", err);
      res.redirect("/?auth_error=wechat_failed");
    }
  });

  // ─────────────────── Alipay OAuth ───────────────────

  app.get("/api/auth/alipay/start", (req: Request, res: Response) => {
    if (!ALIPAY_APP_ID) {
      return res.json({
        configured: false,
        message: "支付宝登录尚未配置，请联系管理员设置 ALIPAY_APP_ID 和 ALIPAY_PRIVATE_KEY",
      });
    }
    const base = getBaseUrl(req);
    const callback = encodeURIComponent(`${base}/api/auth/alipay/callback`);
    const state = createHmac("sha256", SESSION_SECRET).update(Date.now().toString()).digest("hex").slice(0, 16);
    const url = `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?app_id=${ALIPAY_APP_ID}&scope=auth_user&redirect_uri=${callback}&state=${state}`;
    res.json({ configured: true, url });
  });

  app.get("/api/auth/alipay/callback", async (req: Request, res: Response) => {
    const { auth_code } = req.query;
    if (!auth_code || !ALIPAY_APP_ID) {
      return res.redirect("/?auth_error=alipay_failed");
    }
    // Full Alipay OAuth requires RSA-signed requests via alipay-sdk
    // Stub: create anonymous user until SDK is integrated
    try {
      const user = await findOrCreateOAuthUser("alipay", String(auth_code), "支付宝用户");
      setCookie(res, user.userId, user.phoneEncrypted, user.isGuide === "yes");
      res.redirect("/?auth_success=alipay");
    } catch {
      res.redirect("/?auth_error=alipay_failed");
    }
  });
}
