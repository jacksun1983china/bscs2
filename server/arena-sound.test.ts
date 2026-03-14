import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('arenaSound.ts - SLOT音效（旋转音效已删除）', () => {
  const soundFilePath = path.resolve(__dirname, '../client/src/lib/arenaSound.ts');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(soundFilePath, 'utf-8');
  });

  it('不应包含playSlotSpin函数', () => {
    expect(content).not.toContain('export function playSlotSpin');
  });

  it('不应包含stopSlotSpin函数', () => {
    expect(content).not.toContain('export function stopSlotSpin');
  });

  it('不应包含旋转音效CDN URL（slot-wheel-arcade）', () => {
    expect(content).not.toContain('slot-wheel-arcade');
    expect(content).not.toContain('slot-wheel_');
  });

  it('应该保留playSlotStop函数', () => {
    expect(content).toContain('export function playSlotStop');
  });

  it('应该保留playWinFanfare函数', () => {
    expect(content).toContain('export function playWinFanfare');
  });

  it('应该保留playLoseTone函数', () => {
    expect(content).toContain('export function playLoseTone');
  });

  it('应该保留playSlotTick函数', () => {
    expect(content).toContain('export function playSlotTick');
  });

  it('ArenaRoom不应引用playSlotSpin或stopSlotSpin', () => {
    const arenaPath = path.resolve(__dirname, '../client/src/pages/ArenaRoom.tsx');
    const arenaContent = fs.readFileSync(arenaPath, 'utf-8');
    expect(arenaContent).not.toContain('playSlotSpin');
    expect(arenaContent).not.toContain('stopSlotSpin');
  });
});
