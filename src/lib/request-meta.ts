import type { NextRequest } from "next/server";

/** Best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

/** Vercel attaches these geo headers to every request for free — no third-party API needed. */
export function getGeo(req: NextRequest): { country: string | null; city: string | null } {
  return {
    country: req.headers.get("x-vercel-ip-country"),
    city: req.headers.get("x-vercel-ip-city"),
  };
}

export interface ParsedUserAgent {
  device: string;
  browser: string;
  os: string;
}

/** Lightweight User-Agent parser — good enough for a security log, not a full UA database. */
export function parseUserAgent(ua: string | null): ParsedUserAgent {
  if (!ua) return { device: "Unknown", browser: "Unknown", os: "Unknown" };

  let os = "Unknown";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/mac os x|macintosh/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Unknown";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/chrome\/|crios\//i.test(ua)) browser = "Chrome";
  else if (/fxios|firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua)) browser = "Safari";

  let device = "Desktop";
  if (/ipad|tablet/i.test(ua)) device = "Tablet";
  else if (/mobi|iphone|android/i.test(ua)) device = "Mobile";

  return { device, browser, os };
}

export interface RequestMeta {
  ip: string | null;
  country: string | null;
  city: string | null;
  device: string;
  browser: string;
  os: string;
  userAgentRaw: string | null;
}

export function captureRequestMeta(req: NextRequest): RequestMeta {
  const ip = getClientIp(req);
  const { country, city } = getGeo(req);
  const userAgentRaw = req.headers.get("user-agent");
  const { device, browser, os } = parseUserAgent(userAgentRaw);
  return { ip, country, city, device, browser, os, userAgentRaw };
}
