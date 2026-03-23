/**
 * cs2pifa API 服务
 * 后端定时同步商品数据到数据库，前端从数据库读取
 * 签名方式：对参数 ksort 后拼接字符串，用 RSA SHA256 私钥签名，base64 编码
 */
import crypto from "crypto";

// ── 配置 ─────────────────────────────────────────────────────────────────────
const APP_KEY = "open_99add142ac724ce9bd83d72d280753d5";

const PRIVATE_KEY_RAW =
  "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDM6qX1y5V2XpKD" +
  "1rpG+4NTFjF53FSlOJvAKYfboNi0PSFQeWGnJQXNkYj+hn8cQVWCz3Ms5ywFsW38" +
  "V5EwbZtfiWklSMWsMAvzvnrct4XmgqWxeEe175I0LQOqmRSRBCf38cj6WQv0jYep" +
  "cOd7/6kN035TfnRawKjc5IJrdShGe0x7Stb85nSEyk9tSTMuvLbDzdb7+BAhm5z4" +
  "t6Vm32Skff2OPElQ6Kkj4GtZUu63rTUcscdGMeiDiERw1M/D5X8nD9hME11Spk1L" +
  "e44Nf5L7H136o1tQvfdz12pBVShIN5Ijzs78GT1zYsiT11McwBUxp6c3EchmG7aQZ" +
  "JXJ2LutAgMBAAECggEAXT7Rcj3Hr2tthGyrqy08HwzUSr2GDwDpbtH3LmvM8Id4p2" +
  "P0mdhxAZAeJKQTJ0pbnQDFSkOPdq+8er1mJgFaWGjw3bR1rtrWNX4R7mncln4Q4+" +
  "b1ysZPY0qwhmrOPwcDIQJ3D+SBWjEk8GeeDoDR7qa0r021qK5OqOWaq0dOonMbmIV" +
  "ezQGxphA6G74GMomSX0CguwCUPr2TvYLRH2DJV/O7lN3dIgQ0dqYiPyo4tN3rpFH" +
  "k75ZRy6ZvagDT+NEpTAnwWXIaUAWABWAyjHTjYTual1DYsAeHxNKGdzTxKmjoFUD" +
  "jNMGBtXcpmPEe+sSRAt1svqDa3slcJQ+MQ1AoyQKBgQDRRcFC2kNmE2LxgaINmlqP" +
  "5na29Iffzulv+zIiFP+wjbY5Jq4OeqK0O3tSThqInSQCIyg6ozDLIPB9qRBZl/t/" +
  "Zgj8FOfW62VZGlg7mZ3KHCcpVgqVnEIsw5wW8FcfoWc+gEFK3E6myzoQV3hlmPwD" +
  "FHZ5dCnYJzCbIdFIsvy6rwKBgQD6q+f6IVy6fa4rHnzg3cfm4zh2VqSB+3+goNLn" +
  "PS/BD+Ly8XmlD0uv1NocYWtj9yVtrAIYlPeF2x0vHBjhJtbw5JbiOtKydOvmjXft" +
  "5BVKqf8F5v4IQoi9Ehtl6YXMotAZa0QZee/tEy4ixANixtjl6PHLvui/61/T+Q82" +
  "VWaWYwKBgEopdzCy2rm82w6NCxnY/okKej2h8NjuoalukrijSm2N+urL+1jkOu62" +
  "OaDUTvDlB1K+lM4a8Pq7ZJ6ToFiv1I+0YDC9U9/FMfherrAIY3OxgGtUs5GLe6QT" +
  "eihi6e0qrMTofLsD0deoI56Q8PjIO174DHhEI2QXl1ESrfEehRO/AoGBAPEEer5od4" +
  "UkNGNnJAD9nSgljvNRaUlFLLigCUim7xR9FuQqQ6Dt7QL58GDbVms+hXFGspk6Gi" +
  "hMvmm+ZTmOo5no4B5TGqTVgMAjg41rAQHSI89kAxqkBl9sWoWJm8lfPiFCnq60LH" +
  "lROMnal7rQoFmmuV4CiD2HrZLdZMAEKugrAoGBAMxmhvr9eMG3J9lwuTlzKzYr9Z" +
  "qtf8FYGDphV2Gzj2Yp1MZQ22e7Q5vuKumzj8IUvJMXtTIaXqWJRTfuU04j67O0IQB" +
  "Xm7ahMJt00IBNWnWsUKlrEm88wlRg1agU4s44P0u1AH15NuYN9kJRuSdvLKlqsWe" +
  "/0vZkVyEtJM0Ts+7I";

