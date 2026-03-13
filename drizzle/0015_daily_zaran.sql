CREATE TABLE IF NOT EXISTS `fruitBombBets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`playerId` int NOT NULL,
	`playerName` varchar(100) NOT NULL DEFAULT '',
	`fruitIdx` int NOT NULL,
	`betAmount` decimal(18,2) NOT NULL,
	`multiplier` decimal(10,2) NOT NULL,
	`isWin` tinyint NOT NULL DEFAULT 0,
	`winAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`netAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`balanceAfter` decimal(18,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `fruitBombBets_id` PRIMARY KEY(`id`)
);
CREATE TABLE IF NOT EXISTS `fruitBombRounds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`winFruitIdx` int NOT NULL DEFAULT 0,
	`status` varchar(20) NOT NULL DEFAULT 'betting',
	`startedAt` bigint NOT NULL,
	`finishedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `fruitBombRounds_id` PRIMARY KEY(`id`)
);
