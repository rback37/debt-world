CREATE TABLE `world_category_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_key` text NOT NULL,
	`parent_kind` text DEFAULT 'other' NOT NULL,
	`name_zh` text NOT NULL,
	`name_en` text NOT NULL,
	`description_zh` text DEFAULT '' NOT NULL,
	`description_en` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'candidate' NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`confidence` real DEFAULT 0 NOT NULL,
	`unique_vaults` integer DEFAULT 0 NOT NULL,
	`region_count` integer DEFAULT 0 NOT NULL,
	`mention_count` integer DEFAULT 0 NOT NULL,
	`emergence_score` real DEFAULT 0 NOT NULL,
	`weight_profile_id` text,
	`merged_into_id` text,
	`proposed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	`published_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`weight_profile_id`) REFERENCES `world_weight_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `world_category_candidates_canonical_key_unique` ON `world_category_candidates` (`canonical_key`);--> statement-breakpoint
CREATE INDEX `world_candidates_status_idx` ON `world_category_candidates` (`status`);--> statement-breakpoint
CREATE INDEX `world_candidates_score_idx` ON `world_category_candidates` (`emergence_score`);--> statement-breakpoint
CREATE TABLE `world_growth_events` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`event_type` text NOT NULL,
	`from_stage` integer,
	`to_stage` integer,
	`actor_type` text DEFAULT 'system' NOT NULL,
	`weight_profile_id` text,
	`evidence_json` text DEFAULT '{}' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `world_category_candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weight_profile_id`) REFERENCES `world_weight_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `world_events_candidate_idx` ON `world_growth_events` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `world_signal_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`debt_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`confidence` real NOT NULL,
	`assignment_source` text DEFAULT 'ai' NOT NULL,
	`taxonomy_version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_id`) REFERENCES `world_category_candidates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `world_signal_assignments_debt_id_unique` ON `world_signal_assignments` (`debt_id`);--> statement-breakpoint
CREATE INDEX `world_signals_vault_idx` ON `world_signal_assignments` (`vault_id`);--> statement-breakpoint
CREATE INDEX `world_signals_candidate_idx` ON `world_signal_assignments` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `world_weight_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`frequency_weight` real NOT NULL,
	`growth_weight` real NOT NULL,
	`geography_weight` real NOT NULL,
	`recurrence_weight` real NOT NULL,
	`connection_weight` real NOT NULL,
	`quality_weight` real NOT NULL,
	`proposed_by` text DEFAULT 'human' NOT NULL,
	`model_ref` text,
	`rationale` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`activated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `world_weight_profiles_version_unique` ON `world_weight_profiles` (`version`);--> statement-breakpoint
ALTER TABLE `debts` ADD `custom_label` text;--> statement-breakpoint
ALTER TABLE `vaults` ADD `discovery_consent` integer DEFAULT false NOT NULL;