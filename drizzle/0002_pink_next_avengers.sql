ALTER TABLE `vaults` ADD `country_code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `vaults` ADD `country_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `vaults` ADD `display_currency` text DEFAULT 'CNY' NOT NULL;--> statement-breakpoint
ALTER TABLE `vaults` ADD `monthly_income` real DEFAULT 0 NOT NULL;