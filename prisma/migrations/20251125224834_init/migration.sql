-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "discord_id" TEXT NOT NULL,
    "discord_username" TEXT NOT NULL,
    "discord_display_name" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discord_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" INTEGER,
    "position" INTEGER,
    "is_managed" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "discord_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "discord_role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","discord_role_id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "discord_role_id" TEXT NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("discord_role_id","permission_id")
);

-- CreateTable
CREATE TABLE "divisions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subdivisions" (
    "id" SERIAL NOT NULL,
    "division_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subdivisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranks" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_leadership_core" BOOLEAN NOT NULL DEFAULT false,
    "is_officer_core" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "division_allowed_roles" (
    "division_id" INTEGER NOT NULL,
    "discord_role_id" TEXT NOT NULL,

    CONSTRAINT "division_allowed_roles_pkey" PRIMARY KEY ("division_id","discord_role_id")
);

-- CreateTable
CREATE TABLE "subdivision_allowed_roles" (
    "subdivision_id" INTEGER NOT NULL,
    "discord_role_id" TEXT NOT NULL,

    CONSTRAINT "subdivision_allowed_roles_pkey" PRIMARY KEY ("subdivision_id","discord_role_id")
);

-- CreateTable
CREATE TABLE "mercenary_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "character_name" TEXT NOT NULL,
    "rank_id" INTEGER,
    "division_id" INTEGER NOT NULL,
    "subdivision_id" INTEGER,
    "portrait_url" TEXT,
    "bio" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "last_submitted_at" TIMESTAMPTZ,
    "approved_at" TIMESTAMPTZ,
    "approved_by" UUID,
    "rejected_at" TIMESTAMPTZ,
    "rejected_by" UUID,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mercenary_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mercenary_profile_approval_history" (
    "id" SERIAL NOT NULL,
    "profile_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mercenary_profile_approval_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "marketplace_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" UUID NOT NULL,
    "seller_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT,
    "status" TEXT NOT NULL,
    "discord_thread_id" TEXT,
    "discord_channel_id" TEXT,
    "expires_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listing_images" (
    "id" SERIAL NOT NULL,
    "listing_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_listing_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_user_status" (
    "user_id" UUID NOT NULL,
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "suspended_by" UUID,
    "suspended_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "marketplace_user_status_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "marketplace_listing_audit_log" (
    "id" SERIAL NOT NULL,
    "listing_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_listing_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_discord_id_key" ON "users"("discord_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "divisions_slug_key" ON "divisions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subdivisions_slug_key" ON "subdivisions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ranks_slug_key" ON "ranks"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_categories_slug_key" ON "marketplace_categories"("slug");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_discord_role_id_fkey" FOREIGN KEY ("discord_role_id") REFERENCES "discord_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_discord_role_id_fkey" FOREIGN KEY ("discord_role_id") REFERENCES "discord_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subdivisions" ADD CONSTRAINT "subdivisions_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "division_allowed_roles" ADD CONSTRAINT "division_allowed_roles_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "division_allowed_roles" ADD CONSTRAINT "division_allowed_roles_discord_role_id_fkey" FOREIGN KEY ("discord_role_id") REFERENCES "discord_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subdivision_allowed_roles" ADD CONSTRAINT "subdivision_allowed_roles_subdivision_id_fkey" FOREIGN KEY ("subdivision_id") REFERENCES "subdivisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subdivision_allowed_roles" ADD CONSTRAINT "subdivision_allowed_roles_discord_role_id_fkey" FOREIGN KEY ("discord_role_id") REFERENCES "discord_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mercenary_profiles" ADD CONSTRAINT "mercenary_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mercenary_profiles" ADD CONSTRAINT "mercenary_profiles_rank_id_fkey" FOREIGN KEY ("rank_id") REFERENCES "ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mercenary_profiles" ADD CONSTRAINT "mercenary_profiles_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mercenary_profiles" ADD CONSTRAINT "mercenary_profiles_subdivision_id_fkey" FOREIGN KEY ("subdivision_id") REFERENCES "subdivisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mercenary_profiles" ADD CONSTRAINT "mercenary_profiles_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mercenary_profiles" ADD CONSTRAINT "mercenary_profiles_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mercenary_profile_approval_history" ADD CONSTRAINT "mercenary_profile_approval_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "mercenary_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mercenary_profile_approval_history" ADD CONSTRAINT "mercenary_profile_approval_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_categories" ADD CONSTRAINT "marketplace_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "marketplace_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "marketplace_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listing_images" ADD CONSTRAINT "marketplace_listing_images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_user_status" ADD CONSTRAINT "marketplace_user_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_user_status" ADD CONSTRAINT "marketplace_user_status_suspended_by_fkey" FOREIGN KEY ("suspended_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listing_audit_log" ADD CONSTRAINT "marketplace_listing_audit_log_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listing_audit_log" ADD CONSTRAINT "marketplace_listing_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
