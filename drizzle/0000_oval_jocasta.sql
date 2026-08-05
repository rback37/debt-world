CREATE TABLE `debts` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`kind` text NOT NULL,
	`currency` text NOT NULL,
	`original` real NOT NULL,
	`balance` real NOT NULL,
	`monthly` real NOT NULL,
	`due_day` integer NOT NULL,
	`method` text NOT NULL,
	`last_paid_at` text,
	`payments` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `debts_vault_id_idx` ON `debts` (`vault_id`);--> statement-breakpoint
CREATE TABLE `payment_records` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`debt_id` text NOT NULL,
	`scheduled_date` text,
	`confirmed_at` text NOT NULL,
	`cash_payment` real NOT NULL,
	`new_balance` real NOT NULL,
	`source` text DEFAULT 'self_report' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payments_vault_id_idx` ON `payment_records` (`vault_id`);--> statement-breakpoint
CREATE INDEX `payments_debt_id_idx` ON `payment_records` (`debt_id`);--> statement-breakpoint
CREATE TABLE `vaults` (
	`id` text PRIMARY KEY NOT NULL,
	`recovery_hash` text NOT NULL,
	`alias` text NOT NULL,
	`region` text NOT NULL,
	`pressure` text DEFAULT '' NOT NULL,
	`position_x` real DEFAULT 47 NOT NULL,
	`position_y` real DEFAULT 63 NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vaults_recovery_hash_unique` ON `vaults` (`recovery_hash`);