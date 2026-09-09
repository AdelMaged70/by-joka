// lib/rateLimit.ts

const rateLimitMap = new Map<string, { count: number; time: number }>();

const LIMIT = 5; // 5 uploads
const WINDOW = 60 * 1000; // كل دقيقة

export function checkRateLimit(ip: string) {
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, time: now });
    return true;
  }

  const data = rateLimitMap.get(ip)!;

  if (now - data.time > WINDOW) {
    rateLimitMap.set(ip, { count: 1, time: now });
    return true;
  }

  if (data.count >= LIMIT) {
    return false;
  }

  data.count++;
  return true;
}