CREATE INDEX `goldLogs_playerId_idx` ON `goldLogs` (`playerId`);--> statement-breakpoint
CREATE INDEX `goldLogs_type_idx` ON `goldLogs` (`type`);--> statement-breakpoint
CREATE INDEX `goldLogs_createdAt_idx` ON `goldLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `playerItems_playerId_idx` ON `playerItems` (`playerId`);--> statement-breakpoint
CREATE INDEX `playerItems_status_idx` ON `playerItems` (`status`);--> statement-breakpoint
CREATE INDEX `rechargeOrders_playerId_idx` ON `rechargeOrders` (`playerId`);--> statement-breakpoint
CREATE INDEX `rechargeOrders_status_idx` ON `rechargeOrders` (`status`);--> statement-breakpoint
CREATE INDEX `rechargeOrders_createdAt_idx` ON `rechargeOrders` (`createdAt`);