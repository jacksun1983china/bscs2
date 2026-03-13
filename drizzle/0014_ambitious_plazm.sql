CREATE TABLE IF NOT EXISTS `dingdongGames` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`betAmount` decimal(18,2) NOT NULL,
	`selectedCell` int NOT NULL,
	`winCell` int NOT NULL,
	`isWin` tinyint NOT NULL DEFAULT 0,
	`multiplier` decimal(10,2) NOT NULL DEFAULT '0.00',
	`winAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`netAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`balanceAfter` decimal(18,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `dingdongGames_id` PRIMARY KEY(`id`)
);
CREATE TABLE IF NOT EXISTS `rushGames` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`betAmount` decimal(18,2) NOT NULL,
	`lanesReached` int NOT NULL DEFAULT 0,
	`isDead` tinyint NOT NULL DEFAULT 0,
	`finalMultiplier` decimal(10,2) NOT NULL DEFAULT '0.00',
	`winAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`netAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	`balanceAfter` decimal(18,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `rushGames_id` PRIMARY KEY(`id`)
);
