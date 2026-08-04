CREATE TABLE `beta_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`invite_digest` text NOT NULL,
	`consent_version` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `beta_enrollments_vault_id_unique` ON `beta_enrollments` (`vault_id`);--> statement-breakpoint
CREATE INDEX `beta_enrollments_created_idx` ON `beta_enrollments` (`created_at`);--> statement-breakpoint
CREATE TABLE `beta_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`category` text NOT NULL,
	`rating` integer NOT NULL,
	`message` text NOT NULL,
	`page_path` text DEFAULT '/' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `beta_feedback_vault_idx` ON `beta_feedback` (`vault_id`);--> statement-breakpoint
CREATE INDEX `beta_feedback_status_idx` ON `beta_feedback` (`status`);--> statement-breakpoint
CREATE TABLE `beta_invite_counters` (
	`invite_digest` text PRIMARY KEY NOT NULL,
	`uses` integer DEFAULT 0 NOT NULL,
	`max_uses` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `beta_runtime_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`signups_enabled` integer NOT NULL,
	`updated_by_digest` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
