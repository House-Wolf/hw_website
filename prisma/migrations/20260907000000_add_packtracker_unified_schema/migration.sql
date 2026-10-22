-- CreateTable
CREATE TABLE "packtracker_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "discord_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "discriminator" TEXT NOT NULL DEFAULT '',
    "discord_display_name" TEXT,
    "discord_rank" TEXT,
    "discord_division" TEXT,
    "discord_avatar_url" TEXT,
    "showcase_image_url" TEXT,
    "showcase_eyebrow" TEXT,
    "showcase_tagline" TEXT,
    "showcase_bio" TEXT,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_claim_counts" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packtracker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_request_tickets" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" TEXT NOT NULL,
    "created_by_display_name" TEXT NOT NULL,
    "assigned_to_user_id" TEXT,
    "assigned_to_display_name" TEXT,
    "completed_by_user_id" TEXT,
    "due_at" TIMESTAMPTZ(6),
    "skill_objective" TEXT NOT NULL DEFAULT '',
    "game_build" TEXT NOT NULL DEFAULT '',
    "player_handle" TEXT NOT NULL DEFAULT '',
    "time_zone" TEXT NOT NULL DEFAULT '',
    "has_mic" BOOLEAN NOT NULL DEFAULT false,
    "platform_specs" TEXT NOT NULL DEFAULT '',
    "availability" TEXT NOT NULL DEFAULT '',
    "current_baseline" TEXT NOT NULL DEFAULT '',
    "assets_ships" TEXT NOT NULL DEFAULT '',
    "urgency" TEXT NOT NULL DEFAULT '',
    "group_preference" TEXT NOT NULL DEFAULT '',
    "success_criteria" TEXT NOT NULL DEFAULT '',
    "recording_permission" TEXT NOT NULL DEFAULT '',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "material_name" TEXT,
    "quantity_needed" INTEGER,
    "meeting_location" TEXT,
    "reward_offered" TEXT,
    "max_claims" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "packtracker_request_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_guide_requests" (
    "id" UUID NOT NULL,
    "thread_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "requester" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_to_user_id" BIGINT,
    "assigned_to_username" TEXT,
    "assigned_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "packtracker_guide_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_assistance_requests" (
    "id" UUID NOT NULL,
    "kind" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_by_profile_id" UUID NOT NULL,
    "assigned_to_profile_id" UUID,
    "material_name" TEXT,
    "quantity_needed" INTEGER,
    "meeting_location" TEXT,
    "reward_offered" TEXT,
    "max_claims" INTEGER NOT NULL DEFAULT 1,
    "due_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "packtracker_assistance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_blueprints" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "blueprint_name" TEXT NOT NULL,
    "crafted_item_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "is_in_game_available" BOOLEAN NOT NULL DEFAULT true,
    "acquisition_summary" TEXT,
    "acquisition_location" TEXT,
    "acquisition_method" TEXT,
    "source_version" TEXT,
    "data_confidence" TEXT NOT NULL DEFAULT 'Imported',
    "notes" TEXT,
    "wiki_uuid" TEXT,
    "wiki_last_synced_at" TEXT,
    "owner_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packtracker_blueprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_materials" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "material_type" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "source_type" INTEGER NOT NULL DEFAULT 0,
    "is_raw_ore" BOOLEAN NOT NULL DEFAULT false,
    "is_refined_material" BOOLEAN NOT NULL DEFAULT false,
    "is_crafted_component" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "wiki_uuid" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packtracker_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_blueprint_recipes" (
    "id" UUID NOT NULL,
    "blueprint_id" UUID NOT NULL,
    "output_quantity" INTEGER NOT NULL DEFAULT 1,
    "crafting_station_type" TEXT,
    "time_to_craft_seconds" INTEGER,
    "notes" TEXT,

    CONSTRAINT "packtracker_blueprint_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_blueprint_recipe_materials" (
    "id" UUID NOT NULL,
    "blueprint_recipe_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "quantity_required" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'SCU',
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "is_intermediate_craftable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "packtracker_blueprint_recipe_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_material_sources" (
    "id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "source_method" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "source_version" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'Imported',
    "notes" TEXT,

    CONSTRAINT "packtracker_material_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_member_blueprint_ownerships" (
    "id" UUID NOT NULL,
    "blueprint_id" UUID NOT NULL,
    "member_profile_id" UUID NOT NULL,
    "ownership_status" INTEGER NOT NULL DEFAULT 0,
    "interest_type" INTEGER NOT NULL DEFAULT 0,
    "verified_by_profile_id" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "availability_status" TEXT NOT NULL DEFAULT 'Available',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packtracker_member_blueprint_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_crafting_requests" (
    "id" UUID NOT NULL,
    "blueprint_id" UUID NOT NULL,
    "requester_profile_id" UUID NOT NULL,
    "assigned_crafter_profile_id" UUID,
    "quantity_requested" INTEGER NOT NULL DEFAULT 1,
    "minimum_quality" INTEGER NOT NULL DEFAULT 1,
    "refusal_reason" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "max_claims" INTEGER NOT NULL DEFAULT 1,
    "item_name" TEXT,
    "delivery_location" TEXT,
    "reward_offered" TEXT,
    "required_by" TIMESTAMPTZ(6),
    "notes" TEXT,
    "material_supply_mode" INTEGER NOT NULL DEFAULT 2,
    "requester_time_zone_display_name" TEXT,
    "requester_utc_offset_minutes" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "packtracker_crafting_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_material_procurement_requests" (
    "id" UUID NOT NULL,
    "linked_crafting_request_id" UUID,
    "material_id" UUID NOT NULL,
    "requester_profile_id" UUID,
    "assigned_to_profile_id" UUID,
    "quantity_requested" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "quantity_delivered" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "minimum_quality" INTEGER NOT NULL DEFAULT 1,
    "preferred_form" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "max_claims" INTEGER NOT NULL DEFAULT 1,
    "delivery_location" TEXT,
    "reward_offered" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "packtracker_material_procurement_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_org_inventory_items" (
    "id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "quantity_on_hand" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "quantity_reserved" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "storage_location" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packtracker_org_inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_request_comments" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "author_profile_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_live_chat" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMPTZ(6),

    CONSTRAINT "packtracker_request_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_request_claims" (
    "id" UUID NOT NULL,
    "request_type" TEXT NOT NULL,
    "request_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "claimed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packtracker_request_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_lobby_chat_messages" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "sender_display_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sender_discord_id" TEXT NOT NULL,
    "avatar_url" TEXT,
    "sender_role" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMPTZ(6),

    CONSTRAINT "packtracker_lobby_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_commodities" (
    "id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT,
    "weight_scu" INTEGER,
    "roi" DECIMAL(18,2),
    "price_buy" DECIMAL(18,2),
    "price_sell" DECIMAL(18,2),
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "is_available_live" BOOLEAN NOT NULL DEFAULT false,
    "is_visible" BOOLEAN NOT NULL DEFAULT false,
    "is_extractable" BOOLEAN NOT NULL DEFAULT false,
    "is_mineral" BOOLEAN NOT NULL DEFAULT false,
    "is_raw" BOOLEAN NOT NULL DEFAULT false,
    "is_pure" BOOLEAN NOT NULL DEFAULT false,
    "is_refined" BOOLEAN NOT NULL DEFAULT false,
    "is_refinable" BOOLEAN NOT NULL DEFAULT false,
    "is_harvestable" BOOLEAN NOT NULL DEFAULT false,
    "is_buyable" BOOLEAN NOT NULL DEFAULT false,
    "is_sellable" BOOLEAN NOT NULL DEFAULT false,
    "is_temporary" BOOLEAN NOT NULL DEFAULT false,
    "is_illegal" BOOLEAN NOT NULL DEFAULT false,
    "is_volatile_qt" BOOLEAN NOT NULL DEFAULT false,
    "is_volatile_time" BOOLEAN NOT NULL DEFAULT false,
    "is_inert" BOOLEAN NOT NULL DEFAULT false,
    "is_explosive" BOOLEAN NOT NULL DEFAULT false,
    "is_buggy" BOOLEAN NOT NULL DEFAULT false,
    "is_fuel" BOOLEAN NOT NULL DEFAULT false,
    "wiki" TEXT,
    "date_added" TIMESTAMPTZ(6) NOT NULL,
    "date_modified" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "packtracker_commodities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_commodity_prices" (
    "id" INTEGER NOT NULL,
    "commodity_id" INTEGER NOT NULL,
    "terminal_id" INTEGER NOT NULL,
    "terminal_name" TEXT,
    "terminal_code" TEXT,
    "terminal_slug" TEXT,
    "price_buy" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "price_buy_avg" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "price_sell" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "price_sell_avg" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "scu_buy" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "scu_buy_avg" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "scu_sell_stock" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "scu_sell_stock_avg" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "scu_sell" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "scu_sell_avg" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status_buy" INTEGER,
    "status_sell" INTEGER,
    "date_added" TIMESTAMPTZ(6) NOT NULL,
    "date_modified" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "packtracker_commodity_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_medal_definitions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_path" TEXT,
    "public_image_url" TEXT,
    "source_system" TEXT NOT NULL DEFAULT 'wolf_raid',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "award_type" TEXT NOT NULL DEFAULT 'Medal',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packtracker_medal_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_medal_awards" (
    "id" UUID NOT NULL,
    "medal_definition_id" UUID NOT NULL,
    "profile_id" UUID,
    "recipient_name" TEXT NOT NULL,
    "awarded_at" TIMESTAMPTZ(6),
    "imported_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_system" TEXT NOT NULL DEFAULT 'wolf_raid',
    "citation" TEXT,
    "awarded_by" TEXT,
    "award_type" TEXT NOT NULL DEFAULT 'Medal',

    CONSTRAINT "packtracker_medal_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_medal_nominations" (
    "id" UUID NOT NULL,
    "medal_definition_id" UUID NOT NULL,
    "nominee_profile_id" UUID,
    "nominee_name" TEXT NOT NULL,
    "nominator_profile_id" UUID,
    "nominator_name" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by_profile_id" UUID,
    "reviewed_by_name" TEXT,
    "review_notes" TEXT,

    CONSTRAINT "packtracker_medal_nominations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_admin_roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "is_system_role" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packtracker_admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_admin_permission_assignments" (
    "id" UUID NOT NULL,
    "admin_role_id" UUID NOT NULL,
    "permission_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packtracker_admin_permission_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_member_role_assignments" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "admin_role_id" UUID NOT NULL,
    "assigned_by_profile_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "notes" TEXT,

    CONSTRAINT "packtracker_member_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_admin_audit_logs" (
    "id" UUID NOT NULL,
    "actor_profile_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "before_json" TEXT,
    "after_json" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'Info',
    "correlation_id" TEXT,
    "exception" TEXT,
    "machine_name" TEXT,
    "environment" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packtracker_admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_discord_integration_settings" (
    "id" UUID NOT NULL,
    "operations_enabled" BOOLEAN NOT NULL DEFAULT false,
    "medal_announcements_enabled" BOOLEAN NOT NULL DEFAULT false,
    "recruiting_posts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "operations_channel_id" TEXT,
    "medal_announcements_channel_id" TEXT,
    "recruiting_posts_channel_id" TEXT,
    "updated_by_profile_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packtracker_discord_integration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_sync_metadata" (
    "id" UUID NOT NULL,
    "task_name" TEXT NOT NULL,
    "last_started_at" TIMESTAMPTZ(6),
    "last_completed_at" TIMESTAMPTZ(6),
    "is_success" BOOLEAN NOT NULL DEFAULT false,
    "last_error_message" TEXT,
    "items_processed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "packtracker_sync_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packtracker_distributed_locks" (
    "lock_key" TEXT NOT NULL,
    "locked_by" TEXT NOT NULL,
    "locked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "packtracker_distributed_locks_pkey" PRIMARY KEY ("lock_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_profiles_user_id_key" ON "packtracker_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_profiles_discord_id_key" ON "packtracker_profiles"("discord_id");

-- CreateIndex
CREATE INDEX "packtracker_profiles_username_idx" ON "packtracker_profiles"("username");

-- CreateIndex
CREATE INDEX "packtracker_request_tickets_kind_status_idx" ON "packtracker_request_tickets"("kind", "status");

-- CreateIndex
CREATE INDEX "packtracker_request_tickets_created_by_user_id_idx" ON "packtracker_request_tickets"("created_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_guide_requests_thread_id_key" ON "packtracker_guide_requests"("thread_id");

-- CreateIndex
CREATE INDEX "packtracker_guide_requests_status_idx" ON "packtracker_guide_requests"("status");

-- CreateIndex
CREATE INDEX "packtracker_assistance_requests_status_priority_idx" ON "packtracker_assistance_requests"("status", "priority");

-- CreateIndex
CREATE INDEX "packtracker_assistance_requests_created_by_profile_id_idx" ON "packtracker_assistance_requests"("created_by_profile_id");

-- CreateIndex
CREATE INDEX "packtracker_assistance_requests_assigned_to_profile_id_idx" ON "packtracker_assistance_requests"("assigned_to_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_blueprints_slug_key" ON "packtracker_blueprints"("slug");

-- CreateIndex
CREATE INDEX "packtracker_blueprints_wiki_uuid_idx" ON "packtracker_blueprints"("wiki_uuid");

-- CreateIndex
CREATE INDEX "packtracker_blueprints_category_idx" ON "packtracker_blueprints"("category");

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_materials_slug_key" ON "packtracker_materials"("slug");

-- CreateIndex
CREATE INDEX "packtracker_materials_wiki_uuid_idx" ON "packtracker_materials"("wiki_uuid");

-- CreateIndex
CREATE INDEX "packtracker_materials_category_idx" ON "packtracker_materials"("category");

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_blueprint_recipes_blueprint_id_key" ON "packtracker_blueprint_recipes"("blueprint_id");

-- CreateIndex
CREATE INDEX "packtracker_blueprint_recipe_materials_material_id_idx" ON "packtracker_blueprint_recipe_materials"("material_id");

-- CreateIndex
CREATE INDEX "packtracker_material_sources_material_id_idx" ON "packtracker_material_sources"("material_id");

-- CreateIndex
CREATE INDEX "packtracker_member_blueprint_ownerships_member_profile_id_idx" ON "packtracker_member_blueprint_ownerships"("member_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_member_blueprint_ownerships_blueprint_id_member_key" ON "packtracker_member_blueprint_ownerships"("blueprint_id", "member_profile_id");

-- CreateIndex
CREATE INDEX "packtracker_crafting_requests_status_priority_idx" ON "packtracker_crafting_requests"("status", "priority");

-- CreateIndex
CREATE INDEX "packtracker_crafting_requests_requester_profile_id_idx" ON "packtracker_crafting_requests"("requester_profile_id");

-- CreateIndex
CREATE INDEX "packtracker_crafting_requests_assigned_crafter_profile_id_idx" ON "packtracker_crafting_requests"("assigned_crafter_profile_id");

-- CreateIndex
CREATE INDEX "packtracker_material_procurement_requests_status_priority_idx" ON "packtracker_material_procurement_requests"("status", "priority");

-- CreateIndex
CREATE INDEX "packtracker_material_procurement_requests_material_id_idx" ON "packtracker_material_procurement_requests"("material_id");

-- CreateIndex
CREATE INDEX "packtracker_material_procurement_requests_requester_profile_idx" ON "packtracker_material_procurement_requests"("requester_profile_id");

-- CreateIndex
CREATE INDEX "packtracker_material_procurement_requests_assigned_to_profi_idx" ON "packtracker_material_procurement_requests"("assigned_to_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_org_inventory_items_material_id_key" ON "packtracker_org_inventory_items"("material_id");

-- CreateIndex
CREATE INDEX "packtracker_request_comments_request_id_idx" ON "packtracker_request_comments"("request_id");

-- CreateIndex
CREATE INDEX "packtracker_request_comments_author_profile_id_idx" ON "packtracker_request_comments"("author_profile_id");

-- CreateIndex
CREATE INDEX "packtracker_request_claims_profile_id_idx" ON "packtracker_request_claims"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_request_claims_request_id_request_type_profile__key" ON "packtracker_request_claims"("request_id", "request_type", "profile_id");

-- CreateIndex
CREATE INDEX "packtracker_lobby_chat_messages_channel_idx" ON "packtracker_lobby_chat_messages"("channel");

-- CreateIndex
CREATE INDEX "packtracker_lobby_chat_messages_sent_at_idx" ON "packtracker_lobby_chat_messages"("sent_at");

-- CreateIndex
CREATE INDEX "packtracker_commodities_code_idx" ON "packtracker_commodities"("code");

-- CreateIndex
CREATE INDEX "packtracker_commodities_slug_idx" ON "packtracker_commodities"("slug");

-- CreateIndex
CREATE INDEX "packtracker_commodity_prices_commodity_id_terminal_id_idx" ON "packtracker_commodity_prices"("commodity_id", "terminal_id");

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_medal_definitions_name_key" ON "packtracker_medal_definitions"("name");

-- CreateIndex
CREATE INDEX "packtracker_medal_awards_medal_definition_id_recipient_name_idx" ON "packtracker_medal_awards"("medal_definition_id", "recipient_name");

-- CreateIndex
CREATE INDEX "packtracker_medal_awards_profile_id_idx" ON "packtracker_medal_awards"("profile_id");

-- CreateIndex
CREATE INDEX "packtracker_medal_nominations_status_idx" ON "packtracker_medal_nominations"("status");

-- CreateIndex
CREATE INDEX "packtracker_medal_nominations_submitted_at_idx" ON "packtracker_medal_nominations"("submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_admin_roles_name_key" ON "packtracker_admin_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_admin_permissions_role_permission_key" ON "packtracker_admin_permission_assignments"("admin_role_id", "permission_key");

-- CreateIndex
CREATE INDEX "packtracker_member_role_assignments_profile_id_idx" ON "packtracker_member_role_assignments"("profile_id");

-- CreateIndex
CREATE INDEX "packtracker_member_role_assignments_admin_role_id_idx" ON "packtracker_member_role_assignments"("admin_role_id");

-- CreateIndex
CREATE INDEX "packtracker_member_role_assignments_assigned_by_idx" ON "packtracker_member_role_assignments"("assigned_by_profile_id");

-- CreateIndex
CREATE INDEX "packtracker_admin_audit_logs_occurred_at_idx" ON "packtracker_admin_audit_logs"("occurred_at");

-- CreateIndex
CREATE INDEX "packtracker_admin_audit_logs_actor_occurred_idx" ON "packtracker_admin_audit_logs"("actor_profile_id", "occurred_at");

-- CreateIndex
CREATE INDEX "packtracker_admin_audit_logs_target_idx" ON "packtracker_admin_audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "packtracker_sync_metadata_task_name_key" ON "packtracker_sync_metadata"("task_name");

-- AddForeignKey
ALTER TABLE "packtracker_profiles" ADD CONSTRAINT "packtracker_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_assistance_requests" ADD CONSTRAINT "packtracker_assistance_requests_created_by_profile_id_fkey" FOREIGN KEY ("created_by_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_assistance_requests" ADD CONSTRAINT "packtracker_assistance_requests_assigned_to_profile_id_fkey" FOREIGN KEY ("assigned_to_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_blueprint_recipes" ADD CONSTRAINT "packtracker_blueprint_recipes_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "packtracker_blueprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_blueprint_recipe_materials" ADD CONSTRAINT "packtracker_blueprint_recipe_materials_blueprint_recipe_id_fkey" FOREIGN KEY ("blueprint_recipe_id") REFERENCES "packtracker_blueprint_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_blueprint_recipe_materials" ADD CONSTRAINT "packtracker_blueprint_recipe_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "packtracker_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_material_sources" ADD CONSTRAINT "packtracker_material_sources_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "packtracker_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_member_blueprint_ownerships" ADD CONSTRAINT "packtracker_member_blueprint_ownerships_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "packtracker_blueprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_member_blueprint_ownerships" ADD CONSTRAINT "packtracker_member_blueprint_ownerships_member_profile_id_fkey" FOREIGN KEY ("member_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_member_blueprint_ownerships" ADD CONSTRAINT "packtracker_member_blueprint_ownerships_verified_by_profil_fkey" FOREIGN KEY ("verified_by_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_crafting_requests" ADD CONSTRAINT "packtracker_crafting_requests_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "packtracker_blueprints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_crafting_requests" ADD CONSTRAINT "packtracker_crafting_requests_requester_profile_id_fkey" FOREIGN KEY ("requester_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_crafting_requests" ADD CONSTRAINT "packtracker_crafting_requests_assigned_crafter_profile_id_fkey" FOREIGN KEY ("assigned_crafter_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_material_procurement_requests" ADD CONSTRAINT "packtracker_material_procurement_requests_linked_crafting__fkey" FOREIGN KEY ("linked_crafting_request_id") REFERENCES "packtracker_crafting_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_material_procurement_requests" ADD CONSTRAINT "packtracker_material_procurement_requests_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "packtracker_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_material_procurement_requests" ADD CONSTRAINT "packtracker_material_procurement_requests_requester_profil_fkey" FOREIGN KEY ("requester_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_material_procurement_requests" ADD CONSTRAINT "packtracker_material_procurement_requests_assigned_to_prof_fkey" FOREIGN KEY ("assigned_to_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_org_inventory_items" ADD CONSTRAINT "packtracker_org_inventory_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "packtracker_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_request_comments" ADD CONSTRAINT "packtracker_request_comments_author_profile_id_fkey" FOREIGN KEY ("author_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_request_claims" ADD CONSTRAINT "packtracker_request_claims_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_commodity_prices" ADD CONSTRAINT "packtracker_commodity_prices_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "packtracker_commodities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_medal_awards" ADD CONSTRAINT "packtracker_medal_awards_medal_definition_id_fkey" FOREIGN KEY ("medal_definition_id") REFERENCES "packtracker_medal_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_medal_awards" ADD CONSTRAINT "packtracker_medal_awards_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_medal_nominations" ADD CONSTRAINT "packtracker_medal_nominations_medal_definition_id_fkey" FOREIGN KEY ("medal_definition_id") REFERENCES "packtracker_medal_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_medal_nominations" ADD CONSTRAINT "packtracker_medal_nominations_nominee_profile_id_fkey" FOREIGN KEY ("nominee_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_medal_nominations" ADD CONSTRAINT "packtracker_medal_nominations_nominator_profile_id_fkey" FOREIGN KEY ("nominator_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_medal_nominations" ADD CONSTRAINT "packtracker_medal_nominations_reviewed_by_profile_id_fkey" FOREIGN KEY ("reviewed_by_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_admin_permission_assignments" ADD CONSTRAINT "packtracker_admin_permissions_admin_role_id_fkey" FOREIGN KEY ("admin_role_id") REFERENCES "packtracker_admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_member_role_assignments" ADD CONSTRAINT "packtracker_member_role_assignments_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_member_role_assignments" ADD CONSTRAINT "packtracker_member_role_assignments_admin_role_id_fkey" FOREIGN KEY ("admin_role_id") REFERENCES "packtracker_admin_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_member_role_assignments" ADD CONSTRAINT "packtracker_member_role_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_admin_audit_logs" ADD CONSTRAINT "packtracker_admin_audit_logs_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packtracker_discord_integration_settings" ADD CONSTRAINT "packtracker_discord_settings_updated_by_fkey" FOREIGN KEY ("updated_by_profile_id") REFERENCES "packtracker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
