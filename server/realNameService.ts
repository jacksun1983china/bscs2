import { ENV } from './_core/env';

const DEFAULT_REALNAME_API_URL = 'https://kzidcardv1.market.alicloudapi.com/api-mall/api/id_card/check';

export interface RealNameVerifyResult {
  verified: boolean;
  message: string;
  payload: unknown;
}

function shouldUseMockMode() {
  return process.env.NODE_ENV === 'test' || (!ENV.isProduction && !ENV.realNameAppCode);
}

function parseJsonSafely(rawText: string) {
  try {
    return rawText ? JSON.parse(rawText) : null;
  } catch {
    return rawText;
  }
}

function pickFirstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function pickFirstBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'y', 'pass', 'passed', 'success', 'ok', 'match', 'matched'].includes(normalized)) return true;
      if (['false', '0', 'no', 'n', 'fail', 'failed', 'error', 'mismatch', 'unmatched'].includes(normalized)) return false;
    }
  }
  return null;
}

function getCandidateRecords(payload: unknown) {
  const records: Record<string, unknown>[] = [];
  const stack: unknown[] = [payload];
  while (stack.length) {
    const current = stack.shift();
    if (!current || typeof current !== 'object') continue;
    const record = current as Record<string, unknown>;
    records.push(record);
    for (const key of ['data', 'result', 'body']) {
      const next = record[key];
      if (next && typeof next === 'object') stack.push(next);
    }
  }
  return records;
}

function detectSuccess(payload: unknown) {
  const records = getCandidateRecords(payload);

  for (const record of records) {
    const booleanHit = pickFirstBoolean(record, [
      'verified',
      'success',
      'passed',
      'pass',
      'match',
      'matched',
      'isok',
      'isSuccess',
      'isMatched',
    ]);
    if (booleanHit !== null) return booleanHit;

    const statusText = pickFirstString(record, [
      'status',
      'state',
      'res',
      'result',
      'verifyResult',
      'authResult',
      'msg',
      'message',
      'reason',
      'desc',
    ]).toLowerCase();

    if (statusText) {
      if (['true', '1', 'ok', 'success', 'passed', 'pass', 'match', 'matched', '一致', '认证通过', '验证通过', '校验通过', '通过'].some(flag => statusText.includes(flag))) {
        return true;
      }
      if (['false', '0', 'fail', 'failed', 'mismatch', 'unmatched', '不一致', '未通过', '认证失败', '验证失败', '校验失败', '错误'].some(flag => statusText.includes(flag))) {
        return false;
      }
    }
  }

  const top = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
  if (top) {
    const code = pickFirstString(top, ['code', 'Code', 'statusCode', 'status']);
    if (code) {
      const normalized = code.toUpperCase();
      if (['200', '0', 'OK', 'SUCCESS', 'TRUE', '10000'].includes(normalized)) return true;
    }
  }

  return null;
}

function extractMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback;
  const records = getCandidateRecords(payload);
  for (const record of records) {
    const message = pickFirstString(record, ['msg', 'message', 'Message', 'reason', 'desc', 'errorMsg', 'error_message']);
    if (message) return message;
  }
  return fallback;
}

export async function verifyRealName(name: string, idCard: string): Promise<RealNameVerifyResult> {
  if (!name.trim()) throw new Error('姓名不能为空');
  if (!idCard.trim()) throw new Error('身份证号不能为空');

  if (shouldUseMockMode()) {
    return {
      verified: true,
      message: '测试环境模拟认证通过',
      payload: { mode: 'mock' },
    };
  }

  if (!ENV.realNameAppCode) {
    throw new Error('实名认证服务未配置 AppCode');
  }

  const body = new URLSearchParams();
  body.set('name', name.trim());
  body.set('idcard', idCard.trim().toUpperCase());

  const response = await fetch(ENV.realNameApiUrl || DEFAULT_REALNAME_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `APPCODE ${ENV.realNameAppCode}`,
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: body.toString(),
  });

  const rawText = await response.text();
  const payload = parseJsonSafely(rawText);

  if (!response.ok) {
    throw new Error(`实名认证请求失败（${response.status}）：${extractMessage(payload, rawText || response.statusText)}`);
  }

  const detected = detectSuccess(payload);
  if (detected === false) {
    return {
      verified: false,
      message: extractMessage(payload, '实名认证未通过，请核对姓名和身份证号'),
      payload,
    };
  }

  if (detected === true) {
    return {
      verified: true,
      message: extractMessage(payload, '实名认证通过'),
      payload,
    };
  }

  throw new Error(`实名认证返回结果无法识别：${extractMessage(payload, rawText || '未知响应')}`);
}
