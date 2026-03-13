ALTER TABLE `csAgents` ADD `fcmToken` varchar(500) DEFAULT '' NOT NULL;
ALTER TABLE `csAgents` ADD `lastActiveAt` timestamp DEFAULT CURRENT_TIMESTAMP;