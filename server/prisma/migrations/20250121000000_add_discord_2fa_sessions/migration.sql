-- AlterTable: Добавление полей Discord
ALTER TABLE `users` ADD COLUMN `discordUserId` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN `discordUsername` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN `discordAvatar` VARCHAR(191) NULL;

-- CreateIndex: Уникальный индекс для Discord User ID
CREATE UNIQUE INDEX `users_discordUserId_key` ON `users`(`discordUserId`);

-- AlterTable: Добавление полей 2FA
ALTER TABLE `users` ADD COLUMN `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `users` ADD COLUMN `twoFactorSecret` VARCHAR(191) NULL;

-- CreateTable: Таблица сессий
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `deviceInfo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastActivityAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sessions_tokenHash_key`(`tokenHash`),
    INDEX `sessions_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

