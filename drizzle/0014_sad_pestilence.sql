CREATE TABLE `referral_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`code` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_codes_vault_id_unique` ON `referral_codes` (`vault_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `referral_codes_code_unique` ON `referral_codes` (`code`);--> statement-breakpoint
CREATE INDEX `referral_codes_status_idx` ON `referral_codes` (`status`);--> statement-breakpoint
CREATE TABLE `referral_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`inviter_vault_id` text NOT NULL,
	`invited_vault_id` text NOT NULL,
	`code_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`qualified_at` text,
	`rewarded_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`inviter_vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`code_id`) REFERENCES `referral_codes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_relationships_invited_vault_id_unique` ON `referral_relationships` (`invited_vault_id`);--> statement-breakpoint
CREATE INDEX `referrals_inviter_status_idx` ON `referral_relationships` (`inviter_vault_id`,`status`);--> statement-breakpoint
CREATE INDEX `referrals_created_idx` ON `referral_relationships` (`created_at`);--> statement-breakpoint
CREATE TABLE `shore_value_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`event_key` text NOT NULL,
	`event_type` text NOT NULL,
	`points` integer NOT NULL,
	`reference_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shore_value_ledger_event_key_unique` ON `shore_value_ledger` (`event_key`);--> statement-breakpoint
CREATE INDEX `shore_value_vault_created_idx` ON `shore_value_ledger` (`vault_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `shore_value_event_type_idx` ON `shore_value_ledger` (`event_type`);--> statement-breakpoint
CREATE TABLE `starlight_gifts` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_vault_id` text NOT NULL,
	`recipient_vault_id` text NOT NULL,
	`story_id` text,
	`points` integer NOT NULL,
	`gift_date` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sender_vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `starlight_gifts_idempotency_key_unique` ON `starlight_gifts` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `starlight_sender_created_idx` ON `starlight_gifts` (`sender_vault_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `starlight_recipient_created_idx` ON `starlight_gifts` (`recipient_vault_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `starlight_wallets` (
	`vault_id` text PRIMARY KEY NOT NULL,
	`available` integer DEFAULT 0 NOT NULL,
	`lifetime_earned` integer DEFAULT 0 NOT NULL,
	`lifetime_sent` integer DEFAULT 0 NOT NULL,
	`lifetime_received` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
