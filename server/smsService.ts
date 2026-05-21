import { randomInt } from "node:crypto";
import { ENV } from "./_core/env";

const DEFAULT_SMS_API_URL = "https://gyytz.market.alicloudapi.com/sms/smsSend";
const DEFAULT_TEMPLATE_ID = "908e94ccf08b4476ba6c876d13f084ad";
const DEFAULT_SIGN_ID = "2e65b1bb3d054466b82f0c9d125465e2";
const DEFAULT_EXPIRE_MINUTES = 5;

export type SmsPurpose = "login" | "safe_password" | string;

function resolveExpireMinutes() {
  const value = Number(ENV.smsExpireMinutes || DEFAULT_EXPIRE_MINUTES);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_EXPIRE_MINUTES;
}

function resolveTemplateId(purpose: SmsPurpose) {
  if (purpose === "safe_password") {
    return ENV.smsSafePasswordTemplateId || ENV.smsLoginTemplateId || DEFAULT_TEMPLATE_ID;
  }
  return ENV.smsLoginTemplateId || DEFAULT_TEMPLATE_ID;
}

function resolveSignId() {
  return ENV.smsSignId || DEFAULT_SIGN_ID;
}

function shouldUseMockMode() {
  return process.env.NODE_ENV === "test" || (!ENV.isProduction && !ENV.smsAppCode);
}

export function generateVerificationCode() {
  if (shouldUseMockMode()) return "123456";
  return String(randomInt(100000, 1000000));
}

function buildSmsUrl(phone: string, code: string, purpose: SmsPurpose) {
  const url = new URL(ENV.smsApiUrl || DEFAULT_SMS_API_URL);
  url.searchParams.set("mobile", phone);
  url.searchParams.set("templateId", resolveTemplateId(purpose));
  url.searchParams.set("smsSignId", resolveSignId());
  url.searchParams.set("param", `**code**:${code},**minute**:${resolveExpireMinutes()}`);
  return url.toString();
}

function isExplicitFailure(data: unknown) {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  if (record.success === false) return true;
  const code = String(record.code ?? record.Code ?? record.status ?? record.statusCode ?? record.return_code ?? "").trim();
  if (!code) return false;
  const normalized = code.toUpperCase();
  return !["0", "200", "OK", "SUCCESS", "TRUE", "00000"].includes(normalized);
}

function extractErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  return String(record.msg ?? record.message ?? record.Message ?? record.error ?? record.subMsg ?? fallback);
}

export async function sendVerificationSms(phone: string, code: string, purpose: SmsPurpose) {
  if (shouldUseMockMode()) {
    console.log(`[SMS:MOCK] 手机号: ${phone} 验证码: ${code} 用途: ${purpose}`);
    return { success: true, mode: "mock" as const };
  }

  if (!ENV.smsAppCode) {
    throw new Error("短信服务未配置 AppCode");
  }

  const response = await fetch(buildSmsUrl(phone, code, purpose), {
    method: "POST",
    headers: {
      Authorization: `APPCODE ${ENV.smsAppCode}`,
      Accept: "application/json, text/plain, */*",
    },
  });

  const rawText = await response.text();
  let payload: unknown = rawText;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = rawText;
  }

  if (!response.ok) {
    throw new Error(`短信服务请求失败（${response.status}）：${extractErrorMessage(payload, rawText || response.statusText)}`);
  }

  if (isExplicitFailure(payload)) {
    throw new Error(`短信服务返回失败：${extractErrorMessage(payload, rawText || "未知错误")}`);
  }

  console.log(`[SMS] 发送成功 手机号: ${phone} 用途: ${purpose}`);
  return { success: true, mode: "live" as const, payload };
}

export function getSmsExpireMinutes() {
  return resolveExpireMinutes();
}
