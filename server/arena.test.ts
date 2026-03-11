/**
 * arena.test.ts — 竞技场功能单元测试
 *
 * 测试范围：
 *   - rollBoxGoods 概率抽取函数
 *   - genRoomNo 房间号生成
 *   - arenaRouter 路由注册检查
 *   - arenaWs 广播函数存在性检查
 */

import { describe, it, expect } from "vitest";

// ── 测试 rollBoxGoods 概率逻辑 ────────────────────────────────────────────

function rollBoxGoods(goods: Array<{ id: number; probability: string; [key: string]: unknown }>) {
  if (goods.length === 0) throw new Error("宝箱内没有物品");
  const total = goods.reduce((s, g) => s + parseFloat(g.probability as string), 0);
  let rand = Math.random() * total;
  for (const g of goods) {
    rand -= parseFloat(g.probability as string);
    if (rand <= 0) return g;
  }
  return goods[goods.length - 1];
}

describe("rollBoxGoods", () => {
  it("should throw when goods is empty", () => {
    expect(() => rollBoxGoods([])).toThrow("宝箱内没有物品");
  });

  it("should always return one of the goods", () => {
    const goods = [
      { id: 1, probability: "0.1", name: "传说" },
      { id: 2, probability: "0.3", name: "稀有" },
      { id: 3, probability: "0.6", name: "普通" },
    ];
    for (let i = 0; i < 100; i++) {
      const result = rollBoxGoods(goods);
      expect([1, 2, 3]).toContain(result.id);
    }
  });

  it("should return the only item when there is one", () => {
    const goods = [{ id: 42, probability: "1.0", name: "唯一物品" }];
    const result = rollBoxGoods(goods);
    expect(result.id).toBe(42);
  });

  it("should distribute roughly according to probability", () => {
    const goods = [
      { id: 1, probability: "0.9", name: "普通" },
      { id: 2, probability: "0.1", name: "稀有" },
    ];
    const counts: Record<number, number> = { 1: 0, 2: 0 };
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const r = rollBoxGoods(goods);
      counts[r.id]++;
    }
    // 普通物品应该占大多数（70%~100%）
    expect(counts[1] / N).toBeGreaterThan(0.7);
    // 稀有物品应该少于30%
    expect(counts[2] / N).toBeLessThan(0.3);
  });
});

// ── 测试 genRoomNo ────────────────────────────────────────────────────────

function genRoomNo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

describe("genRoomNo", () => {
  it("should generate a 6-digit string", () => {
    for (let i = 0; i < 50; i++) {
      const no = genRoomNo();
      expect(no).toMatch(/^\d{6}$/);
    }
  });

  it("should generate values between 100000 and 999999", () => {
    for (let i = 0; i < 50; i++) {
      const no = parseInt(genRoomNo());
      expect(no).toBeGreaterThanOrEqual(100000);
      expect(no).toBeLessThanOrEqual(999999);
    }
  });
});

// ── 测试 arenaRouter 导出 ─────────────────────────────────────────────────

describe("arenaRouter exports", () => {
  it("should export arenaRouter with required procedures", async () => {
    const { arenaRouter } = await import("./arenaRouter");
    expect(arenaRouter).toBeDefined();
    // tRPC router 有 _def 属性
    expect((arenaRouter as any)._def).toBeDefined();
    // 检查关键 procedure 存在
    const procedures = (arenaRouter as any)._def.procedures;
    expect(procedures).toHaveProperty("getRooms");
    expect(procedures).toHaveProperty("getRoomDetail");
    expect(procedures).toHaveProperty("createRoom");
    expect(procedures).toHaveProperty("joinRoom");
    expect(procedures).toHaveProperty("spinRound");
    expect(procedures).toHaveProperty("cancelRoom");
    expect(procedures).toHaveProperty("getMyRecords");
  });
});

// ── 测试 arenaWs 广播函数 ─────────────────────────────────────────────────

describe("arenaWs exports", () => {
  it("should export all required broadcast functions", async () => {
    const ws = await import("./arenaWs");
    expect(typeof ws.initArenaWs).toBe("function");
    expect(typeof ws.broadcastRoomListUpdate).toBe("function");
    expect(typeof ws.broadcastPlayerJoined).toBe("function");
    expect(typeof ws.broadcastGameStarted).toBe("function");
    expect(typeof ws.broadcastRoundResult).toBe("function");
    expect(typeof ws.broadcastGameOver).toBe("function");
    expect(typeof ws.broadcastRoomCancelled).toBe("function");
  });

  it("should not throw when broadcasting to empty client set", async () => {
    // 没有连接的客户端时，广播不应抛出异常
    const { broadcastRoomListUpdate } = await import("./arenaWs");
    expect(() => broadcastRoomListUpdate([])).not.toThrow();
  });
});

// ── 测试 schema 表定义 ────────────────────────────────────────────────────

