/**
 * arenaStateMachine.test.ts — 竞技场线性状态机逻辑单元测试
 *
 * 测试范围：
 *   - SSE round_result 处理器的队列/直接启动逻辑
 *   - SSE game_over 处理器的缓存/直接触发逻辑
 *   - handleSlotDone 的线性推进逻辑
 *   - handleIntroComplete 的队列消费逻辑
 *   - revealingRef 保护机制
 *   - 完整 8 轮流程模拟
 */

import { describe, it, expect } from "vitest";

// ── 模拟状态机核心状态 ──────────────────────────────────────────────────────

interface StateMachine {
  showIntroRef: boolean;
  spinningRef: boolean;
  revealingRef: boolean;
  pendingSpinQueue: Array<{ itemMap: Record<number, unknown>; roundNo: number }>;
  pendingGameOver: any;
  currentRound: number;
  totalRounds: number;
  spinning: boolean;
  gameStatus: "waiting" | "playing" | "finished";
  gameOverData: any;
  liveGameActiveRef: boolean;
  spinDoneCount: number;
  maxPlayers: number;
  showRoundReveal: boolean;
  roundsPlayed: number[]; // 记录实际播放的轮次
}

function createStateMachine(totalRounds: number, maxPlayers: number = 2): StateMachine {
  return {
    showIntroRef: false,
    spinningRef: false,
    revealingRef: false,
    pendingSpinQueue: [],
    pendingGameOver: null,
    currentRound: 1,
    totalRounds,
    spinning: false,
    gameStatus: "waiting",
    gameOverData: null,
    liveGameActiveRef: false,
    spinDoneCount: 0,
    maxPlayers,
    showRoundReveal: false,
    roundsPlayed: [],
  };
}

// ── 模拟 SSE round_result 处理器 ──────────────────────────────────────────

function handleRoundResult(
  sm: StateMachine,
  roundNo: number,
  itemMap: Record<number, unknown> = { 1: { goodsId: roundNo }, 2: { goodsId: roundNo + 100 } }
) {
  sm.liveGameActiveRef = true;
  sm.gameStatus = "playing";

  if (sm.showIntroRef || sm.spinningRef || sm.revealingRef) {
    // 非空闲状态，加入队列
    sm.pendingSpinQueue.push({ itemMap, roundNo });
  } else {
    // 空闲状态，直接启动 SLOT
    sm.currentRound = roundNo;
    sm.spinning = true;
    sm.spinningRef = true;
    sm.spinDoneCount = 0;
    sm.roundsPlayed.push(roundNo);
  }
}

// ── 模拟 SSE game_over 处理器 ──────────────────────────────────────────────

function handleGameOver(sm: StateMachine, overData: any = { winnerId: 1, players: [] }) {
  sm.liveGameActiveRef = false;

  if (!sm.spinningRef && !sm.revealingRef && sm.pendingSpinQueue.length === 0 && !sm.showIntroRef) {
    // 空闲状态，直接触发结束
    sm.gameOverData = overData;
    sm.gameStatus = "finished";
  } else {
    // 缓存 game_over 数据
    sm.pendingGameOver = overData;
  }
}

// ── 模拟 handleSlotDone（所有老虎机转完） ──────────────────────────────────

function handleSlotDone(sm: StateMachine) {
  sm.spinDoneCount++;
  if (sm.spinDoneCount >= sm.maxPlayers) {
    sm.spinning = false;
    sm.spinningRef = false;

    // 进入 reveal 展示
    sm.showRoundReveal = true;
    sm.revealingRef = true;
  }
}

// ── 模拟 reveal 动画结束 ──────────────────────────────────────────────────

function handleRevealDone(sm: StateMachine) {
  sm.showRoundReveal = false;
  sm.revealingRef = false;

  // 检查队列
  if (sm.pendingSpinQueue.length > 0) {
    const next = sm.pendingSpinQueue.shift()!;
    sm.currentRound = next.roundNo;
    sm.spinning = true;
    sm.spinningRef = true;
    sm.spinDoneCount = 0;
    sm.roundsPlayed.push(next.roundNo);
  } else if (sm.currentRound < sm.totalRounds) {
    // 等待下一轮 SSE
    sm.currentRound++;
  } else {
    // 最后一轮完成
    if (sm.pendingGameOver) {
      sm.gameOverData = sm.pendingGameOver;
      sm.pendingGameOver = null;
      sm.gameStatus = "finished";
    }
  }
}

