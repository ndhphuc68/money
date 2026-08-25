PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`opening_balance` integer NOT NULL,
	`is_archived` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`revision` integer NOT NULL,
	`origin_device_id` text NOT NULL,
	CONSTRAINT "accounts_type_check" CHECK("__new_accounts"."type" in ('cash', 'bank', 'e-wallet', 'credit-card', 'other'))
);
--> statement-breakpoint
INSERT INTO `__new_accounts`("id", "name", "type", "opening_balance", "is_archived", "created_at", "updated_at", "deleted_at", "revision", "origin_device_id") SELECT "id", "name", "type", "opening_balance", "is_archived", "created_at", "updated_at", "deleted_at", "revision", "origin_device_id" FROM `accounts`;--> statement-breakpoint
DROP TABLE `accounts`;--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`is_archived` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`revision` integer NOT NULL,
	`origin_device_id` text NOT NULL,
	CONSTRAINT "categories_type_check" CHECK("__new_categories"."type" in ('income', 'expense'))
);
--> statement-breakpoint
INSERT INTO `__new_categories`("id", "name", "type", "is_archived", "created_at", "updated_at", "deleted_at", "revision", "origin_device_id") SELECT "id", "name", "type", "is_archived", "created_at", "updated_at", "deleted_at", "revision", "origin_device_id" FROM `categories`;--> statement-breakpoint
DROP TABLE `categories`;--> statement-breakpoint
ALTER TABLE `__new_categories` RENAME TO `categories`;--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`account_id` text NOT NULL,
	`destination_account_id` text,
	`category_id` text,
	`transaction_date` text NOT NULL,
	`name` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`revision` integer NOT NULL,
	`origin_device_id` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "transactions_type_check" CHECK("__new_transactions"."type" in ('income', 'expense', 'transfer'))
);
--> statement-breakpoint
INSERT INTO `__new_transactions`("id", "type", "amount", "account_id", "destination_account_id", "category_id", "transaction_date", "name", "note", "created_at", "updated_at", "deleted_at", "revision", "origin_device_id") SELECT "id", "type", "amount", "account_id", "destination_account_id", "category_id", "transaction_date", "name", "note", "created_at", "updated_at", "deleted_at", "revision", "origin_device_id" FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
CREATE INDEX `transactions_account_id_idx` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `transactions_transaction_date_idx` ON `transactions` (`transaction_date`);--> statement-breakpoint
CREATE INDEX `transactions_type_idx` ON `transactions` (`type`);--> statement-breakpoint
CREATE INDEX `transactions_category_id_idx` ON `transactions` (`category_id`);