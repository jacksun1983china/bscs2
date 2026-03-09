CREATE TABLE `csAgents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`username` varchar(50) NOT NULL,
	`password` varchar(100) NOT NULL,
	`avatarUrl` varchar(500) NOT NULL DEFAULT '',
	`status` enum('online','busy','offline') NOT NULL DEFAULT 'offline',
	`activeSessionCount` int NOT NULL DEFAULT 0,
	`maxSessions` int NOT NULL DEFAULT 5,
	`enabled` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csAgents_id` PRIMARY KEY(`id`),
	CONSTRAINT `csAgents_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `csMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`senderType` enum('player','agent','system') NOT NULL,
	`senderId` int NOT NULL DEFAULT 0,
	`senderName` varchar(100) NOT NULL DEFAULT '',
	`senderAvatar` varchar(500) NOT NULL DEFAULT '',
	`msgType` enum('text','image') NOT NULL DEFAULT 'text',
	`content` text NOT NULL,
	`isRead` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `csMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `csQuickReplies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(50) NOT NULL DEFAULT '通用',
	`title` varchar(100) NOT NULL,
	`content` text NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`status` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `csQuickReplies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `csSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`agentId` int,
	`status` enum('waiting','active','closed') NOT NULL DEFAULT 'waiting',
	`title` varchar(200) NOT NULL DEFAULT '',
	`agentUnread` int NOT NULL DEFAULT 0,
	`playerUnread` int NOT NULL DEFAULT 0,
	`lastMessage` varchar(500) NOT NULL DEFAULT '',
	`lastMessageAt` timestamp DEFAULT (now()),
	`closeReason` varchar(200) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csSessions_id` PRIMARY KEY(`id`)
);
