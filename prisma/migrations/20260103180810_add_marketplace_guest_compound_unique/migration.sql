/*
  Warnings:

  - A unique constraint covering the columns `[discord_user_id,guild_id]` on the table `marketplace_guests` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "marketplace_guests_discord_user_id_guild_id_key" ON "marketplace_guests"("discord_user_id", "guild_id");
