ALTER TABLE `rollRoomPrizes` ADD `prizeType` enum('coin','item') DEFAULT 'coin' NOT NULL;
ALTER TABLE `rollRoomPrizes` ADD `itemCategory` varchar(50) DEFAULT 'roll' NOT NULL;