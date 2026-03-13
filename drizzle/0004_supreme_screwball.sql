CREATE TABLE `gameSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameKey` varchar(50) NOT NULL,
	`rtp` decimal(5,2) NOT NULL DEFAULT '96.00',
	`minBet` decimal(18,2) NOT NULL DEFAULT '1.00',
	`maxBet` decimal(18,2) NOT NULL DEFAULT '10000.00',
	`minMultiplier` decimal(10,2) NOT NULL DEFAULT '1.10',
	`maxMultiplier` decimal(10,2) NOT NULL DEFAULT '30000.00',
	`enabled` tinyint NOT NULL DEFAULT 1,
	`remark` varchar(255) NOT NULL DEFAULT '',
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gameSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `gameSettings_gameKey_unique` UNIQUE(`gameKey`)
);
--> statement-breakpoint
CREATE TABLE `rollxGames` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`betAmount` decimal(18,2) NOT NULL,
	`multiplier` decimal(10,2) NOT NULL,
	`isWin` tinyint NOT NULL DEFAULT 0,
	`winAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`netAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`stopAngle` decimal(10,4) NOT NULL DEFAULT '0.0000',
	`balanceAfter` decimal(18,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `rollxGames_id` PRIMARY KEY(`id`)
);
