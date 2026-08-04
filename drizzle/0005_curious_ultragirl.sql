CREATE TABLE `lucky_income_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`debt_id` text NOT NULL,
	`event_date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lucky_income_vault_day_unique` ON `lucky_income_claims` (`vault_id`,`event_date`);--> statement-breakpoint
CREATE INDEX `lucky_income_debt_idx` ON `lucky_income_claims` (`debt_id`);--> statement-breakpoint
CREATE TABLE `public_stories` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`debt_id` text NOT NULL,
	`anonymous_name` text NOT NULL,
	`country_code` text DEFAULT '' NOT NULL,
	`debt_kind` text NOT NULL,
	`amount_band` text NOT NULL,
	`currency` text NOT NULL,
	`repayment_approach` text DEFAULT 'other' NOT NULL,
	`story_text` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `public_stories_status_idx` ON `public_stories` (`status`);--> statement-breakpoint
CREATE INDEX `public_stories_vault_idx` ON `public_stories` (`vault_id`);--> statement-breakpoint
CREATE TABLE `story_encouragements` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`vault_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `public_stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `story_encouragement_unique` ON `story_encouragements` (`story_id`,`vault_id`);--> statement-breakpoint
CREATE INDEX `story_encouragement_story_idx` ON `story_encouragements` (`story_id`);--> statement-breakpoint
CREATE TABLE `story_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`reporter_vault_id` text NOT NULL,
	`reason` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`story_id`) REFERENCES `public_stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reporter_vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `story_report_unique` ON `story_reports` (`story_id`,`reporter_vault_id`);--> statement-breakpoint
CREATE INDEX `story_reports_status_idx` ON `story_reports` (`status`);--> statement-breakpoint
ALTER TABLE `payment_records` ADD `event_date` text;--> statement-breakpoint
ALTER TABLE `payment_records` ADD `income_type` text;