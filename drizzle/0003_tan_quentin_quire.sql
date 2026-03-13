CREATE TABLE `commissionLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`fromPlayerId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`orderId` int,
	`status` tinyint NOT NULL DEFAULT 0,
	`withdrawnAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `commissionLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`isRead` tinyint NOT NULL DEFAULT 0,
	`type` varchar(50) NOT NULL DEFAULT 'system',
	`refId` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rollParticipants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rollRoomId` int NOT NULL,
	`playerId` int NOT NULL,
	`isBot` tinyint NOT NULL DEFAULT 0,
	`botNickname` varchar(100) NOT NULL DEFAULT '',
	`botAvatar` varchar(500) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `rollParticipants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rollRoomPrizes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rollRoomId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`imageUrl` varchar(500) NOT NULL DEFAULT '',
	`value` decimal(10,2) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`coinType` enum('shopCoin','gold') NOT NULL DEFAULT 'shopCoin',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `rollRoomPrizes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rollRooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`avatarUrl` varchar(500) NOT NULL DEFAULT '',
	`ownerId` int,
	`threshold` decimal(10,2) NOT NULL DEFAULT '0.00',
	`maxParticipants` int NOT NULL DEFAULT 0,
	`startAt` timestamp NOT NULL,
	`endAt` timestamp NOT NULL,
	`status` enum('pending','ended') NOT NULL DEFAULT 'pending',
	`totalValue` decimal(15,2) NOT NULL DEFAULT '0.00',
	`totalPrizes` int NOT NULL DEFAULT 0,
	`participantCount` int NOT NULL DEFAULT 0,
	`botCount` int NOT NULL DEFAULT 0,
	`actualPaidValue` decimal(15,2) NOT NULL DEFAULT '0.00',
	`actualPaidCount` int NOT NULL DEFAULT 0,
	`createdBy` varchar(64) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rollRooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rollWinners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rollRoomId` int NOT NULL,
	`prizeId` int NOT NULL,
	`playerId` int NOT NULL DEFAULT 0,
	`isBot` tinyint NOT NULL DEFAULT 0,
	`nicknameSnapshot` varchar(100) NOT NULL DEFAULT '',
	`isDesignated` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `rollWinners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `players` ADD `shopCoin` decimal(15,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `identity` enum('player','streamer','merchant') DEFAULT 'player' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `commissionRate` decimal(5,2) DEFAULT '4.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `commissionEnabled` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `commissionBalance` decimal(15,2) DEFAULT '0.00' NOT NULL;