// 格式化为 PKCS8 PEM
function formatPrivateKey(raw: string): string {
  const chunked = raw.match(/.{1,64}/g)?.join("\n") ?? raw;
  return `-----BEGIN PRIVATE KEY-----\n${chunked}\n-----END PRIVATE KEY-----\n`;
}

const PRIVATE_KEY_PEM = formatPrivateKey(PRIVATE_KEY_RAW);

const BASE_URL = "https://open.cs2pifa.com/v1/api";

// ── 同步状态 ─────────────────────────────────────────────────────────────────
let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;
let lastSyncTime = 0;
const SYNC_INTERVAL_MS = 150 * 1000; // 150秒（比120秒限制多30秒余量，更安全）

// ── 签名工具 ──────────────────────────────────────────────────────────────────

/**
 * 构建待签名字符串
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
      encoded = JSON.stringify(v);
    } else {
      encoded = JSON.stringify(v)?.replace(/\\\//g, "/") ?? "";
    }
    str += k + encoded;
  }
  return str;
}

/**
 * RSA SHA256 签名
 */
function signByPrivateKey(data: string): string {
  const sign = crypto.createSign("SHA256");
  sign.update(data, "utf8");
  sign.end();
  return sign.sign(PRIVATE_KEY_PEM, "base64");
}

/**
 * 获取当前北京时间戳字符串（格式：Y-m-d H:i:s）
 */
