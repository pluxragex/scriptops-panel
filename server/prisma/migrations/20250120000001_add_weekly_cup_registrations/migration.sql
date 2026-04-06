-- CreateTable
CREATE TABLE `weekly_cup_registrations` (
    `id` VARCHAR(191) NOT NULL,
    `scriptId` VARCHAR(191) NOT NULL,
    `targetChannelId` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `originalChannelId` VARCHAR(191) NULL,
    `originalMessageId` VARCHAR(191) NULL,
    `isSent` BOOLEAN NOT NULL DEFAULT false,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `weekly_cup_registrations_scriptId_isSent_idx`(`scriptId`, `isSent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `weekly_cup_registrations` ADD CONSTRAINT `weekly_cup_registrations_scriptId_fkey` FOREIGN KEY (`scriptId`) REFERENCES `scripts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

