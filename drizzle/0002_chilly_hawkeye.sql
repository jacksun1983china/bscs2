CREATE TABLE `banners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`imageUrl` varchar(500) NOT NULL,
	`linkUrl` varchar(500) NOT NULL DEFAULT '',
	`title` varchar(100) NOT NULL DEFAULT '',
	`sort` int NOT NULL DEFAULT 0,
	`status` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broadcasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content` varchar(500) NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`status` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `broadcasts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goldLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`balance` decimal(15,2) NOT NULL,
	`type` varchar(50) NOT NULL,
	`description` varchar(255) NOT NULL DEFAULT '',
	`refId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `goldLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inviteRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviterId` int NOT NULL,
	`inviteeId` int NOT NULL,
	`commission` decimal(10,2) NOT NULL DEFAULT '0.00',
	`orderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inviteRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`imageUrl` varchar(500) NOT NULL DEFAULT '',
	`quality` enum('common','rare','epic','legendary') NOT NULL DEFAULT 'common',
	`value` decimal(15,2) NOT NULL DEFAULT '0.00',
	`type` varchar(50) NOT NULL DEFAULT 'skin',
	`game` varchar(50) NOT NULL DEFAULT 'CS',
	`status` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playerItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`itemId` int NOT NULL,
	`source` varchar(50) NOT NULL DEFAULT 'box',
	`status` tinyint NOT NULL DEFAULT 0,
	`extractedAt` timestamp,
	`recycleGold` decimal(15,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playerItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rechargeConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`gold` decimal(15,2) NOT NULL,
	`bonusDiamond` decimal(15,2) NOT NULL DEFAULT '0.00',
	`tag` varchar(50) NOT NULL DEFAULT '',
	`isFirstRecharge` tinyint NOT NULL DEFAULT 0,
	`sort` int NOT NULL DEFAULT 0,
	`status` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rechargeConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rechargeOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNo` varchar(64) NOT NULL,
	`playerId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`gold` decimal(15,2) NOT NULL,
	`bonusDiamond` decimal(15,2) NOT NULL DEFAULT '0.00',
	`payMethod` varchar(50) NOT NULL DEFAULT 'manual',
	`status` tinyint NOT NULL DEFAULT 0,
	`remark` varchar(255) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rechargeOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `rechargeOrders_orderNo_unique` UNIQUE(`orderNo`)
);
--> statement-breakpoint
CREATE TABLE `vipConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`level` tinyint NOT NULL,
	`name` varchar(50) NOT NULL,
	`requiredPoints` int NOT NULL DEFAULT 0,
	`rechargeBonus` decimal(5,2) NOT NULL DEFAULT '0.00',
	`privileges` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vipConfigs_id` PRIMARY KEY(`id`),
	CONSTRAINT `vipConfigs_level_unique` UNIQUE(`level`)
);
--> statement-breakpoint
ALTER TABLE `players` ADD `points` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `steamAccount` varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `safePassword` varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `realName` varchar(50) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `idCard` varchar(20) DEFAULT '' NOT NULL;