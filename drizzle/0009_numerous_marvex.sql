CREATE TABLE `ai_daily_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`usage_date` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_daily_usage_vault_date_unique` ON `ai_daily_usage` (`vault_id`,`usage_date`);--> statement-breakpoint
CREATE INDEX `ai_daily_usage_date_idx` ON `ai_daily_usage` (`usage_date`);