// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)

import fs from 'node:fs/promises';
import path from 'node:path';
import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      'Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY'
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ''), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL('v1/storage/upload', ensureTrailingSlash(baseUrl));
  url.searchParams.set('path', normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    'v1/storage/downloadUrl',
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set('path', normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: 'GET',
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, '').replace(/\.\.(\/|\\)/g, '');
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === 'string'
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append('file', blob, fileName || 'file');
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

function toBuffer(data: Buffer | Uint8Array | string): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === 'string') return Buffer.from(data);
  return Buffer.from(data);
}

function getLocalUploadsRoot(): string {
  return path.resolve(process.cwd(), 'uploads');
}

async function storagePutLocal(
  relKey: string,
  data: Buffer | Uint8Array | string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const uploadRoot = getLocalUploadsRoot();
  const absolutePath = path.join(uploadRoot, key);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, toBuffer(data));
  return { key, url: `/uploads/${key}` };
}

async function storageGetLocal(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const uploadRoot = getLocalUploadsRoot();
  const absolutePath = path.join(uploadRoot, key);
  await fs.access(absolutePath);
  return { key, url: `/uploads/${key}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = 'application/octet-stream'
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  try {
    const { baseUrl, apiKey } = getStorageConfig();
    const uploadUrl = buildUploadUrl(baseUrl, key);
    const formData = toFormData(data, contentType, key.split('/').pop() ?? key);
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: buildAuthHeaders(apiKey),
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(
        `Storage upload failed (${response.status} ${response.statusText}): ${message}`
      );
    }
    const url = (await response.json()).url;
    return { key, url };
  } catch (error) {
    console.warn('[storage] fallback to local uploads:', error instanceof Error ? error.message : error);
    return storagePutLocal(key, data);
  }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  try {
    const { baseUrl, apiKey } = getStorageConfig();
    return {
      key,
      url: await buildDownloadUrl(baseUrl, key, apiKey),
    };
  } catch (error) {
    console.warn('[storage] local get fallback:', error instanceof Error ? error.message : error);
    return storageGetLocal(key);
  }
}
