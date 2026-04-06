-- Удаление CUSTOM из enum ScheduledTaskType

-- Шаг 1: Обновляем все задачи с типом CUSTOM на HEALTH_CHECK (или удаляем их)
-- Если есть задачи с типом CUSTOM, их нужно обновить или удалить
UPDATE `scheduled_tasks`
SET `taskType` = 'HEALTH_CHECK'
WHERE `taskType` = 'CUSTOM';

-- Шаг 2: Временно изменяем тип колонки на VARCHAR для безопасного изменения enum
ALTER TABLE `scheduled_tasks` MODIFY `taskType` VARCHAR(191) NOT NULL;

-- Шаг 3: Изменяем обратно на ENUM без CUSTOM
ALTER TABLE `scheduled_tasks` MODIFY `taskType` ENUM('CHECK_AUTO_UPDATE', 'CHECK_SCRIPT_EXPIRY', 'AUTO_RELOAD_SCRIPTS', 'CLEANUP_OLD_LOGS', 'BACKUP_DATABASE', 'HEALTH_CHECK') NOT NULL;


