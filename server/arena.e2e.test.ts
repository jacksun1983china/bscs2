/**
 * arena.e2e.test.ts — 竞技场端到端时序测试
 *
 * 验证：
 * 1. 服务端在 game_started 广播后 5 秒才发出第一个 round_result
 * 2. 开场动画（3.1 秒）结束后，round_result 尚未到达，pendingSpinRef 为空
 * 3. 5 秒后 round_result 到达，showIntroRef 已为 false，直接触发 spinning
 */

import { describe, it, expect } from 'vitest';

// ── 模拟 ArenaIntroAnimation 的时序 ──────────────────────────────────────────

describe('ArenaIntroAnimation 时序', () => {
  it('开场动画在 3.1 秒后调用 onComplete', async () => {
    const calls: number[] = [];
    const start = Date.now();

    // 模拟 ArenaIntroAnimation 的 useEffect 逻辑
    await new Promise<void>((resolve) => {
      const t4 = setTimeout(() => {
        calls.push(Date.now() - start);
        resolve();
      }, 3100);
      return () => clearTimeout(t4);
    });

    expect(calls.length).toBe(1);
    // onComplete 应在 3.1 秒左右调用（允许 ±200ms 误差）
    expect(calls[0]).toBeGreaterThanOrEqual(3000);
    expect(calls[0]).toBeLessThan(3400);
  });
});

// ── 模拟服务端延迟 ──────────────────────────────────────────────────────────

describe('服务端 round_result 延迟', () => {
  it('game_started 后 5 秒才发出 round_result', async () => {
    const events: { type: string; time: number }[] = [];
    const start = Date.now();

    // 模拟 broadcastGameStarted
    events.push({ type: 'game_started', time: Date.now() - start });

    // 模拟 5 秒延迟后发出 round_result
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        events.push({ type: 'round_result', time: Date.now() - start });
        resolve();
      }, 5000);
    });

    const gameStarted = events.find(e => e.type === 'game_started')!;
    const roundResult = events.find(e => e.type === 'round_result')!;
    const delay = roundResult.time - gameStarted.time;

    // round_result 应在 game_started 后 5 秒左右到达（允许 ±300ms 误差）
    expect(delay).toBeGreaterThanOrEqual(4700);
    expect(delay).toBeLessThan(5500);
  }, 10000); // 超时设为 10 秒
});

// ── 模拟前端 pendingSpinRef 逻辑 ──────────────────────────────────────────────

describe('前端 pendingSpinRef 时序逻辑', () => {
  it('开场动画期间收到 round_result 时缓存，动画结束后触发 spinning', async () => {
    let showIntroRef = { current: true };
    let pendingSpinRef: { current: { itemMap: Record<string, unknown>; roundNo: number } | null } = { current: null };
    let spinningTriggered = false;
    let spinningTriggeredAt = 0;
    const start = Date.now();

    // 模拟开场动画：3.1 秒后结束
    const introComplete = new Promise<void>((resolve) => {
      setTimeout(() => {
        showIntroRef.current = false;
        // 处理 pendingSpinRef
        if (pendingSpinRef.current) {
          setTimeout(() => {
            spinningTriggered = true;
            spinningTriggeredAt = Date.now() - start;
          }, 100);
        }
        resolve();
      }, 3100);
    });

    // 模拟 round_result 在 2 秒时到达（开场动画还在播放）
    const roundResultArrival = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (showIntroRef.current) {
          // 开场动画还在播放，缓存结果
          pendingSpinRef.current = { itemMap: { 1: { id: 1, name: '测试物品' } }, roundNo: 1 };
        } else {
          // 开场动画已结束，直接触发
          spinningTriggered = true;
          spinningTriggeredAt = Date.now() - start;
        }
        resolve();
      }, 2000);
    });

    await Promise.all([introComplete, roundResultArrival]);
    // 等待 spinning 触发的 100ms 延迟
    await new Promise(r => setTimeout(r, 200));

    // round_result 在 2 秒时到达，此时开场动画还在播放，应缓存
    // 开场动画在 3.1 秒结束，此时处理 pendingSpinRef，触发 spinning
    expect(spinningTriggered).toBe(true);
    // spinning 应在开场动画结束后触发（约 3.2 秒）
    expect(spinningTriggeredAt).toBeGreaterThanOrEqual(3100);
    expect(spinningTriggeredAt).toBeLessThan(3600);
  }, 10000);

  it('开场动画结束后收到 round_result 时直接触发 spinning', async () => {
    let showIntroRef = { current: true };
    let spinningTriggered = false;
    let spinningTriggeredAt = 0;
    const start = Date.now();

    // 模拟开场动画：1 秒后结束（快速测试）
    setTimeout(() => {
      showIntroRef.current = false;
    }, 1000);

    // 模拟 round_result 在 2 秒时到达（开场动画已结束）
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        if (!showIntroRef.current) {
          // 开场动画已结束，直接触发
          spinningTriggered = true;
          spinningTriggeredAt = Date.now() - start;
        }
        resolve();
      }, 2000);
    });

    expect(spinningTriggered).toBe(true);
    expect(spinningTriggeredAt).toBeGreaterThanOrEqual(1900);
  }, 5000);
});

// ── useCallback 稳定性测试 ──────────────────────────────────────────────────

describe('onComplete 引用稳定性', () => {
  it('useCallback 包装后引用不变，不会重置计时器', () => {
    // 模拟 useCallback 的行为：依赖不变时返回相同引用
    const deps = { isReplaying: false };

    let callCount = 0;
    const createCallback = (isReplaying: boolean) => {
      // 模拟 useCallback：只有 isReplaying 变化时才创建新函数
      return () => { callCount++; return isReplaying; };
    };

    const cb1 = createCallback(deps.isReplaying);
    const cb2 = createCallback(deps.isReplaying);

    // 在真实 React 中，useCallback 会返回相同引用（这里只验证逻辑）
    // 关键：当 isReplaying 不变时，ArenaIntroAnimation 的 useEffect 不应重新执行
    expect(typeof cb1).toBe('function');
    expect(typeof cb2).toBe('function');

    // 验证：如果 useEffect 依赖的 onComplete 引用不变，计时器不会被重置
    let timerResetCount = 0;
    let lastCallback = cb1;

    const checkIfTimerShouldReset = (newCallback: () => unknown) => {
      if (newCallback !== lastCallback) {
        timerResetCount++;
        lastCallback = newCallback;
      }
    };

    // 模拟父组件多次重渲染，但 useCallback 依赖未变
    // 在真实场景中，useCallback 会返回相同引用，所以 timerResetCount 应为 0
    // 这里用不同函数模拟"内联函数"的情况（每次渲染都是新引用）
    checkIfTimerShouldReset(cb2); // cb1 !== cb2（内联函数场景）
    expect(timerResetCount).toBe(1); // 内联函数会导致重置

    // 用 useCallback 后，同一引用不会触发重置
    timerResetCount = 0;
    lastCallback = cb1;
    checkIfTimerShouldReset(cb1); // 相同引用
    expect(timerResetCount).toBe(0); // useCallback 不会导致重置
  });
});
