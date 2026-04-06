-- AlterTable
ALTER TABLE `users` ADD COLUMN `telegramUserId` INT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_telegramUserId_key` ON `users`(`telegramUserId`);

