/**
 * cs2pifa API 服务
 * 商品列表实时从API读取，不存数据库
 * 签名方式：对参数 ksort 后拼接字符串，用 RSA SHA256 私钥签名，base64 编码
 */
import crypto from "crypto";

// ── 配置 ─────────────────────────────────────────────────────────────────────
const APP_KEY = "open_8bfff2a5f69c4ba7a7f463ad5822460c";

const PRIVATE_KEY_RAW =
  "MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCz/e3kJB21FEsQ" +
  "JyyoMa5zftu5xatbeN5FtVG9cSinssdmGix8w+UVSXgxbKNMRx/VKOg8RvEQWiwU" +
  "SFQIAE9ltsSIG02f6DqmjP2eFioaklgOGIOPv8VbEzzAyvbWaVFzyiq8JGiPEFpb" +
  "HfSHBIGLw6oHxnKdJrbPIVDzPx+ImGz3wd2QwjQ9lU3H6vO4qCB6uC45bPrZNNU5" +
  "lXhwHpxmSxmyH7/zDWZuJ/UIWT1eF+ao+ucgEPVrab12Y56xJYqpXPkGl+DvAsms" +
  "deOXw2PufyADYKMeiNrFfS/hag4CZ94QikLAQbg56ipKfHYKHiJdGb1c8vQG4QXN" +
  "X1yVosUhAgMBAAECggEAO9M/+d+DPEfFd1X+At2YhWz57XJlNV8kSfktdREimTLU" +
  "EfzLIqEeCIhF+e+JC3ZsfzY8kqRlxbCjDA7KV2p6+WzZQAALOgY/UFJ2jdACKJjR" +
  "ycWeHO55036+Z7pOdw/Ecf8VWzmiw0KFNdnsB+CYinL7leABAnj2tDv3oxItEgJB" +
  "JwEznnRj5IRixKuZCOrrpMvrZbWqGRQrVccNI4fbI8s0IwU0mexY+eDhJjnjquEn" +
  "q2/5IM/CDOOp78tzrVEB3LHbTBp8+8GIoKNTa2s0+dNatT6TTyFXgJ41cA8HxXtY" +
  "xM6lRXHbgUIe2Sm8/E2jrKwuNZjZLbijuilG7iWX0QKBgQDaBTrh8gx+lA01vtiq" +
  "xx4IMhY/PgNlIyieX/x3TVIjrAoiX22If+gSihDuErR8xYiUQxOvfMa6yij3FPoB" +
  "HwmwEIrHXz5Nmgk0FZKjrQkC7L4zerX4egtvvwhiqZq6sPai4BuTMh//kQYyia+N" +
  "6X+NlLtw9C1qv2jI7rxVhB7HjQKBgQDTWMqfKDMdOXVkhMWLxc9JJCub9+LS2XpL" +
  "BH0tDyMgA4Bw5dSqv/ubt+EqiE/F1xWGyGQ7QpTtnAzU9a/CZLOh7lJ+ZYcjWnIH" +
  "a4W2aw49FGmQHl0qXqx3fq997BWbKmNZS/aNkQh0WqXwH2A7TD+Tc3W13XibwkJ6" +
  "QRLrhyBU5QKBgQDAlawc2HZG/brpherYeElEDhJuzPWsyjDgLYPTUr7C+f59vHQC" +
  "BpJWhhVMZ8N9D/SEmvfxpTPa3ibvk1z/zo39M6+TS8O6Qt3sXz4ITRpPthaRXM0P" +
  "b6dYj5P1q0IdtaI33+Ub0kRHubCSxeMIZYEh7Ibi0R6pU+lYzOIaXDngJQKBgQDH" +
  "OK6fQpSUGsKXAzT34XnY91iISC2vFcPajRu16svwdHyRb4R9hEUX70g4AJA57Npk" +
  "1+brmYKrTGsoH4QTGTvfC7kFXoz5fVt5tRgw8U9VsjUj3gtyUhX++hNQ/scLIfTO" +
  "ivWZUrqGe6Bp7hmXK/PN+Yte6Kq1IHPrrAW6sQCAJQKBgQDGk2ehToFISUn3WznB" +
  "g6Ep4+VnZpkBchTaj2kfFvHrR0v84mP1sRU9hBKfovgRYq/aHP9b7fDo9UagFHQc" +
  "IAYm2Q2kOBld1EHEgg0pFE1TCBg032lG/mjWw1QbDL4JV43mAv6SHB6bo40YmDAL" +
  "AxBXQVVZJD7xppNaXZKpyNVXkQ==";

// 格式化为 PKCS8 PEM
function formatPrivateKey(raw: string): string {
  const chunked = raw.match(/.{1,64}/g)?.join("\n") ?? raw;
  return `-----BEGIN PRIVATE KEY-----\n${chunked}\n-----END PRIVATE KEY-----\n`;
}

const PRIVATE_KEY_PEM = formatPrivateKey(PRIVATE_KEY_RAW);

const BASE_URL = "https://open.cs2pifa.com/v1/api";

// ── 签名工具 ──────────────────────────────────────────────────────────────────

/**
 * 构建待签名字符串（PHP Sign 方法的 JS 实现）
 * - 过滤空值，ksort 排序
 * - 特殊字段 commodityHashName / templateHashName / requestList 不转义 unicode
 * - 其余字段 JSON.stringify 不转义斜杠
 * - 拼接 key+value
 */
