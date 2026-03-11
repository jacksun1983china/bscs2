ALTER TABLE `csAgents` ADD `fcmToken` varchar(500) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `csAgents` ADD `lastActiveAt` timestamp DEFAULT (now());