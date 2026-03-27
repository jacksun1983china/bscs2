/**
 * 支付接口服务模块
 * 对接 fcorder.yuzhoukami.com 支付平台（宇宙四方）
 * 
 * 关键注意事项：
 * - 下单地址: /api/pay/create_order (POST JSON)
 * - 金额单位是 分（100 = 1元）
 * - 签名: 参数按key字母排序拼接，末尾 &key=密钥，MD5大写
 * - 回调方式: GET 请求，query参数
 * - 回调成功状态: status=2
 * - subject/body 尽量用英文
 */
import crypto from "crypto";

// ── 配置 ─────────────────────────────────────────────────────────────────────
const PAYMENT_CONFIG = {
  /** 下单接口地址 */
  createOrderUrl: "https://fcorder.yuzhoukami.com/api/pay/create_order",
  /** 查单接口地址 */
  queryOrderUrl: "https://fcorder.yuzhoukami.com/api/pay/order/query",
  /** 商户ID */
  mchId: "1100735",
  /** 商户密钥 */
  apiKey: "7f514080c91f9cb9525c5c17e2f76221",
  /** 异步通知回调地址（GET方式） */
  notifyUrl: "https://bdcs2.com/api/payment/notify",
  /** 支付完成后跳转地址 */
  redirectUrl: "https://bdcs2.com/recharge",
};

/** 支付渠道映射 */
const CHANNEL_MAP: Record<string, string> = {
  alipay: "1120",   // 支付宝通道
  wechat: "1120",   // 微信通道（暂时都用1120测试）
};

// ── 签名工具 ──────────────────────────────────────────────────────────────────
/**
 * 生成MD5签名（大写）
 * 签名规则：
 * 1. 非空参数按key字母排序拼接 key1=value1&key2=value2
 * 2. 末尾拼接 &key=密钥
 * 3. MD5加密并大写
 */
function generateSign(params: Record<string, string>): string {
  // 1. 过滤空值和sign字段，按key排序
  const sortedKeys = Object.keys(params)
    .filter(k => params[k] !== "" && params[k] !== undefined && params[k] !== null && k !== "sign")
    .sort();
  // 2. 拼接字符串
  const originalStr = sortedKeys.map(k => `${k}=${params[k]}`).join("&");
  // 3. 拼接密钥
  const sourceStr = originalStr + "&key=" + PAYMENT_CONFIG.apiKey;
  // 4. MD5大写
  return crypto.createHash("md5").update(sourceStr).digest("hex").toUpperCase();
}

/**
 * 验证回调签名
 */
export function verifyNotifySign(params: Record<string, string>): boolean {
  const receivedSign = params.sign || "";
  const computed = generateSign(params);
  return computed === receivedSign.toUpperCase();
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
  /** 用户IP */
  clientIp?: string;
  /** 用户ID */
  uid?: string;
}

export interface CreatePaymentResult {
  success: boolean;
  /** 支付链接 */
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
    // 金额转换为分（平台要求单位为分）
    const amountInFen = Math.round(params.amount * 100).toString();
    
    const orderData: Record<string, string> = {
      mchId: PAYMENT_CONFIG.mchId,
      mchOrderNo: params.orderNo,
      channelId: channel,
      amount: amountInFen,
      notifyUrl: PAYMENT_CONFIG.notifyUrl,
      redirectUrl: PAYMENT_CONFIG.redirectUrl,
      subject: "recharge",
      body: "recharge",
      clientIp: params.clientIp || "127.0.0.1",
    };
    
    // 可选参数
    if (params.uid) {
      orderData.uid = params.uid;
    }

    // 生成签名
    orderData.sign = generateSign(orderData);

    console.log(`[Payment] 创建支付订单: orderNo=${params.orderNo}, amount=${params.amount}元(${amountInFen}分), channel=${channel}`);
    console.log(`[Payment] 请求参数:`, JSON.stringify(orderData));

    // 发送JSON请求（文档明确说不支持form方式）
    const res = await fetch(PAYMENT_CONFIG.createOrderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    const responseText = await res.text();
    console.log(`[Payment] 响应状态: ${res.status}, 响应内容: ${responseText}`);

    let json: any;
    try {
      json = JSON.parse(responseText);
    } catch {
      return { success: false, error: `支付平台返回非JSON: ${responseText.substring(0, 200)}` };
    }

    // 判断返回结果 - status=200表示成功
    if (json.status === 200 || json.status === "200") {
      const payUrl = json.payUrl || json.payurl || json.pay_url || "";
      const platformOrderNo = json.payOrderId || json.orderno || "";
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

// ── 回调解析（GET方式，query参数） ──────────────────────────────────────────
export interface PaymentNotifyData {
  /** 商户订单号 */
  orderNo: string;
  /** 平台订单号 */
  platformOrderNo: string;
  /** 支付金额（分） */
  amountInFen: number;
  /** 支付金额（元） */
  amountInYuan: number;
  /** 支付状态：paid=已支付 */
  status: "paid" | "failed";
  /** 签名是否验证通过 */
  signValid: boolean;
}

/**
 * 解析支付平台异步通知（GET请求的query参数）
 * 回调参数: payOrderId, amount, mchOrderNo, status, sign
 * status=2 表示成功
 */
export function parsePaymentNotify(query: Record<string, any>): PaymentNotifyData {
  console.log(`[Payment] 收到回调通知:`, JSON.stringify(query));

  const orderNo = String(query.mchOrderNo || "");
  const platformOrderNo = String(query.payOrderId || "");
  const amountInFen = parseInt(String(query.amount || "0"), 10);
  const amountInYuan = amountInFen / 100;
  const rawStatus = String(query.status || "");

  // 验证签名 - 除sign外所有参数参与签名
  const paramsForSign: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (k !== "sign" && v !== "" && v !== undefined && v !== null) {
      paramsForSign[k] = String(v);
    }
  }
  const signValid = verifyNotifySign({ ...paramsForSign, sign: String(query.sign || "") });

  // status=2 表示成功
  const isPaid = rawStatus === "2";

  console.log(`[Payment] 回调解析: orderNo=${orderNo}, amount=${amountInFen}分(${amountInYuan}元), status=${rawStatus}, isPaid=${isPaid}, signValid=${signValid}`);

  return {
    orderNo,
    platformOrderNo,
    amountInFen,
    amountInYuan,
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
