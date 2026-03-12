ALTER TABLE `rollRoomPrizes` ADD `prizeType` enum('coin','item') DEFAULT 'coin' NOT NULL;--> statement-breakpoint
ALTER TABLE `rollRoomPrizes` ADD `itemCategory` varchar(50) DEFAULT 'roll' NOT NULL;