CREATE TABLE `change_log` (
	`operation_id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`operation` text NOT NULL,
	`payload` text NOT NULL,
	`origin_device_id` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE TABLE `example_records` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`revision` integer NOT NULL,
	`origin_device_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`device_id` text,
	`schema_version` integer NOT NULL,
	`last_imported_at` text,
	`last_exported_at` text
);
