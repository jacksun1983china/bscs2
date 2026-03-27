/**
 * 支付接口服务模块
 * 对接 fcorder.yuzhoukami.com 支付平台
 * 支持支付宝(alipay)和微信(wechat)支付
 */
import crypto from "crypto";

// ── 配置 ─────────────────────────────────────────────────────────────────────
const PAYMENT_CONFIG = {
  /** 支付平台接口地址 */
  apiUrl: "https://fcorder.yuzhoukami.com/api/pay/order",
  /** 商户ID */
  merchantId: "1100735",
  /** API密钥（用于MD5签名） */
  apiKey: "7f514080c91f9cb9525c5c17e2f76221",
  /** 异步通知回调地址 */
  notifyUrl: "https://bdcs2.com/api/payment/notify",
  /** 支付完成后跳转地址 */
  returnUrl: "https://bdcs2.com/recharge",
};

/** 支付渠道映射 */
const CHANNEL_MAP: Record<string, string> = {
  alipay: "1120",   // 支付宝通道
  wechat: "1120",   // 微信通道（暂时都用1120测试，后续可分开配置）
};

// ── 签名工具 ──────────────────────────────────────────────────────────────────
/**
 * 生成MD5签名
 * 签名规则：将参数按key字母排序拼接成 key=value& 形式，末尾拼接 apiKey，取MD5
 */
function generateSign(params: Record<string, string | number>): string {
  // 1. 过滤空值，按key排序
  const sortedKeys = Object.keys(params)
    .filter(k => params[k] !== "" && params[k] !== undefined && params[k] !== null && k !== "sign")
    .sort();
  // 2. 拼接字符串
  const signStr = sortedKeys.map(k => `${k}=${params[k]}`).join("&") + PAYMENT_CONFIG.apiKey;
  // 3. MD5
  return crypto.createHash("md5").update(signStr).digest("hex");
}

/**
 * 验证回调签名
 */
function verifySign(params: Record<string, string | number>, receivedSign: string): boolean {
  const computed = generateSign(params);
  return computed.toLowerCase() === receivedSign.toLowerCase();
}

// ── 创建支付订单 ──────────────────────────────────────────────────────────────
export interface CreatePaymentParams {
  /** 商户订单号 */
  orderNo: string;
  /** 支付金额（元） */
  amount: number;
  /** 支付方式 alipay | wechat */
  payMethod: "alipay" | "wechat";
  /** 商品名称 */
  productName?: string;
}

export interface CreatePaymentResult {
  success: boolean;
  /** 支付链接（跳转用户去支付） */
  payUrl?: string;
  /** 平台订单号 */
  platformOrderNo?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 调用支付平台创建订单
 */
export async function createPaymentOrder(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  try {
    const channel = CHANNEL_MAP[params.payMethod] || "1120";
    const orderData: Record<string, string | number> = {
      merchant: PAYMENT_CONFIG.merchantId,
      orderno: params.orderNo,
      channel: channel,
      amount: params.amount.toFixed(2),
      notifyurl: PAYMENT_CONFIG.notifyUrl,
      callbackurl: PAYMENT_CONFIG.returnUrl,
    };
    // 生成签名
    orderData.sign = generateSign(orderData);

    console.log(`[Payment] 创建支付订单: orderNo=${params.orderNo}, amount=${params.amount}, channel=${channel}`);
    console.log(`[Payment] 请求参数:`, JSON.stringify(orderData));

    // 发送请求
    const res = await fetch(PAYMENT_CONFIG.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(orderData as Record<string, string>).toString(),
    });

    const responseText = await res.text();
    console.log(`[Payment] 响应状态: ${res.status}, 响应内容: ${responseText}`);

    let json: any;
    try {
      json = JSON.parse(responseText);
    } catch {
      return { success: false, error: `支付平台返回非JSON: ${responseText.substring(0, 200)}` };
    }

    // 判断返回结果
    if (json.code === 0 || json.code === 200 || json.status === 1 || json.payurl || json.pay_url) {
      const payUrl = json.payurl || json.pay_url || json.data?.payurl || json.data?.pay_url || json.data?.url || "";
      const platformOrderNo = json.orderno || json.order_no || json.data?.orderno || json.data?.order_no || json.trade_no || "";
      console.log(`[Payment] 订单创建成功: payUrl=${payUrl}, platformOrderNo=${platformOrderNo}`);
      return {
        success: true,
        payUrl,
        platformOrderNo: String(platformOrderNo),
      };
    } else {
      const errMsg = json.msg || json.message || json.error || JSON.stringify(json);
      console.error(`[Payment] 订单创建失败: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Payment] 创建订单异常: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

// ── 回调验签与解析 ──────────────────────────────────────────────────────────────
export interface PaymentNotifyData {
  /** 商户订单号 */
  orderNo: string;
  /** 平台订单号 */
  platformOrderNo: string;
  /** 支付金额 */
  amount: number;
  /** 支付状态：paid=已支付 */
  status: "paid" | "failed";
  /** 签名是否验证通过 */
  signValid: boolean;
}

/**
 * 解析支付平台异步通知
 */
export function parsePaymentNotify(body: Record<string, any>): PaymentNotifyData {
  console.log(`[Payment] 收到回调通知:`, JSON.stringify(body));

  // 提取参数（兼容多种字段名）
  const orderNo = body.orderno || body.order_no || body.out_trade_no || "";
  const platformOrderNo = body.trade_no || body.transaction_id || body.platform_order || "";
  const amount = parseFloat(body.amount || body.total_amount || "0");
  const sign = body.sign || "";

  // 验证签名
  const paramsForSign: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k !== "sign" && v !== "" && v !== undefined && v !== null) {
      paramsForSign[k] = String(v);
    }
  }
  const signValid = verifySign(paramsForSign, sign);

  // 判断支付状态（兼容多种状态值）
  const rawStatus = String(body.status || body.trade_status || body.state || "");
  const isPaid = rawStatus === "1" || rawStatus === "paid" || rawStatus === "TRADE_SUCCESS" || rawStatus === "SUCCESS";

  console.log(`[Payment] 回调解析: orderNo=${orderNo}, amount=${amount}, status=${rawStatus}, isPaid=${isPaid}, signValid=${signValid}`);

  return {
    orderNo,
    platformOrderNo,
    amount,
    status: isPaid ? "paid" : "failed",
    signValid,
  };
}

/**
 * 获取支付配置（供外部使用）
 */
export function getPaymentConfig() {
  return { ...PAYMENT_CONFIG };
}
