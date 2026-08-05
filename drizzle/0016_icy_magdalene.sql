ALTER TABLE `owner_admins` ADD `account_id` text REFERENCES accounts(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `owner_admins_account_id_unique` ON `owner_admins` (`account_id`);
