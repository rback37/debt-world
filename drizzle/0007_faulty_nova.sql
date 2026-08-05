CREATE TABLE `community_moderation_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`actor_digest` text NOT NULL,
	`action` text NOT NULL,
	`from_status` text NOT NULL,
	`to_status` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `public_stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `community_moderation_story_idx` ON `community_moderation_actions` (`story_id`);--> statement-breakpoint
CREATE INDEX `community_moderation_created_idx` ON `community_moderation_actions` (`created_at`);--> statement-breakpoint
CREATE TABLE `community_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`action` text NOT NULL,
	`window_key` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_rate_vault_action_window_unique` ON `community_rate_limits` (`vault_id`,`action`,`window_key`);--> statement-breakpoint
CREATE INDEX `community_rate_window_idx` ON `community_rate_limits` (`window_key`);