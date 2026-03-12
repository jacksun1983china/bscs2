ALTER TABLE `players` MODIFY COLUMN `steamAccount` varchar(500) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `players` ADD `steamSubAccount` varchar(500) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `steamBindingCode` varchar(20) DEFAULT '' NOT NULL;