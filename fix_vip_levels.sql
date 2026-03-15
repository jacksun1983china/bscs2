-- 一次性修复脚本：根据 totalRecharge 重新计算所有玩家的 VIP 等级
-- VIP 等级对应充值门槛（默认配置）：VIP0=0, VIP1=1000, VIP2=2000, ... VIP10=10000

UPDATE players SET vipLevel = CASE
  WHEN CAST(totalRecharge AS DECIMAL(12,2)) >= 10000 THEN 10
  WHEN CAST(totalRecharge AS DECIMAL(12,2)) >= 9000 THEN 9
  WHEN CAST(totalRecharge AS DECIMAL(12,2)) >= 8000 THEN 8
  WHEN CAST(totalRecharge AS DECIMAL(12,2)) >= 7000 THEN 7
  WHEN CAST(totalRecharge AS DECIMAL(12,2)) >= 6000 THEN 6
  WHEN CAST(totalRecharge AS DECIMAL(12,2)) >= 5000 THEN 5
  WHEN CAST(totalRecharge AS DECIMAL(12,2)) >= 4000 THEN 4
  WHEN CAST(totalRecharge AS DECIMAL(12,2)) >= 3000 THEN 3
  WHEN CAST(totalRecharge AS DECIMAL(12,2)) >= 2000 THEN 2
  WHEN CAST(totalRecharge AS DECIMAL(12,2)) >= 1000 THEN 1
  ELSE 0
END;

-- 验证修复结果
SELECT id, nickname, phone, totalRecharge, vipLevel FROM players WHERE CAST(totalRecharge AS DECIMAL(12,2)) > 0 ORDER BY CAST(totalRecharge AS DECIMAL(12,2)) DESC;
