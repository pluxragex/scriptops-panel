-- CreateEnum: Создание enum для статусов pending action
-- MySQL не поддерживает ENUM напрямую, используем VARCHAR с CHECK constraint
-- Но для совместимости просто используем VARCHAR

-- CreateTable: Таблица pending_actions
CREATE TABLE `pending_actions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `actionToken` VARCHAR(191) NOT NULL,
    `actionType` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pending_actions_actionToken_key`(`actionToken`),
    INDEX `pending_actions_userId_idx`(`userId`),
    INDEX `pending_actions_actionToken_idx`(`actionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pending_actions` ADD CONSTRAINT `pending_actions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

