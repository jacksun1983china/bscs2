CREATE TABLE IF NOT EXISTS `arenaRoomPlayers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`playerId` int NOT NULL,
	`nickname` varchar(100) NOT NULL DEFAULT '',
	`avatar` varchar(10) NOT NULL DEFAULT '001',
	`seatNo` tinyint NOT NULL DEFAULT 1,
	`totalValue` decimal(15,2) NOT NULL DEFAULT '0.00',
	`isWinner` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `arenaRoomPlayers_id` PRIMARY KEY(`id`)
);
CREATE TABLE IF NOT EXISTS `arenaRooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomNo` varchar(20) NOT NULL,
	`creatorId` int NOT NULL,
	`creatorNickname` varchar(100) NOT NULL DEFAULT '',
	`creatorAvatar` varchar(10) NOT NULL DEFAULT '001',
	`maxPlayers` tinyint NOT NULL DEFAULT 2,
	`currentPlayers` tinyint NOT NULL DEFAULT 1,
	`rounds` tinyint NOT NULL DEFAULT 1,
	`entryFee` decimal(15,2) NOT NULL DEFAULT '0.00',
	`boxIds` text NOT NULL,
	`status` enum('waiting','playing','finished','cancelled') NOT NULL DEFAULT 'waiting',
	`winnerId` int NOT NULL DEFAULT 0,
	`currentRound` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `arenaRooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `arenaRooms_roomNo_unique` UNIQUE(`roomNo`)
);
CREATE TABLE IF NOT EXISTS `arenaRoundResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`roundNo` tinyint NOT NULL,
	`playerId` int NOT NULL,
	`boxId` int NOT NULL,
	`boxName` varchar(100) NOT NULL DEFAULT '',
	`goodsId` int NOT NULL,
	`goodsName` varchar(200) NOT NULL DEFAULT '',
	`goodsImage` varchar(500) NOT NULL DEFAULT '',
	`goodsLevel` tinyint NOT NULL DEFAULT 3,
	`goodsValue` decimal(15,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `arenaRoundResults_id` PRIMARY KEY(`id`)
);
