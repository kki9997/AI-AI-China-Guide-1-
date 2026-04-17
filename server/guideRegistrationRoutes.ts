import { Request, Response, Express } from "express";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { guideRegistrations, appUsers } from "@shared/schema";
import { encrypt, decrypt, maskPhone, maskIdCard } from "./crypto";
import { validatePhone, validateIdCard, validateRealName } from "./security";
import { getSessionUser } from "./phoneAuthRoutes";

export function registerGuideRoutes(app: Express) {
  // POST /api/guide/register – Submit guide registration
  app.post("/api/guide/register", async (req: Request, res: Response) => {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "请先登录后再注册导游" });

    const { nameReal, phone, idCard, city, serviceDesc, hourlyRate, dailyRate } = req.body;

    if (!nameReal || !validateRealName(nameReal)) {
      return res.status(400).json({ error: "请填写真实姓名（2-20个汉字或英文字符）" });
    }
    if (!phone || !validatePhone(phone)) {
      return res.status(400).json({ error: "请填写正确的11位手机号" });
    }
    if (!idCard || !validateIdCard(idCard)) {
      return res.status(400).json({ error: "请填写正确的18位身份证号码" });
    }
    if (!city || city.length < 1 || city.length > 50) {
      return res.status(400).json({ error: "请填写服务城市" });
    }

    const hr = parseFloat(hourlyRate);
    const dr = parseFloat(dailyRate);
    if (isNaN(hr) || hr < 50 || hr > 5000) {
      return res.status(400).json({ error: "按小时收费应在 50-5000 元之间" });
    }
    if (isNaN(dr) || dr < 100 || dr > 20000) {
      return res.status(400).json({ error: "按天收费应在 100-20000 元之间" });
    }

    // Check if already registered
    const existing = await db.select().from(guideRegistrations)
      .where(eq(guideRegistrations.userId, session.userId));
    if (existing.length > 0) {
      return res.status(409).json({
        error: "您已提交过导游注册申请",
        registration: sanitizeReg(existing[0]),
      });
    }

    const phoneEncrypted = encrypt(phone);
    const idCardEncrypted = encrypt(idCard);

    const [reg] = await db.insert(guideRegistrations).values({
      userId: session.userId,
      nameReal,
      phoneEncrypted,
      idCardEncrypted,
      city,
      serviceDesc: serviceDesc || "",
      hourlyRate: hr,
      dailyRate: dr,
      // Auto-approve for now; add admin review flow later
      status: "approved",
    }).returning();

    // Update app user isGuide flag
    const allUsers = await db.select().from(appUsers).limit(500);
    const appUser = allUsers.find((u) => u.userId === session.userId);
    if (appUser) {
      await db.update(appUsers).set({ isGuide: "yes" }).where(eq(appUsers.id, appUser.id));
    }

    res.json({ success: true, registration: sanitizeReg(reg) });
  });

  // GET /api/guide/my-registration – Get own registration
  app.get("/api/guide/my-registration", async (req: Request, res: Response) => {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "请先登录" });

    const regs = await db.select().from(guideRegistrations)
      .where(eq(guideRegistrations.userId, session.userId));
    if (regs.length === 0) return res.json({ registration: null });
    res.json({ registration: sanitizeReg(regs[0]) });
  });

  // PUT /api/guide/profile – Update prices and profile (approved guides only)
  app.put("/api/guide/profile", async (req: Request, res: Response) => {
    const session = getSessionUser(req);
    if (!session) return res.status(401).json({ error: "请先登录" });

    const regs = await db.select().from(guideRegistrations)
      .where(eq(guideRegistrations.userId, session.userId));
    if (regs.length === 0) return res.status(404).json({ error: "您尚未注册导游" });
    if (regs[0].status !== "approved") {
      return res.status(403).json({ error: "导游审核中，暂不能修改资料" });
    }

    const { serviceDesc, hourlyRate, dailyRate, city, photoUrl } = req.body;
    const updates: Partial<typeof regs[0]> = {};

    if (serviceDesc !== undefined) updates.serviceDesc = serviceDesc;
    if (city !== undefined && city.length > 0) updates.city = city;
    if (photoUrl !== undefined) updates.photoUrl = photoUrl;

    if (hourlyRate !== undefined) {
      const hr = parseFloat(hourlyRate);
      if (isNaN(hr) || hr < 50 || hr > 5000) {
        return res.status(400).json({ error: "按小时收费应在 50-5000 元之间" });
      }
      updates.hourlyRate = hr;
    }
    if (dailyRate !== undefined) {
      const dr = parseFloat(dailyRate);
      if (isNaN(dr) || dr < 100 || dr > 20000) {
        return res.status(400).json({ error: "按天收费应在 100-20000 元之间" });
      }
      updates.dailyRate = dr;
    }

    updates.updatedAt = new Date();
    const [updated] = await db.update(guideRegistrations)
      .set(updates)
      .where(eq(guideRegistrations.userId, session.userId))
      .returning();

    res.json({ success: true, registration: sanitizeReg(updated) });
  });

  // GET /api/guide/registered-list – Admin: list all pending registrations (internal only)
  app.get("/api/guide/registered-list", async (req: Request, res: Response) => {
    const regs = await db.select().from(guideRegistrations);
    res.json(regs.map(sanitizeReg));
  });
}

function sanitizeReg(reg: typeof guideRegistrations.$inferSelect) {
  return {
    id: reg.id,
    userId: reg.userId,
    nameReal: reg.nameReal,
    phoneMasked: reg.phoneEncrypted ? maskPhone(decrypt(reg.phoneEncrypted)) : "***",
    idCardMasked: reg.idCardEncrypted ? maskIdCard(decrypt(reg.idCardEncrypted)) : "***",
    status: reg.status,
    rejectReason: reg.rejectReason,
    city: reg.city,
    serviceDesc: reg.serviceDesc,
    hourlyRate: reg.hourlyRate,
    dailyRate: reg.dailyRate,
    photoUrl: reg.photoUrl,
    createdAt: reg.createdAt,
  };
}
