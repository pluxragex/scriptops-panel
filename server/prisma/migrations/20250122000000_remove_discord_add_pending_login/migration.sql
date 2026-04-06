-- RemoveDiscord: Удаление полей Discord из users
ALTER TABLE `users` DROP INDEX `users_discordUserId_key`;
ALTER TABLE `users` DROP COLUMN `discordUserId`;
ALTER TABLE `users` DROP COLUMN `discordUsername`;
ALTER TABLE `users` DROP COLUMN `discordAvatar`;

-- CreateEnum: Создание enum для статусов pending login
-- MySQL не поддерживает ENUM напрямую, используем VARCHAR с CHECK constraint
-- Но для совместимости просто используем VARCHAR

-- CreateTable: Таблица pending_logins
CREATE TABLE `pending_logins` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `loginToken` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `deviceInfo` VARCHAR(191) NULL,
    `method` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pending_logins_loginToken_key`(`loginToken`),
    INDEX `pending_logins_userId_idx`(`userId`),
    INDEX `pending_logins_loginToken_idx`(`loginToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pending_logins` ADD CONSTRAINT `pending_logins_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

