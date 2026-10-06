CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`program_name` text NOT NULL,
	`price_cents` integer NOT NULL,
	`duration_minutes` integer NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_phone` text NOT NULL,
	`appointment_start` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`email_status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bookings_appointment_start` ON `bookings` (`appointment_start`);--> statement-breakpoint
CREATE INDEX `idx_bookings_customer_email` ON `bookings` (`customer_email`);--> statement-breakpoint
CREATE TABLE `report_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`report_type` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`status` text NOT NULL,
	`provider_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_report_runs_type_period` ON `report_runs` (`report_type`,`period_start`);