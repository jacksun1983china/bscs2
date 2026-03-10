CREATE TABLE `boxGoods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`boxId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`imageUrl` varchar(500) NOT NULL DEFAULT '',
	`level` tinyint NOT NULL DEFAULT 3,
	`price` decimal(15,2) NOT NULL DEFAULT '0.00',
	`probability` decimal(10,4) NOT NULL DEFAULT '1.0000',
	`sort` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `boxGoods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skuCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`iconUrl` varchar(500) NOT NULL DEFAULT '',
	`sort` int NOT NULL DEFAULT 0,
	`status` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skuCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `boxes` ADD `goodsBgUrl` varchar(500) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `boxes` ADD `categoryId` int DEFAULT 0 NOT NULL;