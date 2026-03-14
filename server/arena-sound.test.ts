import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('arenaSound.ts - SLOT音效优化', () => {
  const soundFilePath = path.resolve(__dirname, '../client/src/lib/arenaSound.ts');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(soundFilePath, 'utf-8');
  });

  it('应该使用CDN音效文件URL而非纯合成音效', () => {
    expect(content).toContain('cloudfront.net');
    expect(content).toContain('slot-wheel-arcade');
    expect(content).toContain('slot-win-alert');
  });

  it('应该导出playSlotSpin函数', () => {
    expect(content).toContain('export function playSlotSpin');
  });

  it('应该导出stopSlotSpin函数', () => {
    expect(content).toContain('export function stopSlotSpin');
  });

  it('应该导出playSlotStop函数', () => {
    expect(content).toContain('export function playSlotStop');
  });

  it('应该导出playWinFanfare函数', () => {
    expect(content).toContain('export function playWinFanfare');
  });

  it('应该导出playLoseTone函数', () => {
    expect(content).toContain('export function playLoseTone');
  });

  it('应该导出playSlotTick函数', () => {
    expect(content).toContain('export function playSlotTick');
  });

  it('playSlotSpin应该使用AudioBuffer循环播放而非OscillatorNode', () => {
    // 新版使用 AudioBufferSourceNode 循环播放真实音效
    expect(content).toContain('source.loop = true');
    expect(content).toContain('createBufferSource');
  });

  it('所有音效函数都应检查isSfxMuted', () => {
    const functions = ['playSlotSpin', 'playSlotStop', 'playSlotTick', 'playWinFanfare', 'playLoseTone'];
    for (const fn of functions) {
      // 找到函数定义后，检查其中是否包含 isSfxMuted 调用
      const fnIndex = content.indexOf(`export function ${fn}`);
      expect(fnIndex).toBeGreaterThan(-1);
      const fnBody = content.slice(fnIndex, content.indexOf('\nexport function', fnIndex + 1) === -1 
        ? content.length 
        : content.indexOf('\nexport function', fnIndex + 1));
      expect(fnBody).toContain('isSfxMuted()');
    }
  });

  it('应该有音效缓存机制避免重复加载', () => {
    expect(content).toContain('bufferCache');
    expect(content).toContain('new Map');
  });

  it('stopSlotSpin应该淡出而非突然停止', () => {
    expect(content).toContain('linearRampToValueAtTime(0');
  });

  it('不应再使用sawtooth振荡器作为旋转音效', () => {
    // playSlotSpin不应再包含sawtooth
    const spinFnStart = content.indexOf('export function playSlotSpin');
    const spinFnEnd = content.indexOf('export function stopSlotSpin');
    const spinFnBody = content.slice(spinFnStart, spinFnEnd);
    expect(spinFnBody).not.toContain("'sawtooth'");
  });
});
