CREATE TABLE `rushPendingSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`betAmount` decimal(18,2) NOT NULL,
	`laneResults` varchar(255) NOT NULL,
	`laneMultipliers` varchar(255) NOT NULL,
	`settled` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rushPendingSessions_id` PRIMARY KEY(`id`)
);
