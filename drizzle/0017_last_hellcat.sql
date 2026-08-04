CREATE TABLE `site_daily_visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`visit_date` text NOT NULL,
	`visitor_digest` text NOT NULL,
	`first_source` text DEFAULT 'direct' NOT NULL,
	`first_locale` text DEFAULT 'zh' NOT NULL,
	`first_path` text DEFAULT '/' NOT NULL,
	`page_views` integer DEFAULT 1 NOT NULL,
	`first_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_daily_visitors_date_digest_unique` ON `site_daily_visitors` (`visit_date`,`visitor_digest`);--> statement-breakpoint
CREATE INDEX `site_daily_visitors_date_idx` ON `site_daily_visitors` (`visit_date`);--> statement-breakpoint
CREATE INDEX `site_daily_visitors_source_date_idx` ON `site_daily_visitors` (`first_source`,`visit_date`);