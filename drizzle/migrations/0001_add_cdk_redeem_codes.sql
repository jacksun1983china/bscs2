CREATE TABLE IF NOT EXISTS `cdkRedeemCodes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(64) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `status` tinyint NOT NULL DEFAULT 0 COMMENT '0未使用 1已使用 2已删除',
  `usedByPlayerId` int DEFAULT NULL,
  `usedAt` timestamp NULL DEFAULT NULL,
  `expireAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cdkRedeemCodes_code_unique` (`code`),
  KEY `cdkRedeemCodes_code_idx` (`code`),
  KEY `cdkRedeemCodes_status_idx` (`status`),
  KEY `cdkRedeemCodes_usedByPlayerId_idx` (`usedByPlayerId`),
  KEY `cdkRedeemCodes_expireAt_idx` (`expireAt`),
  KEY `cdkRedeemCodes_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
