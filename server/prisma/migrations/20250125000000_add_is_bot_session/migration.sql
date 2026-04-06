-- AlterTable: Добавление поля isBotSession в таблицу sessions
ALTER TABLE `sessions` ADD COLUMN `isBotSession` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Индекс для быстрого поиска сессий бота по пользователю
CREATE INDEX `sessions_userId_isBotSession_idx` ON `sessions`(`userId`, `isBotSession`);


