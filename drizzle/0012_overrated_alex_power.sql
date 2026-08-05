CREATE TABLE `account_auth_limits` (
	`limit_key` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`window_key` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `account_auth_limits_window_idx` ON `account_auth_limits` (`window_key`);--> statement-breakpoint
CREATE TABLE `account_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_sessions_token_hash_unique` ON `account_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `account_sessions_account_idx` ON `account_sessions` (`account_id`);--> statement-breakpoint
CREATE INDEX `account_sessions_expires_idx` ON `account_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `account_vaults` (
	`account_id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`linked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_vaults_vault_id_unique` ON `account_vaults` (`vault_id`);--> statement-breakpoint
CREATE INDEX `account_vaults_vault_idx` ON `account_vaults` (`vault_id`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_code` text NOT NULL,
	`username` text NOT NULL,
	`username_normalized` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_iterations` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_login_at` text,
	`last_seen_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_user_code_unique` ON `accounts` (`user_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_username_normalized_unique` ON `accounts` (`username_normalized`);--> statement-breakpoint
CREATE INDEX `accounts_created_idx` ON `accounts` (`created_at`);--> statement-breakpoint
CREATE TABLE `owner_admins` (
	`id` text PRIMARY KEY NOT NULL,
	`email_digest` text NOT NULL,
	`role` text DEFAULT 'owner' NOT NULL,
	`activated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owner_admins_email_digest_unique` ON `owner_admins` (`email_digest`);