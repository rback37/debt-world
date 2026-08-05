PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lucky_income_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`vault_id` text NOT NULL,
	`event_date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vault_id`) REFERENCES `vaults`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_lucky_income_claims`("id", "vault_id", "event_date", "created_at") SELECT "id", "vault_id", "event_date", "created_at" FROM `lucky_income_claims`;--> statement-breakpoint
DROP TABLE `lucky_income_claims`;--> statement-breakpoint
ALTER TABLE `__new_lucky_income_claims` RENAME TO `lucky_income_claims`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `lucky_income_vault_day_unique` ON `lucky_income_claims` (`vault_id`,`event_date`);