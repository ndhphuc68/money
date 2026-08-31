CREATE TABLE `recurring_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`scheduled_date` text NOT NULL,
	`amount` integer NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text NOT NULL,
	`display_name` text NOT NULL,
	`note` text,
	`status` text NOT NULL,
	`transaction_id` text,
	`notified_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`revision` integer NOT NULL,
	`origin_device_id` text NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `recurring_schedules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "recurring_occurrences_status_check" CHECK("recurring_occurrences"."status" in ('pending', 'confirmed', 'skipped'))
);
--> statement-breakpoint
CREATE INDEX `recurring_occurrences_schedule_id_idx` ON `recurring_occurrences` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_status_idx` ON `recurring_occurrences` (`status`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_scheduled_date_idx` ON `recurring_occurrences` (`scheduled_date`);--> statement-breakpoint
CREATE TABLE `recurring_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`type` text NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text NOT NULL,
	`amount` integer NOT NULL,
	`frequency` text NOT NULL,
	`anchor_day` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`occurrence_limit` integer,
	`remind_days_before` integer NOT NULL,
	`status` text NOT NULL,
	`first_transaction_id` text NOT NULL,
	`note` text,
	`generated_count` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`revision` integer NOT NULL,
	`origin_device_id` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`first_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "recurring_schedules_type_check" CHECK("recurring_schedules"."type" in ('expense')),
	CONSTRAINT "recurring_schedules_frequency_check" CHECK("recurring_schedules"."frequency" in ('weekly', 'monthly', 'quarterly', 'yearly')),
	CONSTRAINT "recurring_schedules_status_check" CHECK("recurring_schedules"."status" in ('active', 'paused', 'ended'))
);
--> statement-breakpoint
CREATE INDEX `recurring_schedules_account_id_idx` ON `recurring_schedules` (`account_id`);--> statement-breakpoint
CREATE INDEX `recurring_schedules_status_idx` ON `recurring_schedules` (`status`);