ALTER TABLE `debts` ADD `apr` real;--> statement-breakpoint
ALTER TABLE `debts` ADD `minimum_payment` real;--> statement-breakpoint
ALTER TABLE `debts` ADD `payment_status` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `debts` ADD `remaining_months` integer;