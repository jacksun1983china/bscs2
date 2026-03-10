CREATE TABLE `boxItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`boxId` int NOT NULL,
	`itemId` int NOT NULL,
	`probability` decimal(6,4) NOT NULL DEFAULT '1.0000',
	`sort` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `boxItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boxes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`imageUrl` varchar(500) NOT NULL DEFAULT '',
	`price` decimal(15,2) NOT NULL DEFAULT '0.00',
	`category` varchar(50) NOT NULL DEFAULT '普通',
	`description` varchar(500) NOT NULL DEFAULT '',
	`sort` int NOT NULL DEFAULT 0,
	`status` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `boxes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `siteSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`value` text NOT NULL DEFAULT (''),
	`description` varchar(255) NOT NULL DEFAULT '',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `siteSettings_settingKey_unique` UNIQUE(`settingKey`)
);
