# Исправление failed миграции

Миграция упала и помечена как failed. Выполните следующие шаги:

## Вариант 1: Если миграция частично выполнилась (actionType уже VARCHAR)

1. Проверьте текущий тип колонки:
```sql
SHOW COLUMNS FROM audit_logs WHERE Field = 'actionType';
```

2. Если тип VARCHAR, выполните SQL вручную:
```sql
-- Обновите невалидные значения
UPDATE `audit_logs` 
SET `actionType` = 'SCRIPT_SETTINGS_UPDATE' 
WHERE `actionType` IN ('SCHEDULED_TASK_CREATE', 'SCHEDULED_TASK_UPDATE', 'SCHEDULED_TASK_DELETE', 'SCHEDULED_TASK_RUN');

-- Измените обратно на ENUM с новыми значениями
ALTER TABLE `audit_logs` MODIFY `actionType` ENUM('LOGIN', 'LOGOUT', 'REGISTER', 'SCRIPT_CREATE', 'SCRIPT_DELETE', 'SCRIPT_START', 'SCRIPT_STOP', 'SCRIPT_RESTART', 'SCRIPT_DEPLOY', 'SCRIPT_EXPIRED', 'SCRIPT_ISSUE', 'SCRIPT_REVOKE', 'SCRIPT_EXTEND', 'SCRIPT_ACCESS_GRANT', 'SCRIPT_ACCESS_REVOKE', 'SERVER_ADD', 'SERVER_UPDATE', 'SERVER_DELETE', 'SERVER_TEST_CONNECTION', 'SERVER_KEY_ADD', 'SERVER_KEY_DELETE', 'SERVER_KEY_UPDATE', 'USER_BLOCK', 'USER_UNBLOCK', 'USER_ROLE_CHANGE', 'SCRIPT_SETTINGS_UPDATE', 'NEWS_CREATE', 'NEWS_UPDATE', 'NEWS_DELETE', 'SCHEDULED_TASK_CREATE', 'SCHEDULED_TASK_UPDATE', 'SCHEDULED_TASK_DELETE', 'SCHEDULED_TASK_RUN') NOT NULL;

-- Восстановите правильные значения (опционально, если нужно)
-- См. остальные UPDATE запросы в migration.sql
```

3. Пометить миграцию как применённую:
```bash
npx prisma migrate resolve --applied 20251208000000_add_scheduled_task_actions
```

## Вариант 2: Если миграция не выполнилась (actionType всё ещё ENUM)

1. Откатите failed миграцию:
```bash
npx prisma migrate resolve --rolled-back 20251208000000_add_scheduled_task_actions
```

2. Примените исправленную миграцию вручную через SQL или используйте упрощённую версию.

## Вариант 3: Ручное применение (рекомендуется для продакшена)

Выполните SQL из migration.sql вручную через MySQL клиент, затем:
```bash
npx prisma migrate resolve --applied 20251208000000_add_scheduled_task_actions
```











