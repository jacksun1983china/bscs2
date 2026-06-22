import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { players } from "../drizzle/schema";
import { insertGoldLog } from "./db";

export interface ArenaCoinPlan {
  entryFee: number;
  goldBefore: number;
  diamondBefore: number;
  goldUsed: number;
  diamondUsed: number;
  goldAfter: number;
  diamondAfter: number;
}

function roundCurrency(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function buildArenaCoinPlan(
  player: { gold?: string | null; diamond?: string | null },
  entryFee: number,
): ArenaCoinPlan {
  const need = roundCurrency(entryFee);
  const goldBefore = roundCurrency(parseFloat(player.gold ?? "0"));
  const diamondBefore = roundCurrency(parseFloat(player.diamond ?? "0"));
  const totalBalance = roundCurrency(goldBefore + diamondBefore);

  if (totalBalance + 1e-6 < need) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `余额不足，需要 ${need.toFixed(2)}，当前平台币 ${goldBefore.toFixed(2)}，商城币 ${diamondBefore.toFixed(2)}`,
    });
  }

  const goldUsed = roundCurrency(Math.min(goldBefore, need));
  const diamondUsed = roundCurrency(Math.max(0, need - goldUsed));

  return {
    entryFee: need,
    goldBefore,
    diamondBefore,
    goldUsed,
    diamondUsed,
    goldAfter: roundCurrency(goldBefore - goldUsed),
    diamondAfter: roundCurrency(diamondBefore - diamondUsed),
  };
}

export async function applyArenaCoinPlan(
  db: any,
  playerId: number,
  plan: ArenaCoinPlan,
  scene: string,
) {
  await db
    .update(players)
    .set({
      gold: plan.goldAfter.toFixed(2),
      diamond: plan.diamondAfter.toFixed(2),
    })
    .where(eq(players.id, playerId));

  if (plan.goldUsed > 0) {
    await insertGoldLog(playerId, -plan.goldUsed, plan.goldAfter, "arena", `竞技场入场费（${scene}-平台币）`);
  }
  if (plan.diamondUsed > 0) {
    await insertGoldLog(playerId, -plan.diamondUsed, plan.diamondAfter, "arena", `竞技场入场费（${scene}-商城币补差）`);
  }
}

export async function rollbackArenaCoinPlan(
  db: any,
  playerId: number,
  plan: ArenaCoinPlan,
  scene: string,
) {
  await db
    .update(players)
    .set({
      gold: plan.goldBefore.toFixed(2),
      diamond: plan.diamondBefore.toFixed(2),
    })
    .where(eq(players.id, playerId));

  if (plan.goldUsed > 0) {
    await insertGoldLog(playerId, plan.goldUsed, plan.goldBefore, "arena", `竞技场退款（${scene}-平台币）`);
  }
  if (plan.diamondUsed > 0) {
    await insertGoldLog(playerId, plan.diamondUsed, plan.diamondBefore, "arena", `竞技场退款（${scene}-商城币）`);
  }
}

export function getArenaRefundBreakdown(record: any, entryFee: number) {
  const goldPaid = roundCurrency(parseFloat(record?.payGold ?? "0"));
  const diamondPaid = roundCurrency(parseFloat(record?.payDiamond ?? "0"));

  if (goldPaid > 0 || diamondPaid > 0) {
    return { goldPaid, diamondPaid };
  }

  return {
    goldPaid: roundCurrency(entryFee),
    diamondPaid: 0,
  };
}

export async function refundArenaBreakdown(
  db: any,
  playerId: number,
  breakdown: { goldPaid: number; diamondPaid: number },
  remark: string,
  shouldLog = true,
) {
  const [player] = await db.select().from(players).where(eq(players.id, playerId));
  if (!player) return null;

  const goldBefore = roundCurrency(parseFloat(player.gold ?? "0"));
  const diamondBefore = roundCurrency(parseFloat(player.diamond ?? "0"));
  const goldAfter = roundCurrency(goldBefore + roundCurrency(breakdown.goldPaid));
  const diamondAfter = roundCurrency(diamondBefore + roundCurrency(breakdown.diamondPaid));

  await db
    .update(players)
    .set({
      gold: goldAfter.toFixed(2),
      diamond: diamondAfter.toFixed(2),
    })
    .where(eq(players.id, playerId));

  if (shouldLog && breakdown.goldPaid > 0) {
    await insertGoldLog(playerId, roundCurrency(breakdown.goldPaid), goldAfter, "arena", `${remark}（平台币）`);
  }
  if (shouldLog && breakdown.diamondPaid > 0) {
    await insertGoldLog(playerId, roundCurrency(breakdown.diamondPaid), diamondAfter, "arena", `${remark}（商城币）`);
  }

  return { goldAfter, diamondAfter };
}