// ── 模拟 handleIntroComplete ──────────────────────────────────────────────

function handleIntroComplete(sm: StateMachine) {
  sm.showIntroRef = false;

  if (sm.pendingSpinQueue.length > 0) {
    const pending = sm.pendingSpinQueue.shift()!;
    sm.currentRound = pending.roundNo;
    sm.spinning = true;
    sm.spinningRef = true;
    sm.spinDoneCount = 0;
    sm.roundsPlayed.push(pending.roundNo);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 测试用例
// ═══════════════════════════════════════════════════════════════════════════

describe("线性状态机：SSE round_result 处理", () => {
  it("空闲时直接启动 SLOT", () => {
    const sm = createStateMachine(8);
    handleRoundResult(sm, 1);
    expect(sm.spinning).toBe(true);
    expect(sm.spinningRef).toBe(true);
    expect(sm.currentRound).toBe(1);
    expect(sm.pendingSpinQueue).toHaveLength(0);
    expect(sm.roundsPlayed).toEqual([1]);
  });

  it("开场动画期间入队", () => {
    const sm = createStateMachine(8);
    sm.showIntroRef = true;
    handleRoundResult(sm, 1);
    expect(sm.spinning).toBe(false);
    expect(sm.pendingSpinQueue).toHaveLength(1);
    expect(sm.pendingSpinQueue[0].roundNo).toBe(1);
    expect(sm.roundsPlayed).toEqual([]);
  });

  it("SLOT 转动中入队", () => {
    const sm = createStateMachine(8);
    sm.spinningRef = true;
    sm.spinning = true;
    handleRoundResult(sm, 2);
    expect(sm.pendingSpinQueue).toHaveLength(1);
    expect(sm.pendingSpinQueue[0].roundNo).toBe(2);
  });

  it("reveal 展示中入队（revealingRef 保护）", () => {
    const sm = createStateMachine(8);
    sm.revealingRef = true;
    handleRoundResult(sm, 3);
    expect(sm.spinning).toBe(false);
    expect(sm.pendingSpinQueue).toHaveLength(1);
    expect(sm.pendingSpinQueue[0].roundNo).toBe(3);
  });

  it("多轮快速到达全部入队", () => {
    const sm = createStateMachine(8);
    sm.showIntroRef = true;
    for (let i = 1; i <= 8; i++) {
      handleRoundResult(sm, i);
    }
    expect(sm.pendingSpinQueue).toHaveLength(8);
    expect(sm.spinning).toBe(false);
    expect(sm.roundsPlayed).toEqual([]);
  });
});

describe("线性状态机：SSE game_over 处理", () => {
  it("空闲时直接触发结束", () => {
    const sm = createStateMachine(8);
    handleGameOver(sm, { winnerId: 1, players: [] });
    expect(sm.gameStatus).toBe("finished");
    expect(sm.gameOverData).not.toBeNull();
    expect(sm.pendingGameOver).toBeNull();
  });

  it("SLOT 转动中缓存 game_over", () => {
    const sm = createStateMachine(8);
    sm.spinningRef = true;
    sm.gameStatus = "playing";
    handleGameOver(sm, { winnerId: 1, players: [] });
    expect(sm.gameStatus).toBe("playing");
    expect(sm.pendingGameOver).not.toBeNull();
    expect(sm.gameOverData).toBeNull();
  });

  it("reveal 展示中缓存 game_over", () => {
    const sm = createStateMachine(8);
    sm.revealingRef = true;
    sm.gameStatus = "playing";
    handleGameOver(sm, { winnerId: 1, players: [] });
    expect(sm.gameStatus).toBe("playing");
    expect(sm.pendingGameOver).not.toBeNull();
  });

  it("队列非空时缓存 game_over", () => {
    const sm = createStateMachine(8);
    sm.pendingSpinQueue.push({ itemMap: {}, roundNo: 5 });
    sm.gameStatus = "playing";
    handleGameOver(sm, { winnerId: 1, players: [] });
    expect(sm.gameStatus).toBe("playing");
    expect(sm.pendingGameOver).not.toBeNull();
  });
});

describe("线性状态机：handleSlotDone 处理", () => {
  it("未达到 maxPlayers 时不触发 reveal", () => {
    const sm = createStateMachine(8, 2);
    sm.spinning = true;
    sm.spinningRef = true;
    handleSlotDone(sm);
    expect(sm.spinDoneCount).toBe(1);
    expect(sm.spinning).toBe(true); // 还有一个玩家的 SLOT 未完成
    expect(sm.revealingRef).toBe(false);
  });

  it("达到 maxPlayers 时触发 reveal", () => {
    const sm = createStateMachine(8, 2);
    sm.spinning = true;
    sm.spinningRef = true;
    handleSlotDone(sm); // 第1个
    handleSlotDone(sm); // 第2个
    expect(sm.spinDoneCount).toBe(2);
    expect(sm.spinning).toBe(false);
    expect(sm.spinningRef).toBe(false);
    expect(sm.revealingRef).toBe(true);
    expect(sm.showRoundReveal).toBe(true);
  });
});

describe("线性状态机：handleRevealDone 处理", () => {
  it("队列有待处理轮次时启动下一轮", () => {
    const sm = createStateMachine(8, 2);
    sm.revealingRef = true;
    sm.pendingSpinQueue.push({ itemMap: { 1: {}, 2: {} }, roundNo: 3 });
    handleRevealDone(sm);
    expect(sm.revealingRef).toBe(false);
    expect(sm.spinning).toBe(true);
    expect(sm.currentRound).toBe(3);
    expect(sm.pendingSpinQueue).toHaveLength(0);
    expect(sm.roundsPlayed).toContain(3);
  });

  it("队列为空且非最后一轮时等待 SSE", () => {
    const sm = createStateMachine(8, 2);
    sm.currentRound = 3;
    sm.revealingRef = true;
    handleRevealDone(sm);
    expect(sm.spinning).toBe(false);
    expect(sm.currentRound).toBe(4); // 递增等待下一轮 SSE
    expect(sm.gameStatus).not.toBe("finished");
  });

  it("最后一轮完成且有缓存 game_over 时触发结束", () => {
    const sm = createStateMachine(8, 2);
    sm.currentRound = 8;
    sm.revealingRef = true;
    sm.gameStatus = "playing";
    sm.pendingGameOver = { winnerId: 1, players: [] };
    handleRevealDone(sm);
    expect(sm.gameStatus).toBe("finished");
    expect(sm.gameOverData).not.toBeNull();
    expect(sm.pendingGameOver).toBeNull();
  });

  it("最后一轮完成但无缓存 game_over 时等待 SSE", () => {
    const sm = createStateMachine(8, 2);
    sm.currentRound = 8;
    sm.revealingRef = true;
    sm.gameStatus = "playing";
    handleRevealDone(sm);
    expect(sm.gameStatus).toBe("playing"); // 等待 SSE game_over
    expect(sm.gameOverData).toBeNull();
  });
});

describe("线性状态机：handleIntroComplete 处理", () => {
  it("队列有待处理轮次时启动第一轮", () => {
    const sm = createStateMachine(8);
    sm.showIntroRef = true;
    sm.pendingSpinQueue.push({ itemMap: { 1: {}, 2: {} }, roundNo: 1 });
    handleIntroComplete(sm);
    expect(sm.showIntroRef).toBe(false);
    expect(sm.spinning).toBe(true);
    expect(sm.currentRound).toBe(1);
    expect(sm.pendingSpinQueue).toHaveLength(0);
    expect(sm.roundsPlayed).toEqual([1]);
  });

  it("队列为空时不启动 SLOT", () => {
    const sm = createStateMachine(8);
    sm.showIntroRef = true;
    handleIntroComplete(sm);
    expect(sm.showIntroRef).toBe(false);
    expect(sm.spinning).toBe(false);
    expect(sm.roundsPlayed).toEqual([]);
  });
});

describe("线性状态机：完整 8 轮流程模拟", () => {
  it("所有 round_result 在开场动画期间到达，应顺序播放全部 8 轮", () => {
    const sm = createStateMachine(8, 2);
    sm.showIntroRef = true;
    sm.gameStatus = "playing";

    // 1. 所有 8 轮 round_result 在开场动画期间到达
    for (let i = 1; i <= 8; i++) {
      handleRoundResult(sm, i);
    }
    expect(sm.pendingSpinQueue).toHaveLength(8);
    expect(sm.spinning).toBe(false);

    // 2. game_over 也在开场动画期间到达
    handleGameOver(sm, { winnerId: 1, players: [{ playerId: 1, totalValue: "100" }] });
    expect(sm.pendingGameOver).not.toBeNull();

    // 3. 开场动画完成
    handleIntroComplete(sm);
    expect(sm.spinning).toBe(true);
    expect(sm.currentRound).toBe(1);
    expect(sm.pendingSpinQueue).toHaveLength(7);

    // 4. 逐轮完成：handleSlotDone → reveal → handleRevealDone
    for (let round = 1; round <= 8; round++) {
      // 所有玩家的 SLOT 完成
      for (let p = 0; p < 2; p++) {
        handleSlotDone(sm);
      }
      expect(sm.spinning).toBe(false);
      expect(sm.revealingRef).toBe(true);

      // reveal 动画结束
      handleRevealDone(sm);
      expect(sm.revealingRef).toBe(false);

      if (round < 8) {
        // 还有下一轮
        expect(sm.spinning).toBe(true);
        expect(sm.gameStatus).toBe("playing");
      }
    }

    // 5. 最后一轮完成后应触发 game_over
    expect(sm.gameStatus).toBe("finished");
    expect(sm.gameOverData).not.toBeNull();
    expect(sm.roundsPlayed).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("round_result 逐个到达（每轮完成后才到达下一轮），应顺序播放全部 8 轮", () => {
    const sm = createStateMachine(8, 2);
    sm.gameStatus = "playing";

    for (let round = 1; round <= 8; round++) {
      // SSE round_result 到达（此时空闲，直接启动）
      handleRoundResult(sm, round);
      expect(sm.spinning).toBe(true);
      expect(sm.currentRound).toBe(round);

      // 所有玩家的 SLOT 完成
      for (let p = 0; p < 2; p++) {
        handleSlotDone(sm);
      }
      expect(sm.spinning).toBe(false);
      expect(sm.revealingRef).toBe(true);

      // reveal 动画结束
      handleRevealDone(sm);
      expect(sm.revealingRef).toBe(false);
    }

    // game_over 到达（此时空闲）
    handleGameOver(sm, { winnerId: 1, players: [] });
    expect(sm.gameStatus).toBe("finished");
    expect(sm.roundsPlayed).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("部分 round_result 在 SLOT 转动期间到达，应正确入队并顺序播放", () => {
    const sm = createStateMachine(4, 2);
    sm.gameStatus = "playing";

    // R1 到达（空闲，直接启动）
    handleRoundResult(sm, 1);
    expect(sm.spinning).toBe(true);

    // R2 在 R1 SLOT 转动期间到达（入队）
    handleRoundResult(sm, 2);
    expect(sm.pendingSpinQueue).toHaveLength(1);

    // R1 SLOT 完成
    handleSlotDone(sm);
    handleSlotDone(sm);

    // R3 在 R1 reveal 期间到达（入队，因为 revealingRef=true）
    handleRoundResult(sm, 3);
    expect(sm.pendingSpinQueue).toHaveLength(2);

    // R1 reveal 完成 → 从队列取 R2
    handleRevealDone(sm);
    expect(sm.spinning).toBe(true);
    expect(sm.currentRound).toBe(2);
    expect(sm.pendingSpinQueue).toHaveLength(1); // R3 还在队列

    // R2 SLOT 完成
    handleSlotDone(sm);
    handleSlotDone(sm);

    // R4 在 R2 reveal 期间到达
    handleRoundResult(sm, 4);
    expect(sm.pendingSpinQueue).toHaveLength(2); // R3, R4

    // R2 reveal 完成 → 从队列取 R3
    handleRevealDone(sm);
    expect(sm.currentRound).toBe(3);

    // R3 完成
    handleSlotDone(sm);
    handleSlotDone(sm);
    handleRevealDone(sm);
    expect(sm.currentRound).toBe(4);

    // R4 完成
    handleSlotDone(sm);
    handleSlotDone(sm);

    // game_over 在 R4 reveal 期间到达
    handleGameOver(sm, { winnerId: 2, players: [] });
    expect(sm.pendingGameOver).not.toBeNull();

    handleRevealDone(sm);
    expect(sm.gameStatus).toBe("finished");
    expect(sm.roundsPlayed).toEqual([1, 2, 3, 4]);
  });

  it("revealingRef 防止 SSE 在 reveal 期间直接启动 SLOT（关键竞态保护）", () => {
    const sm = createStateMachine(8, 2);
    sm.gameStatus = "playing";

    // R1 直接启动
    handleRoundResult(sm, 1);
    expect(sm.spinning).toBe(true);

    // R1 SLOT 完成，进入 reveal
    handleSlotDone(sm);
    handleSlotDone(sm);
    expect(sm.revealingRef).toBe(true);
    expect(sm.spinningRef).toBe(false);

    // R2 在 reveal 期间到达
    // 如果没有 revealingRef 保护，它会认为空闲并直接启动（因为 spinningRef=false）
    // 但有了 revealingRef，它应该入队
    handleRoundResult(sm, 2);
    expect(sm.pendingSpinQueue).toHaveLength(1);
    expect(sm.spinning).toBe(false); // 不应该直接启动

    // reveal 完成后才从队列取出 R2
    handleRevealDone(sm);
    expect(sm.spinning).toBe(true);
    expect(sm.currentRound).toBe(2);
    expect(sm.roundsPlayed).toEqual([1, 2]);
  });
});

describe("线性状态机：边界情况", () => {
  it("1 轮游戏应正常完成", () => {
    const sm = createStateMachine(1, 2);
    sm.gameStatus = "playing";

    handleRoundResult(sm, 1);
    handleSlotDone(sm);
    handleSlotDone(sm);

    handleGameOver(sm, { winnerId: 1, players: [] });
    expect(sm.pendingGameOver).not.toBeNull(); // reveal 期间缓存

    handleRevealDone(sm);
    expect(sm.gameStatus).toBe("finished");
    expect(sm.roundsPlayed).toEqual([1]);
  });

  it("game_over 在所有轮次完成后到达（延迟到达）", () => {
    const sm = createStateMachine(2, 2);
    sm.gameStatus = "playing";

    // R1
    handleRoundResult(sm, 1);
    handleSlotDone(sm);
    handleSlotDone(sm);
    handleRevealDone(sm);

    // R2
    handleRoundResult(sm, 2);
    handleSlotDone(sm);
    handleSlotDone(sm);
    handleRevealDone(sm);
    // 此时最后一轮完成但 pendingGameOver 为空，等待 SSE

    expect(sm.gameStatus).toBe("playing");

    // game_over 延迟到达
    handleGameOver(sm, { winnerId: 1, players: [] });
    expect(sm.gameStatus).toBe("finished");
  });

  it("3 人房间应正确处理 spinDoneCount", () => {
    const sm = createStateMachine(2, 3);
    sm.gameStatus = "playing";

    handleRoundResult(sm, 1);
    expect(sm.spinning).toBe(true);

    handleSlotDone(sm); // 1/3
    expect(sm.spinning).toBe(true);
    handleSlotDone(sm); // 2/3
    expect(sm.spinning).toBe(true);
    handleSlotDone(sm); // 3/3
    expect(sm.spinning).toBe(false);
    expect(sm.revealingRef).toBe(true);
  });
});