function buildSignString(params: Record<string, unknown>): string {
  const UNICODE_KEYS = new Set(["commodityHashName", "templateHashName", "requestList"]);

  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k === "sign" || v === null || v === undefined || v === "") continue;
    filtered[k] = v;
  }

  const sorted = Object.keys(filtered).sort();
  let str = "";
  for (const k of sorted) {
    const v = filtered[k];
    let encoded: string;
    if (UNICODE_KEYS.has(k)) {
      // 不转义 unicode（PHP JSON_UNESCAPED_UNICODE）
      encoded = JSON.stringify(v);
    } else {
      // 不转义斜杠（PHP JSON_UNESCAPED_SLASHES）
      encoded = JSON.stringify(v)?.replace(/\\\//g, "/") ?? "";
    }
    str += k + encoded;
  }
  return str;
}

/**
 * RSA SHA256 签名（PHP SignByPrivateKey 方法的 JS 实现）
 */
function signByPrivateKey(data: string): string {
  const sign = crypto.createSign("SHA256");
  sign.update(data, "utf8");
  sign.end();
  return sign.sign(PRIVATE_KEY_PEM, "base64");
}

/**
 * 获取当前时间戳字符串（格式：Y-m-d H:i:s）
 */
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
}

/**
 * 构建带签名的请求参数
 */
function buildSignedParams(extra: Record<string, unknown> = {}): Record<string, unknown> {
  const params: Record<string, unknown> = {
    appKey: APP_KEY,
    timestamp: getTimestamp(),
    ...extra,
  };
  const signStr = buildSignString(params);
  params.sign = signByPrivateKey(signStr);
  return params;
}

/**
 * 发送 POST 请求到 cs2pifa API
 */
async function apiPost<T = unknown>(endpoint: string, extra: Record<string, unknown> = {}): Promise<T> {
  const params = buildSignedParams(extra);
  const url = `${BASE_URL}/${endpoint}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`cs2pifa API HTTP error: ${res.status}`);
  }

  const json = (await res.json()) as { code: number; msg?: string; message?: string; data?: unknown };
  if (json.code !== 0) {
    throw new Error(`cs2pifa API error: ${json.msg || json.message || JSON.stringify(json)}`);
  }

  return json.data as T;
}

// ── 类型定义 ──────────────────────────────────────────────────────────────────

export interface Cs2Category {
  typeId: number;
  typeName: string;
  typeHashName: string;
}

export interface Cs2Product {
  typeId: number;
  typeName: string;
  typeHashName: string;
  weaponId: number;
  weaponHashName: string;
  templateId: number;
  templateHashName: string;
  templateName: string;
  iconUrl: string;
  exteriorName: string;
  rarityName: string;
  minSellPrice: number;
  fastShippingMinSellPrice: number;
  referencePrice: number;
  sellNum: number;
}

export interface Cs2ProductListResult {
  saleTemplateByCategoryResponseList: Cs2Product[];
  total: number;
  pageNum: number;
  pageSize: number;
}

// ── 公开 API 方法 ─────────────────────────────────────────────────────────────

/**
 * 获取商品分类列表（templateQuery 接口）
 */
export async function getCategories(): Promise<Cs2Category[]> {
  const data = await apiPost<{ templateTypeResponseList: Cs2Category[] }>("templateQuery");
  return data?.templateTypeResponseList ?? [];
}

/**
 * 按分类查询商品列表（queryTemplateSaleByCategory 接口）
 */
export async function getProductsByCategory(params: {
  typeId?: number;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  pageNum?: number;
  pageSize?: number;
  sortDesc?: boolean;
}): Promise<Cs2ProductListResult> {
  const extra: Record<string, unknown> = {
    pageNum: String(params.pageNum ?? 1),
    pageSize: String(params.pageSize ?? 20),
  };
  if (params.typeId) extra.typeId = String(params.typeId);
  if (params.keyword) extra.templateName = params.keyword;

  const data = await apiPost<Cs2ProductListResult>("queryTemplateSaleByCategory", extra);

  let list = data?.saleTemplateByCategoryResponseList ?? [];

  // 客户端过滤价格区间（API 不支持价格区间参数）
  if (params.minPrice !== undefined) {
    list = list.filter((p) => p.referencePrice >= params.minPrice!);
  }
  if (params.maxPrice !== undefined) {
    list = list.filter((p) => p.referencePrice <= params.maxPrice!);
  }

  // 排序
  if (params.sortDesc) {
    list = list.sort((a, b) => b.referencePrice - a.referencePrice);
  } else {
    list = list.sort((a, b) => a.referencePrice - b.referencePrice);
  }

  return {
    ...data,
    saleTemplateByCategoryResponseList: list,
  };
}

/**
 * 通过模板ID创建提货订单（byTemplateCreateOrder 接口）
 */
export async function createTemplateOrder(params: {
  templateId: number;
  tradeLink: string;
  outOrderNo: string;
}): Promise<{ orderNo: string; status: number }> {
  const data = await apiPost<{ orderNo: string; status: number }>("byTemplateCreateOrder", {
    templateId: String(params.templateId),
    tradeLink: params.tradeLink,
    outOrderNo: params.outOrderNo,
  });
  return data;
}
