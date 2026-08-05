CREATE TABLE `policy_acceptances` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`policy_key` text NOT NULL,
	`policy_version` text NOT NULL,
	`accepted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policy_acceptance_vault_key_version_unique` ON `policy_acceptances` (`vault_id`,`policy_key`,`policy_version`);--> statement-breakpoint
CREATE INDEX `policy_acceptance_vault_idx` ON `policy_acceptances` (`vault_id`);