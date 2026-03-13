ALTER TABLE `players` MODIFY COLUMN `steamAccount` varchar(500) NOT NULL DEFAULT '';
ALTER TABLE `players` ADD `steamSubAccount` varchar(500) DEFAULT '' NOT NULL;
ALTER TABLE `players` ADD `steamBindingCode` varchar(20) DEFAULT '' NOT NULL;