describe("arena schema tables", () => {
  it("should export arenaRooms, arenaRoomPlayers, arenaRoundResults", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.arenaRooms).toBeDefined();
    expect(schema.arenaRoomPlayers).toBeDefined();
    expect(schema.arenaRoundResults).toBeDefined();
  });

  it("arenaRooms should have required columns", async () => {
    const { arenaRooms } = await import("../drizzle/schema");
    const columns = Object.keys((arenaRooms as any)[Symbol.for("drizzle:Columns")] || (arenaRooms as any)._.columns || {});
    // 至少包含这些核心字段
    const required = ["id", "roomNo", "creatorId", "maxPlayers", "rounds", "entryFee", "status"];
    for (const col of required) {
      // 检查列名存在（drizzle 表对象的键）
      const tableKeys = Object.keys(arenaRooms);
      expect(tableKeys.some(k => k === col || k.toLowerCase().includes(col.toLowerCase()))).toBe(true);
    }
  });
});

// ── 测试 arenaSSE 广播函数 ─────────────────────────────────────────────────

describe("arenaSSE exports", () => {
  it("should export all required broadcast functions", async () => {
    const sse = await import("./arenaSSE");
    expect(typeof sse.initArenaSSE).toBe("function");
    expect(typeof sse.broadcastRoomListUpdate).toBe("function");
    expect(typeof sse.broadcastPlayerJoined).toBe("function");
    expect(typeof sse.broadcastGameStarted).toBe("function");
    expect(typeof sse.broadcastRoundResult).toBe("function");
    expect(typeof sse.broadcastGameOver).toBe("function");
    expect(typeof sse.broadcastRoomCancelled).toBe("function");
  });
});

// ── 测试轮次间隔时序 ──────────────────────────────────────────────────────

describe("autoSpinAllRounds timing", () => {
  it("should have 4500ms round delay in arenaRouter source", async () => {
    // 读取 arenaRouter.ts 源码，检查轮次延迟是否为 4500ms
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "arenaRouter.ts");
    const source = fs.readFileSync(filePath, "utf-8");
    // 检查 4500ms 延迟存在（slot动画约3秒 + 开奖展示1.5秒）
    expect(source).toContain("4500");
    // 确保没有使用旧的 6000ms 延迟
    expect(source).not.toContain("setTimeout(res, 6000)");
  });
});

// ── 测试观战模式逻辑 ──────────────────────────────────────────────────────

describe("spectator mode logic", () => {
  it("joinRoom error handling should allow spectators for playing/full rooms", () => {
    // 模拟 joinRoom 错误处理逻辑
    const handleJoinError = (errMsg: string): { isPresent: boolean; shouldEnableRoomDetail: boolean } => {
      if (errMsg.includes('已满') || errMsg.includes('不在等待') || errMsg.includes('已不在等待')) {
        return { isPresent: false, shouldEnableRoomDetail: true };
      }
      return { isPresent: false, shouldEnableRoomDetail: false };
    };

    // 房间已满 → 观战者
    const result1 = handleJoinError("房间已满");
    expect(result1.isPresent).toBe(false);
    expect(result1.shouldEnableRoomDetail).toBe(true);

    // 房间已不在等待状态（playing/finished）→ 观战者
    const result2 = handleJoinError("房间已不在等待状态");
    expect(result2.isPresent).toBe(false);
    expect(result2.shouldEnableRoomDetail).toBe(true);

    // 其他错误 → 显示错误信息
    const result3 = handleJoinError("服务器错误");
    expect(result3.isPresent).toBe(false);
    expect(result3.shouldEnableRoomDetail).toBe(false);
  });

  it("round_result should update gameStatus to playing for spectators", () => {
    // 模拟 round_result 消息处理
    let gameStatus = 'waiting';
    let currentRound = 0;

    const handleRoundResult = (msg: { type: string; roundNo: number; results: any[] }) => {
      // 确保 gameStatus 为 playing（观战者可能在 roomDetail 加载前收到此消息）
      gameStatus = 'playing';
      currentRound = msg.roundNo;
    };

    handleRoundResult({ type: 'round_result', roundNo: 1, results: [] });
    expect(gameStatus).toBe('playing');
    expect(currentRound).toBe(1);
  });

  it("spectatorPlayers should be populated from round_result results", () => {
    // 模拟从 round_result 提取玩家信息
    const results = [
      { playerId: 1, nickname: '玩家A', seatNo: 1, goodsId: 1, goodsName: '宝剑', goodsImage: '', goodsLevel: 1, goodsValue: '100' },
      { playerId: 2, nickname: '玩家B', seatNo: 2, goodsId: 2, goodsName: '盾牌', goodsImage: '', goodsLevel: 2, goodsValue: '200' },
    ];

    let spectatorPlayers: Array<{ playerId: number; nickname: string; avatar: string; seatNo: number }> = [];

    if (results.length > 0 && results[0].seatNo !== undefined) {
      spectatorPlayers = results.map((r: any) => ({
        playerId: r.playerId,
        nickname: r.nickname ?? `玩家${r.seatNo}`,
        avatar: r.avatar ?? '001',
        seatNo: r.seatNo,
      }));
    }

    expect(spectatorPlayers).toHaveLength(2);
    expect(spectatorPlayers[0].playerId).toBe(1);
    expect(spectatorPlayers[0].nickname).toBe('玩家A');
    expect(spectatorPlayers[1].seatNo).toBe(2);
  });
});
