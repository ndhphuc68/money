CREATE TABLE `gold_brands` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`revision` integer NOT NULL,
	`origin_device_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gold_lots` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`purchase_date` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`quantity_grams` real NOT NULL,
	`total_amount` integer NOT NULL,
	`note` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`revision` integer NOT NULL,
	`origin_device_id` text NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `gold_brands`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "gold_lots_unit_check" CHECK("gold_lots"."unit" in ('luong', 'chi', 'phan', 'gram')),
	CONSTRAINT "gold_lots_status_check" CHECK("gold_lots"."status" in ('held', 'sold'))
);
--> statement-breakpoint
CREATE INDEX `gold_lots_brand_id_idx` ON `gold_lots` (`brand_id`);--> statement-breakpoint
CREATE INDEX `gold_lots_status_idx` ON `gold_lots` (`status`);--> statement-breakpoint
CREATE INDEX `gold_lots_purchase_date_idx` ON `gold_lots` (`purchase_date`);--> statement-breakpoint
CREATE TABLE `gold_sell_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`lot_id` text NOT NULL,
	`sale_date` text NOT NULL,
	`total_amount` integer NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`revision` integer NOT NULL,
	`origin_device_id` text NOT NULL,
	FOREIGN KEY (`lot_id`) REFERENCES `gold_lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `gold_sell_transactions_lot_id_idx` ON `gold_sell_transactions` (`lot_id`);--> statement-breakpoint
CREATE INDEX `gold_sell_transactions_sale_date_idx` ON `gold_sell_transactions` (`sale_date`);