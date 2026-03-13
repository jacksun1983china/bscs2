CREATE TABLE IF NOT EXISTS `boxGoods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`boxId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`imageUrl` varchar(500) NOT NULL DEFAULT '',
	`level` tinyint NOT NULL DEFAULT 3,
	`price` decimal(15,2) NOT NULL DEFAULT '0.00',
	`probability` decimal(10,4) NOT NULL DEFAULT '1.0000',
	`sort` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `boxGoods_id` PRIMARY KEY(`id`)
);
CREATE TABLE IF NOT EXISTS `skuCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`iconUrl` varchar(500) NOT NULL DEFAULT '',
	`sort` int NOT NULL DEFAULT 0,
	`status` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skuCategories_id` PRIMARY KEY(`id`)
);
ALTER TABLE `boxes` ADD `goodsBgUrl` varchar(500) DEFAULT '' NOT NULL;
ALTER TABLE `boxes` ADD `categoryId` int DEFAULT 0 NOT NULL;