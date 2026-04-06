-- CreateEnum
CREATE TABLE IF NOT EXISTS `scheduled_tasks` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT,
  `taskType` ENUM('CHECK_AUTO_UPDATE', 'CHECK_SCRIPT_EXPIRY', 'AUTO_RELOAD_SCRIPTS', 'CLEANUP_OLD_LOGS', 'BACKUP_DATABASE', 'HEALTH_CHECK', 'CUSTOM') NOT NULL,
  `cronExpression` VARCHAR(191) NOT NULL,
  `timezone` VARCHAR(191) NOT NULL DEFAULT 'Europe/Moscow',
  `parameters` JSON,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `isRunning` BOOLEAN NOT NULL DEFAULT false,
  `lastRunAt` DATETIME(3),
  `lastRunStatus` VARCHAR(191),
  `lastRunError` TEXT,
  `runCount` INTEGER NOT NULL DEFAULT 0,
  `failCount` INTEGER NOT NULL DEFAULT 0,
  `nextRunAt` DATETIME(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `createdBy` VARCHAR(191),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `scheduled_tasks_taskType_idx` ON `scheduled_tasks`(`taskType`);
CREATE INDEX `scheduled_tasks_isActive_idx` ON `scheduled_tasks`(`isActive`);
CREATE INDEX `scheduled_tasks_nextRunAt_idx` ON `scheduled_tasks`(`nextRunAt`);


