import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

export function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: false,
    originAgentCluster: false,
    permittedCrossDomainPolicies: false,
    dnsPrefetchControl: false,
    hsts: false,
  });
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 300 : 2000,
  message: { error: "请求过于频繁，请稍后再试" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.startsWith("/api"),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 100,
  message: { error: "验证请求过于频繁，请15分钟后重试" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "支付请求过于频繁，请稍后再试" },
});

function stripXss(str: string): string {
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/`/g, "&#96;")
    .replace(/=/g, "&#61;");
}

export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === "string") {
        req.body[key] = stripXss(req.body[key].trim());
      }
    }
  }
  next();
}

export function validatePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone.replace(/\s/g, ""));
}

export function validateIdCard(id: string): boolean {
  return /^\d{17}[\dX]$/i.test(id.replace(/\s/g, ""));
}

export function validateRealName(name: string): boolean {
  return name.length >= 2 && name.length <= 20 && /^[\u4e00-\u9fa5a-zA-Z\s·]+$/.test(name);
}
