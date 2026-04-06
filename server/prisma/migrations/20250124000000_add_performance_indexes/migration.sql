-- AddPerformanceIndexes: Добавление индексов для улучшения производительности запросов

-- Индексы для таблицы scripts
CREATE INDEX `scripts_ownerId_idx` ON `scripts`(`ownerId`);
CREATE INDEX `scripts_serverId_idx` ON `scripts`(`serverId`);
CREATE INDEX `scripts_status_idx` ON `scripts`(`status`);
CREATE INDEX `scripts_expiryDate_idx` ON `scripts`(`expiryDate`);
CREATE INDEX `scripts_createdAt_idx` ON `scripts`(`createdAt`);

-- Индексы для таблицы deployments
CREATE INDEX `deployments_scriptId_idx` ON `deployments`(`scriptId`);
CREATE INDEX `deployments_status_idx` ON `deployments`(`status`);
CREATE INDEX `deployments_createdAt_idx` ON `deployments`(`createdAt`);

-- Индексы для таблицы audit_logs
CREATE INDEX `audit_logs_actorId_idx` ON `audit_logs`(`actorId`);
CREATE INDEX `audit_logs_targetScriptId_idx` ON `audit_logs`(`targetScriptId`);
CREATE INDEX `audit_logs_actionType_idx` ON `audit_logs`(`actionType`);
CREATE INDEX `audit_logs_createdAt_idx` ON `audit_logs`(`createdAt`);

-- Индексы для таблицы news
CREATE INDEX `news_isPublished_idx` ON `news`(`isPublished`);
CREATE INDEX `news_isFeatured_idx` ON `news`(`isFeatured`);
CREATE INDEX `news_publishedAt_idx` ON `news`(`publishedAt`);
CREATE INDEX `news_slug_idx` ON `news`(`slug`);


