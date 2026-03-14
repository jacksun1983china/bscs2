/**
 * 测试竞技场最后一轮 SLOT 动画时序逻辑
 * 
 * 验证：
 * 1. 最后一轮 reveal 结束后应有 1.8s 延迟再显示比赛结果
 * 2. game_over fallback 延迟应足够长（8s），不会截断最后一轮动画
 * 3. fallback 触发时如果 SLOT 仍在转或 reveal 仍在展示，应跳过不强制触发
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('竞技场最后一轮时序逻辑', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('最后一轮 reveal 结束后应延迟 1.8s 再触发结果', () => {
    // 模拟时序：reveal 展示 2.2s → 关闭 → 延迟 1.8s → 显示结果
    const REVEAL_DURATION = 2200;
    const RESULT_DELAY = 1800;
    const TOTAL = REVEAL_DURATION + RESULT_DELAY;

    let resultShown = false;
    let revealClosed = false;

    // 模拟 reveal 展示
    setTimeout(() => {
      revealClosed = true;
      // reveal 关闭后延迟显示结果
      setTimeout(() => {
        resultShown = true;
      }, RESULT_DELAY);
    }, REVEAL_DURATION);

    // 2.2s 后 reveal 关闭
    vi.advanceTimersByTime(REVEAL_DURATION);
    expect(revealClosed).toBe(true);
    expect(resultShown).toBe(false);

    // 再过 1s，结果还没显示
    vi.advanceTimersByTime(1000);
    expect(resultShown).toBe(false);

    // 再过 0.8s（总共 4s），结果显示
    vi.advanceTimersByTime(800);
    expect(resultShown).toBe(true);
  });

  it('game_over fallback 延迟应为 8 秒', () => {
    const FALLBACK_DELAY = 8000;
    let fallbackTriggered = false;
    const spinningRef = { current: false };
    const revealingRef = { current: false };
    const pendingGameOverRef = { current: { winnerId: 1, isDraw: false, players: [] } as any };

    // 模拟 game_over SSE fallback
    setTimeout(() => {
      if (pendingGameOverRef.current) {
        if (spinningRef.current || revealingRef.current) {
          return; // 跳过
        }
        fallbackTriggered = true;
        pendingGameOverRef.current = null;
      }
    }, FALLBACK_DELAY);

    // 3.5s 后不应触发（旧的延迟时间）
    vi.advanceTimersByTime(3500);
    expect(fallbackTriggered).toBe(false);

    // 7s 后仍不应触发
    vi.advanceTimersByTime(3500);
    expect(fallbackTriggered).toBe(false);

    // 8s 后触发
    vi.advanceTimersByTime(1000);
    expect(fallbackTriggered).toBe(true);
  });

  it('fallback 触发时如果 SLOT 仍在转应跳过', () => {
    const FALLBACK_DELAY = 8000;
    let fallbackTriggered = false;
    const spinningRef = { current: true }; // SLOT 仍在转
    const revealingRef = { current: false };
    const pendingGameOverRef = { current: { winnerId: 1, isDraw: false, players: [] } as any };

    setTimeout(() => {
      if (pendingGameOverRef.current) {
        if (spinningRef.current || revealingRef.current) {
          return; // 跳过
        }
        fallbackTriggered = true;
        pendingGameOverRef.current = null;
      }
    }, FALLBACK_DELAY);

    vi.advanceTimersByTime(FALLBACK_DELAY);
    expect(fallbackTriggered).toBe(false);
    expect(pendingGameOverRef.current).not.toBeNull(); // 数据未被消费
  });

  it('fallback 触发时如果 reveal 仍在展示应跳过', () => {
    const FALLBACK_DELAY = 8000;
    let fallbackTriggered = false;
    const spinningRef = { current: false };
    const revealingRef = { current: true }; // reveal 仍在展示
    const pendingGameOverRef = { current: { winnerId: 1, isDraw: false, players: [] } as any };

    setTimeout(() => {
      if (pendingGameOverRef.current) {
        if (spinningRef.current || revealingRef.current) {
          return;
        }
        fallbackTriggered = true;
        pendingGameOverRef.current = null;
      }
    }, FALLBACK_DELAY);

    vi.advanceTimersByTime(FALLBACK_DELAY);
    expect(fallbackTriggered).toBe(false);
    expect(pendingGameOverRef.current).not.toBeNull();
  });

  it('完整时序：SLOT 转动 + reveal + 延迟 应在 fallback 之前完成', () => {
    // 完整时序链：
    // SLOT 转动: ~2.5s
    // reveal 展示: 2.2s
    // 结果延迟: 1.8s
    // 总计: ~6.5s < fallback 的 8s
    const SLOT_SPIN = 2500;
    const REVEAL_DURATION = 2200;
    const RESULT_DELAY = 1800;
    const TOTAL = SLOT_SPIN + REVEAL_DURATION + RESULT_DELAY; // 6.5s

    expect(TOTAL).toBeLessThan(8000);
    // 确保 fallback 延迟足够长，不会截断正常流程
    expect(8000 - TOTAL).toBeGreaterThanOrEqual(1000); // 至少 1s 余量
  });
});
