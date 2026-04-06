# Решение проблемы с failed миграцией

## Шаг 1: Проверьте текущее состояние базы данных

Подключитесь к MySQL и выполните:
```sql
SHOW COLUMNS FROM audit_logs WHERE Field = 'actionType';
```

## Шаг 2: В зависимости от результата

### Если actionType = VARCHAR(191)
Миграция частично выполнилась. Выполните оставшиеся шаги вручную:

```sql
-- Обновите невалидные значения
UPDATE `audit_logs` 
SET `actionType` = 'SCRIPT_SETTINGS_UPDATE' 
WHERE `actionType` IN ('SCHEDULED_TASK_CREATE', 'SCHEDULED_TASK_UPDATE', 'SCHEDULED_TASK_DELETE', 'SCHEDULED_TASK_RUN');

-- Измените обратно на ENUM с новыми значениями
ALTER TABLE `audit_logs` MODIFY `actionType` ENUM('LOGIN', 'LOGOUT', 'REGISTER', 'SCRIPT_CREATE', 'SCRIPT_DELETE', 'SCRIPT_START', 'SCRIPT_STOP', 'SCRIPT_RESTART', 'SCRIPT_DEPLOY', 'SCRIPT_EXPIRED', 'SCRIPT_ISSUE', 'SCRIPT_REVOKE', 'SCRIPT_EXTEND', 'SCRIPT_ACCESS_GRANT', 'SCRIPT_ACCESS_REVOKE', 'SERVER_ADD', 'SERVER_UPDATE', 'SERVER_DELETE', 'SERVER_TEST_CONNECTION', 'SERVER_KEY_ADD', 'SERVER_KEY_DELETE', 'SERVER_KEY_UPDATE', 'USER_BLOCK', 'USER_UNBLOCK', 'USER_ROLE_CHANGE', 'SCRIPT_SETTINGS_UPDATE', 'NEWS_CREATE', 'NEWS_UPDATE', 'NEWS_DELETE', 'SCHEDULED_TASK_CREATE', 'SCHEDULED_TASK_UPDATE', 'SCHEDULED_TASK_DELETE', 'SCHEDULED_TASK_RUN') NOT NULL;
```

Затем пометьте миграцию как применённую:
```bash
cd backend
npx prisma migrate resolve --applied 20251208000000_add_scheduled_task_actions
```

### Если actionType = ENUM (старый)
Миграция не выполнилась. Откатите её и примените заново:

```bash
cd backend
npx prisma migrate resolve --rolled-back 20251208000000_add_scheduled_task_actions
npx prisma migrate deploy
```

### Если actionType = ENUM (новый, с SCHEDULED_TASK_*)
Миграция уже применена, просто пометьте её:
```bash
cd backend
npx prisma migrate resolve --applied 20251208000000_add_scheduled_task_actions
```

## Шаг 3: Перегенерируйте Prisma Client

```bash
cd backend
npx prisma generate
```

## Альтернатива: Ручное применение всей миграции

Если ничего не помогает, выполните весь SQL из `migration.sql` вручную через MySQL клиент, затем:

```bash
cd backend
npx prisma migrate resolve --applied 20251208000000_add_scheduled_task_actions
npx prisma generate
```











