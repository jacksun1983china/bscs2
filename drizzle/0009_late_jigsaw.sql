CREATE TABLE `gameConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameKey` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameEn` varchar(100) NOT NULL DEFAULT '',
	`coverUrl` varchar(500) NOT NULL DEFAULT '',
	`path` varchar(100) NOT NULL DEFAULT '',
	`rtp` int NOT NULL DEFAULT 96,
	`enabled` tinyint NOT NULL DEFAULT 1,
	`minBet` int NOT NULL DEFAULT 100,
	`maxBet` int NOT NULL DEFAULT 1000000,
	`sort` int NOT NULL DEFAULT 0,
	`remark` varchar(255) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gameConfigs_id` PRIMARY KEY(`id`),
	CONSTRAINT `gameConfigs_gameKey_unique` UNIQUE(`gameKey`)
);
