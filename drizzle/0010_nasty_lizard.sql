CREATE TABLE `weeklyCommissionStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviterId` int NOT NULL,
	`weekStart` varchar(12) NOT NULL,
	`commissionRate` decimal(5,2) NOT NULL DEFAULT '4.00',
	`totalMembers` int NOT NULL DEFAULT 0,
	`newMembers` int NOT NULL DEFAULT 0,
	`totalRecharge` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalFlow` decimal(15,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weeklyCommissionStats_id` PRIMARY KEY(`id`)
);
