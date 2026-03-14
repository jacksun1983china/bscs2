/**
 * 测试 buildGameOverData 辅助函数的平局检测逻辑
 * 
 * 由于 buildGameOverData 定义在 ArenaRoom.tsx（React 组件文件）中，
 * 这里用独立的纯函数复制来验证核心逻辑。
 */
import { describe, it, expect } from 'vitest';

// 复制 buildGameOverData 的核心逻辑用于测试
function buildGameOverData(
  playerList: Array<{ playerId: number; nickname: string; avatar: string; seatNo: number }>,
  playerTotals: Record<number, number>,
) {
  const vals = Object.values(playerTotals);
  const maxVal = vals.length > 0 ? Math.max(...vals) : 0;
  const allSame = vals.length >= 2 && vals.every((v) => v === vals[0]);
  const isDraw = allSame;

  const overPlayers = playerList.map((p) => ({
    playerId: p.playerId,
    nickname: p.nickname,
    avatar: p.avatar,
    seatNo: p.seatNo,
    totalValue: (playerTotals[p.playerId] ?? 0).toFixed(2),
    isWinner: !isDraw && maxVal > 0 && (playerTotals[p.playerId] ?? 0) === maxVal,
    isDraw,
  }));

  const winner = isDraw ? null : overPlayers.find((p) => p.isWinner);
  return {
    winnerId: winner?.playerId ?? 0,
    isDraw,
    players: overPlayers,
  };
}

const PLAYERS = [
  { playerId: 1, nickname: '赤红第八', avatar: '001', seatNo: 1 },
  { playerId: 2, nickname: '黑暗无愁', avatar: '002', seatNo: 2 },
];

const THREE_PLAYERS = [
  ...PLAYERS,
  { playerId: 3, nickname: '五湖四海', avatar: '003', seatNo: 3 },
];

describe('buildGameOverData 平局检测', () => {
  it('两人总价值相同时应判定为平局', () => {
    const totals = { 1: 0.20, 2: 0.20 };
    const result = buildGameOverData(PLAYERS, totals);
    
    expect(result.isDraw).toBe(true);
    expect(result.winnerId).toBe(0);
    expect(result.players[0].isWinner).toBe(false);
    expect(result.players[1].isWinner).toBe(false);
    expect(result.players[0].isDraw).toBe(true);
    expect(result.players[1].isDraw).toBe(true);
  });

  it('一人总价值更高时应判定有赢家', () => {
    const totals = { 1: 0.40, 2: 0.20 };
    const result = buildGameOverData(PLAYERS, totals);
    
    expect(result.isDraw).toBe(false);
    expect(result.winnerId).toBe(1);
    expect(result.players[0].isWinner).toBe(true);
    expect(result.players[1].isWinner).toBe(false);
    expect(result.players[0].isDraw).toBe(false);
  });

  it('三人中两人并列最高时不应判定为平局（只有全部相同才是平局）', () => {
    const totals = { 1: 0.40, 2: 0.40, 3: 0.20 };
    const result = buildGameOverData(THREE_PLAYERS, totals);
    
    // 不是所有人都相同，所以不是平局
    expect(result.isDraw).toBe(false);
    // 两人并列最高，都是赢家
    expect(result.players[0].isWinner).toBe(true);
    expect(result.players[1].isWinner).toBe(true);
    expect(result.players[2].isWinner).toBe(false);
  });

  it('三人总价值全部相同时应判定为平局', () => {
    const totals = { 1: 0.30, 2: 0.30, 3: 0.30 };
    const result = buildGameOverData(THREE_PLAYERS, totals);
    
    expect(result.isDraw).toBe(true);
    expect(result.winnerId).toBe(0);
    expect(result.players.every((p) => !p.isWinner)).toBe(true);
    expect(result.players.every((p) => p.isDraw)).toBe(true);
  });

  it('总价值为0时两人相同也应判定为平局', () => {
    const totals = { 1: 0, 2: 0 };
    const result = buildGameOverData(PLAYERS, totals);
    
    expect(result.isDraw).toBe(true);
    expect(result.winnerId).toBe(0);
  });

  it('金额格式化应保留两位小数', () => {
    const totals = { 1: 1.5, 2: 0.2 };
    const result = buildGameOverData(PLAYERS, totals);
    
    expect(result.players[0].totalValue).toBe('1.50');
    expect(result.players[1].totalValue).toBe('0.20');
  });

  it('只有一个玩家时不应判定为平局', () => {
    const singlePlayer = [PLAYERS[0]];
    const totals = { 1: 0.50 };
    const result = buildGameOverData(singlePlayer, totals);
    
    // 只有一个值，vals.length < 2，不是平局
    expect(result.isDraw).toBe(false);
    expect(result.players[0].isWinner).toBe(true);
  });
});
