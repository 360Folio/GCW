CREATE TABLE `accounts` (
	`id` varchar(36) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` datetime(3),
	`refresh_token_expires_at` datetime(3),
	`scope` text,
	`password` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`actor_id` varchar(36),
	`action` varchar(80) NOT NULL,
	`entity_type` varchar(40),
	`entity_id` varchar(36),
	`details` json,
	`ip_address` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `claims` (
	`id` varchar(36) NOT NULL,
	`story_id` varchar(36) NOT NULL,
	`text` text NOT NULL,
	`kind` enum('name','title','date','figure','place','other') NOT NULL DEFAULT 'other',
	`status` enum('supported','flagged','resolved') NOT NULL DEFAULT 'flagged',
	`source_id` varchar(36),
	`note` text,
	`resolved_by` varchar(36),
	`resolved_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `claims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conflict_translations` (
	`conflict_id` varchar(36) NOT NULL,
	`locale` enum('en','ur') NOT NULL,
	`name` varchar(200) NOT NULL,
	`summary` text,
	`explainer` mediumtext,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `conflict_translations_conflict_id_locale_pk` PRIMARY KEY(`conflict_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `conflicts` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`status` enum('active','frozen','resolved') NOT NULL DEFAULT 'active',
	`region` varchar(120),
	`lat` double,
	`lng` double,
	`started_on` datetime,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `conflicts_id` PRIMARY KEY(`id`),
	CONSTRAINT `conflicts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `map_events` (
	`id` varchar(36) NOT NULL,
	`conflict_id` varchar(36),
	`story_id` varchar(36),
	`kind` enum('clash','strike','protest','diplomacy','humanitarian','other') NOT NULL DEFAULT 'other',
	`severity` int NOT NULL DEFAULT 1,
	`lat` double NOT NULL,
	`lng` double NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`title_en` varchar(300) NOT NULL,
	`title_ur` varchar(300),
	`approved` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `map_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` varchar(36) NOT NULL,
	`key` varchar(255) NOT NULL,
	`count` int NOT NULL,
	`last_request` bigint NOT NULL,
	CONSTRAINT `rate_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `rate_limits_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`ip_address` varchar(64),
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` varchar(36) NOT NULL,
	`story_id` varchar(36) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`publisher` varchar(200),
	`title` varchar(500),
	`published_at` datetime(3),
	`excerpt` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stories` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`status` enum('draft','in_review','approved','published','rejected') NOT NULL DEFAULT 'draft',
	`conflict_id` varchar(36),
	`topic_id` varchar(36),
	`origin` enum('ai','editor') NOT NULL DEFAULT 'ai',
	`featured_image_url` text,
	`featured_image_credit` varchar(255),
	`published_at` datetime(3),
	`approved_by` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `stories_id` PRIMARY KEY(`id`),
	CONSTRAINT `stories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `story_translations` (
	`story_id` varchar(36) NOT NULL,
	`locale` enum('en','ur') NOT NULL,
	`title` varchar(300) NOT NULL,
	`summary` text,
	`body` mediumtext NOT NULL,
	`seo_title` varchar(300),
	`seo_description` varchar(500),
	`status` enum('draft','approved') NOT NULL DEFAULT 'draft',
	`source` enum('ai','editor') NOT NULL DEFAULT 'ai',
	`approved_at` datetime(3),
	`approved_by` varchar(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `story_translations_story_id_locale_pk` PRIMARY KEY(`story_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`locale` enum('en','ur') NOT NULL DEFAULT 'en',
	`status` enum('pending','active','unsubscribed') NOT NULL DEFAULT 'pending',
	`follows` json,
	`confirm_token_hash` varchar(128),
	`confirmed_at` datetime(3),
	`unsubscribe_token_hash` varchar(128),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscribers_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `topic_translations` (
	`topic_id` varchar(36) NOT NULL,
	`locale` enum('en','ur') NOT NULL,
	`name` varchar(120) NOT NULL,
	CONSTRAINT `topic_translations_topic_id_locale_pk` PRIMARY KEY(`topic_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `topics_id` PRIMARY KEY(`id`),
	CONSTRAINT `topics_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `two_factors` (
	`id` varchar(36) NOT NULL,
	`secret` varchar(255) NOT NULL,
	`backup_codes` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`verified` boolean DEFAULT true,
	`failed_verification_count` int DEFAULT 0,
	`locked_until` datetime(3),
	CONSTRAINT `two_factors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`two_factor_enabled` boolean DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `claims` ADD CONSTRAINT `claims_story_id_stories_id_fk` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `claims` ADD CONSTRAINT `claims_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `claims` ADD CONSTRAINT `claims_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conflict_translations` ADD CONSTRAINT `conflict_translations_conflict_id_conflicts_id_fk` FOREIGN KEY (`conflict_id`) REFERENCES `conflicts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `map_events` ADD CONSTRAINT `map_events_conflict_id_conflicts_id_fk` FOREIGN KEY (`conflict_id`) REFERENCES `conflicts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `map_events` ADD CONSTRAINT `map_events_story_id_stories_id_fk` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sources` ADD CONSTRAINT `sources_story_id_stories_id_fk` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stories` ADD CONSTRAINT `stories_conflict_id_conflicts_id_fk` FOREIGN KEY (`conflict_id`) REFERENCES `conflicts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stories` ADD CONSTRAINT `stories_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stories` ADD CONSTRAINT `stories_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `story_translations` ADD CONSTRAINT `story_translations_story_id_stories_id_fk` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `story_translations` ADD CONSTRAINT `story_translations_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `topic_translations` ADD CONSTRAINT `topic_translations_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `two_factors` ADD CONSTRAINT `two_factors_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_log_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `claims_story_status_idx` ON `claims` (`story_id`,`status`);--> statement-breakpoint
CREATE INDEX `map_events_time_idx` ON `map_events` (`approved`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `map_events_conflict_idx` ON `map_events` (`conflict_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sources_story_idx` ON `sources` (`story_id`);--> statement-breakpoint
CREATE INDEX `stories_status_published_idx` ON `stories` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `stories_conflict_idx` ON `stories` (`conflict_id`);--> statement-breakpoint
CREATE INDEX `stories_topic_idx` ON `stories` (`topic_id`);--> statement-breakpoint
CREATE INDEX `two_factors_user_idx` ON `two_factors` (`user_id`);--> statement-breakpoint
CREATE INDEX `two_factors_secret_idx` ON `two_factors` (`secret`);--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);