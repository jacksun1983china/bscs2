CREATE INDEX `goldLogs_playerId_idx` ON `goldLogs` (`playerId`);
CREATE INDEX `goldLogs_type_idx` ON `goldLogs` (`type`);
CREATE INDEX `goldLogs_createdAt_idx` ON `goldLogs` (`createdAt`);
CREATE INDEX `playerItems_playerId_idx` ON `playerItems` (`playerId`);
CREATE INDEX `playerItems_status_idx` ON `playerItems` (`status`);
CREATE INDEX `rechargeOrders_playerId_idx` ON `rechargeOrders` (`playerId`);
CREATE INDEX `rechargeOrders_status_idx` ON `rechargeOrders` (`status`);
CREATE INDEX `rechargeOrders_createdAt_idx` ON `rechargeOrders` (`createdAt`);