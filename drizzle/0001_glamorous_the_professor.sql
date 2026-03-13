CREATE TABLE `players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`nickname` varchar(100) NOT NULL DEFAULT '',
	`avatar` varchar(500) NOT NULL DEFAULT '',
	`vipLevel` tinyint NOT NULL DEFAULT 0,
	`gold` decimal(15,2) NOT NULL DEFAULT '0.00',
	`diamond` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalRecharge` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalWin` decimal(15,2) NOT NULL DEFAULT '0.00',
	`status` tinyint NOT NULL DEFAULT 1,
	`banReason` varchar(255) NOT NULL DEFAULT '',
	`registerIp` varchar(50) NOT NULL DEFAULT '',
	`lastLogin` timestamp DEFAULT CURRENT_TIMESTAMP,
	`lastIp` varchar(50) NOT NULL DEFAULT '',
	`device` varchar(200) NOT NULL DEFAULT '',
	`inviteCode` varchar(20) NOT NULL DEFAULT '',
	`invitedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `players_id` PRIMARY KEY(`id`),
	CONSTRAINT `players_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `smsCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`code` varchar(10) NOT NULL,
	`purpose` varchar(20) NOT NULL DEFAULT 'login',
	`used` tinyint NOT NULL DEFAULT 0,
	`expireAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `smsCodes_id` PRIMARY KEY(`id`)
);
