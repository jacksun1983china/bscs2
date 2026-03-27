/**
 * OxaPay USDT 支付接口模块
 * 对接 OxaPay 加密货币支付网关
 *
 * 关键注意事项：
 * - 创建发票: POST https://api.oxapay.com/v1/payment/invoice
 * - 回调方式: POST 请求，JSON body
 * - 回调验证: HMAC-SHA512 签名验证
 * - 回调成功状态: status = "Paid"
 */
import crypto from "crypto";

// ── 配置 ─────────────────────────────────────────────────────────────────────
const OXAPAY_CONFIG = {
  /** OxaPay API 端点 */
  apiUrl: "https://api.oxapay.com/v1/payment/invoice",
  /** 商户 API 密钥 */
  merchantApiKey: "ZM6HY6-7JI2UV-B15YSU-66DUZE",
  /** 异步通知回调地址（POST方式） */
  callbackUrl: "https://bdcs2.com/api/payment/oxapay-notify",
  /** 支付完成后跳转地址 */
  returnUrl: "https://bdcs2.com/recharge",
  /** 发票有效期（分钟） */
  lifetime: 60,
  /** 感谢信息 */
  thanksMessage: "充值成功！金币即将到账。",
};

// ── HMAC 签名验证 ──────────────────────────────────────────────────────────
/**
 * 验证 OxaPay 回调的 HMAC-SHA512 签名
 * OxaPay 使用 MERCHANT_API_KEY 作为密钥，对原始 POST body 生成 HMAC-SHA512
 * 签名通过 HTTP 头 "HMAC" 传递
 */
export function verifyOxaPayHmac(rawBody: string, hmacHeader: string): boolean {
  const computed = crypto
    .createHmac("sha512", OXAPAY_CONFIG.merchantApiKey)
    .update(rawBody)
    .digest("hex");
  return computed === hmacHeader;
}

// ── 创建 USDT 支付发票 ──────────────────────────────────────────────────────
export interface CreateOxaPayInvoiceParams {
  /** 商户订单号 */
  orderNo: string;
  /** 支付金额（USDT） */
  amount: number;
  /** 玩家邮箱（可选） */
  email?: string;
  /** 描述 */
  description?: string;
}

export interface CreateOxaPayInvoiceResult {
  success: boolean;
  /** OxaPay 追踪ID */
  trackId?: string;
  /** 支付链接 */
  payUrl?: string;
  /** 过期时间戳 */
  expiredAt?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 调用 OxaPay API 创建 USDT 支付发票
 */
export async function createOxaPayInvoice(
  params: CreateOxaPayInvoiceParams
): Promise<CreateOxaPayInvoiceResult> {
  try {
    const requestBody: Record<string, any> = {
      amount: params.amount,
      currency: "USDT",
      lifetime: OXAPAY_CONFIG.lifetime,
      fee_paid_by_payer: 1,
      callback_url: OXAPAY_CONFIG.callbackUrl,
      return_url: OXAPAY_CONFIG.returnUrl,
      order_id: params.orderNo,
      thanks_message: OXAPAY_CONFIG.thanksMessage,
      description: params.description || `充值 ${params.amount} USDT`,
    };

    if (params.email) {
      requestBody.email = params.email;
    }

    console.log(
      `[OxaPay] 创建USDT发票: orderNo=${params.orderNo}, amount=${params.amount} USDT`
    );

    const res = await fetch(OXAPAY_CONFIG.apiUrl, {
      method: "POST",
      headers: {
        merchant_api_key: OXAPAY_CONFIG.merchantApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await res.text();
    console.log(`[OxaPay] 响应状态: ${res.status}, 响应内容: ${responseText}`);

    let json: any;
    try {
      json = JSON.parse(responseText);
    } catch {
      return {
        success: false,
        error: `OxaPay返回非JSON: ${responseText.substring(0, 200)}`,
      };
    }

    if (json.status === 200 && json.data) {
      const { track_id, payment_url, expired_at } = json.data;
      console.log(
        `[OxaPay] 发票创建成功: trackId=${track_id}, payUrl=${payment_url}`
      );
      return {
        success: true,
        trackId: String(track_id),
        payUrl: payment_url,
        expiredAt: expired_at,
      };
    } else {
      const errMsg =
        json.message || json.error || JSON.stringify(json);
      console.error(`[OxaPay] 发票创建失败: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[OxaPay] 创建发票异常: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

// ── 回调解析 ──────────────────────────────────────────────────────────────────
export interface OxaPayNotifyData {
  /** OxaPay 追踪ID */
  trackId: string;
  /** 支付状态: Paying | Paid | Expired | ... */
  status: string;
  /** 发票金额 */
  amount: number;
  /** 商户订单号 */
  orderId: string;
  /** 币种 */
  currency: string;
  /** 是否已支付 */
  isPaid: boolean;
  /** HMAC 签名是否验证通过 */
  hmacValid: boolean;
  /** 原始数据 */
  raw: any;
}

/**
 * 解析 OxaPay 异步通知（POST请求，JSON body）
 */
export function parseOxaPayNotify(
  body: any,
  rawBody: string,
  hmacHeader: string
): OxaPayNotifyData {
  console.log(`[OxaPay Notify] 收到回调通知:`, JSON.stringify(body));

  const trackId = String(body.track_id || "");
  const status = String(body.status || "");
  const amount = parseFloat(String(body.amount || "0"));
  const orderId = String(body.order_id || "");
  const currency = String(body.currency || "");
  const isPaid = status === "Paid";

  // 验证 HMAC 签名
  const hmacValid = verifyOxaPayHmac(rawBody, hmacHeader);

  console.log(
    `[OxaPay Notify] 解析结果: trackId=${trackId}, orderId=${orderId}, amount=${amount}, status=${status}, isPaid=${isPaid}, hmacValid=${hmacValid}`
  );

  return {
    trackId,
    status,
    amount,
    orderId,
    currency,
    isPaid,
    hmacValid,
    raw: body,
  };
}

/**
 * 获取 OxaPay 配置（供外部使用）
 */
export function getOxaPayConfig() {
  return { ...OXAPAY_CONFIG };
}