function getTimestamp(): string {
  const now = new Date();
  // 转换为北京时间 (UTC+8)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const beijing = new Date(utc + 8 * 3600000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${beijing.getFullYear()}-${pad(beijing.getMonth() + 1)}-${pad(beijing.getDate())} ` +
    `${pad(beijing.getHours())}:${pad(beijing.getMinutes())}:${pad(beijing.getSeconds())}`
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
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`cs2pifa API HTTP error: ${res.status}`);
  }

  const json = (await res.json()) as { code: number; msg?: string; message?: string; data?: unknown };
  if (json.code !== 0) {
    if (json.code === 900) {
      throw new Error('RATE_LIMITED');
    }
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

// ── 批量查询在售商品价格的返回类型 ──────────────────────────────────────────────
interface BatchSaleItem {
  saleTemplateResponse: {
    templateId: number;
    templateHashName: string;
    iconUrl: string;
    exteriorName: string;
    rarityName: string;
    qualityName: string;
  };
  saleCommodityResponse: {
    minSellPrice: string;
    fastshippingminSellPrice?: string;
    referencePrice: string;
    sellNum: number;
  };
}

// ── 模板数据类型 ──────────────────────────────────────────────────────────────
interface TemplateItem {
  id: number;
  name: string;
  hashName: string;
  typeId: number;
  typeName: string;
  typeHashName: string;
  weaponId: number;
  weaponName: string;
  weaponHashName: string;
  updateTime: string;
}

// ── 公开 API 方法 ─────────────────────────────────────────────────────────────

/**
 * 获取模板列表（templateQuery 接口）
 * 注意：此接口限频 1次/120秒
 */
export async function getTemplateList(): Promise<TemplateItem[]> {
  const downloadUrl = await apiPost<string>("templateQuery");
  if (!downloadUrl) return [];

  const res = await fetch(downloadUrl, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`下载模板文件失败: ${res.status}`);
  const templates = (await res.json()) as TemplateItem[];
  return templates;
}

/**
 * 批量查询在售商品价格（batchGetOnSaleCommodityInfo 接口）
 * 注意：此接口限频 30次/秒，每次最多100个模板
 */
export async function batchGetOnSaleInfo(templateIds: number[]): Promise<BatchSaleItem[]> {
  if (templateIds.length === 0) return [];
  if (templateIds.length > 100) {
    throw new Error("每次最多查询100个模板");
  }

  const requestList = templateIds.map(id => ({ templateId: id }));
  const data = await apiPost<BatchSaleItem[]>("batchGetOnSaleCommodityInfo", {
    requestList,
  });
  return data ?? [];
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

// ── 定时同步逻辑 ─────────────────────────────────────────────────────────────

/**
 * 同步商品数据到数据库
 * 流程：
 * 1. 调用 templateQuery 获取所有模板列表（含名称、分类等基础信息）
 * 2. 将热门武器类型的模板ID分批调用 batchGetOnSaleCommodityInfo 获取价格
 * 3. 将数据写入 shopItems 表
 */
export async function syncShopItems(): Promise<{ success: boolean; count: number; error?: string }> {
  if (isSyncing) {
    console.log("[cs2pifa] 同步正在进行中，跳过本次");
    return { success: false, count: 0, error: "同步正在进行中" };
  }

  // 检查距离上次同步是否超过120秒
  const now = Date.now();
  if (now - lastSyncTime < 120000) {
    console.log("[cs2pifa] 距离上次同步不足120秒，跳过");
    return { success: false, count: 0, error: "距离上次同步不足120秒" };
  }

  isSyncing = true;
  lastSyncTime = now;

  try {
    console.log("[cs2pifa] 开始同步商品数据...");

    // 1. 获取模板列表
    const templates = await getTemplateList();
    console.log(`[cs2pifa] 获取到 ${templates.length} 个模板`);

    if (templates.length === 0) {
      console.log("[cs2pifa] 模板列表为空，跳过同步");
      return { success: false, count: 0, error: "模板列表为空" };
    }

    // 2. 筛选热门武器类型（步枪、手枪、匕首、狙击步枪、微型冲锋枪、霰弹枪、机枪、手套）
    const HOT_TYPES = new Set(["步枪", "手枪", "匕首", "狙击步枪", "微型冲锋枪", "霰弹枪", "机枪", "手套", "武器箱"]);
    const hotTemplates = templates.filter(t => HOT_TYPES.has(t.typeName));
    console.log(`[cs2pifa] 筛选出 ${hotTemplates.length} 个热门类型模板`);

    // 3. 分批查询价格（每批100个，每秒最多30次）
    const BATCH_SIZE = 100;
    const allSaleItems: BatchSaleItem[] = [];
    const templateMap = new Map<number, TemplateItem>();
    hotTemplates.forEach(t => templateMap.set(t.id, t));

    for (let i = 0; i < hotTemplates.length; i += BATCH_SIZE) {
      const batch = hotTemplates.slice(i, i + BATCH_SIZE);
      const ids = batch.map(t => t.id);

      try {
        const saleItems = await batchGetOnSaleInfo(ids);
        allSaleItems.push(...saleItems);
        console.log(`[cs2pifa] 批次 ${Math.floor(i / BATCH_SIZE) + 1}: 获取到 ${saleItems.length} 个在售商品`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg === "RATE_LIMITED") {
          console.log(`[cs2pifa] 批次 ${Math.floor(i / BATCH_SIZE) + 1}: 触发频率限制，等待2秒后重试...`);
          await new Promise(r => setTimeout(r, 2000));
          try {
            const saleItems = await batchGetOnSaleInfo(ids);
            allSaleItems.push(...saleItems);
          } catch {
            console.log(`[cs2pifa] 批次 ${Math.floor(i / BATCH_SIZE) + 1}: 重试仍失败，跳过`);
          }
        } else {
          console.log(`[cs2pifa] 批次 ${Math.floor(i / BATCH_SIZE) + 1}: 查询失败: ${errMsg}`);
        }
      }

      // 每批之间间隔100ms，避免触发频率限制
      if (i + BATCH_SIZE < hotTemplates.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    console.log(`[cs2pifa] 共获取到 ${allSaleItems.length} 个在售商品价格数据`);

    // 4. 写入数据库
    const { getDb } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) {
      console.log("[cs2pifa] 数据库连接失败，跳过写入");
      return { success: false, count: 0, error: "数据库连接失败" };
    }

    // 过滤有效数据（有价格且在售）
    const validItems = allSaleItems.filter(item =>
      item.saleCommodityResponse &&
      item.saleTemplateResponse &&
      item.saleCommodityResponse.sellNum > 0
    );

    console.log(`[cs2pifa] 有效在售商品: ${validItems.length} 个`);

    if (validItems.length === 0) {
      console.log("[cs2pifa] 无有效商品数据，跳过写入");
      return { success: true, count: 0 };
    }

    // 使用 REPLACE INTO 批量写入（每批500条）
    const WRITE_BATCH = 500;
    let totalWritten = 0;

    for (let i = 0; i < validItems.length; i += WRITE_BATCH) {
      const batch = validItems.slice(i, i + WRITE_BATCH);

      const values = batch.map(item => {
        const tmpl = templateMap.get(item.saleTemplateResponse.templateId);
        const sale = item.saleCommodityResponse;
        const tpl = item.saleTemplateResponse;

        return `(
          ${tpl.templateId},
          '${String(tmpl?.typeId ?? 0)}',
          '${(tmpl?.typeName ?? '').replace(/'/g, "\\'")}',
          '${(tmpl?.typeHashName ?? '').replace(/'/g, "\\'")}',
          ${tmpl?.weaponId ?? 0},
          '${(tmpl?.weaponHashName ?? '').replace(/'/g, "\\'")}',
          '${(tpl.templateHashName ?? '').replace(/'/g, "\\'")}',
          '${(tmpl?.name ?? '').replace(/'/g, "\\'")}',
          '${(tpl.iconUrl ?? '').replace(/'/g, "\\'")}',
          '${(tpl.exteriorName ?? '').replace(/'/g, "\\'")}',
          '${(tpl.rarityName ?? '').replace(/'/g, "\\'")}',
          ${parseFloat(sale.minSellPrice) || 0},
          ${parseFloat(sale.fastshippingminSellPrice ?? '0') || 0},
          ${parseFloat(sale.referencePrice) || 0},
          ${sale.sellNum || 0},
          1
        )`;
      });

      const sqlStr = `
        INSERT INTO shopItems (templateId, typeId, typeName, typeHashName, weaponId, weaponHashName, templateHashName, templateName, iconUrl, exteriorName, rarityName, minSellPrice, fastShippingMinSellPrice, referencePrice, sellNum, enabled)
        VALUES ${values.join(",")}
        ON DUPLICATE KEY UPDATE
          typeName = VALUES(typeName),
          typeHashName = VALUES(typeHashName),
          weaponId = VALUES(weaponId),
          weaponHashName = VALUES(weaponHashName),
          templateHashName = VALUES(templateHashName),
          templateName = VALUES(templateName),
          iconUrl = VALUES(iconUrl),
          exteriorName = VALUES(exteriorName),
          rarityName = VALUES(rarityName),
          minSellPrice = VALUES(minSellPrice),
          fastShippingMinSellPrice = VALUES(fastShippingMinSellPrice),
          referencePrice = VALUES(referencePrice),
          sellNum = VALUES(sellNum),
          enabled = VALUES(enabled)
      `;

      try {
        await db.execute(sql.raw(sqlStr));
        totalWritten += batch.length;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[cs2pifa] 写入数据库失败 (批次 ${Math.floor(i / WRITE_BATCH) + 1}): ${errMsg}`);
      }
    }

    // 将不在本次同步中的商品标记为下架（sellNum=0）
    const syncedTemplateIds = validItems.map(item => item.saleTemplateResponse.templateId);
    if (syncedTemplateIds.length > 0) {
      try {
        await db.execute(
          sql.raw(`UPDATE shopItems SET sellNum = 0 WHERE templateId NOT IN (${syncedTemplateIds.join(",")}) AND enabled = 1`)
        );
      } catch {
        // 忽略
      }
    }

    console.log(`[cs2pifa] 同步完成，共写入 ${totalWritten} 条商品数据`);
    return { success: true, count: totalWritten };

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[cs2pifa] 同步失败: ${errMsg}`);
    return { success: false, count: 0, error: errMsg };
  } finally {
    isSyncing = false;
  }
}

/**
 * 启动定时同步任务
 */
export function startSyncScheduler(): void {
  if (syncTimer) {
    console.log("[cs2pifa] 定时同步已在运行");
    return;
  }

  console.log(`[cs2pifa] 启动定时同步任务，间隔 ${SYNC_INTERVAL_MS / 1000} 秒`);

  // 启动后延迟10秒执行第一次同步
  setTimeout(() => {
    syncShopItems().catch(err => console.error("[cs2pifa] 首次同步失败:", err));
  }, 10000);

  // 定时执行
  syncTimer = setInterval(() => {
    syncShopItems().catch(err => console.error("[cs2pifa] 定时同步失败:", err));
  }, SYNC_INTERVAL_MS);
}

/**
 * 停止定时同步任务
 */
export function stopSyncScheduler(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    console.log("[cs2pifa] 定时同步任务已停止");
  }
}

/**
 * 获取同步状态
 */
export function getSyncStatus(): { isSyncing: boolean; lastSyncTime: number } {
  return { isSyncing, lastSyncTime };
}
