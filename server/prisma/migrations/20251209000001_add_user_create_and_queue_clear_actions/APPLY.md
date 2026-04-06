# Применение миграции: добавление USER_CREATE и QUEUE_CLEAR

## Проблема
В enum `ActionType` отсутствуют значения `USER_CREATE` и `QUEUE_CLEAR`, что вызывает ошибки при логировании действий.

## Решение

### Вариант 1: Автоматическое применение (рекомендуется)

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### Вариант 2: Ручное применение через MySQL

Если автоматическое применение не работает, выполните SQL вручную:

1. **Подключитесь к MySQL:**
```bash
mysql -u your_user -p your_database
```

2. **Выполните SQL из файла `migration.sql`**

3. **Пометьте миграцию как применённую:**
```bash
cd backend
npx prisma migrate resolve --applied 20251209000001_add_user_create_and_queue_clear_actions
```

4. **Перегенерируйте Prisma Client:**
```bash
npx prisma generate
```

### Вариант 3: Быстрое исправление (если миграция уже частично применена)

Если `actionType` уже VARCHAR(191):

1. Выполните только шаги 2-4 из `migration.sql` (UPDATE и ALTER TABLE)
2. Пометьте миграцию как применённую
3. Перегенерируйте Prisma Client

## Проверка

После применения миграции проверьте:

1. **Проверьте структуру enum в базе данных:**
```sql
SHOW COLUMNS FROM audit_logs WHERE Field = 'actionType';
```

Должно быть: `ENUM(..., 'USER_CREATE', ..., 'QUEUE_CLEAR')`

2. **Перезапустите backend:**
```bash
# Остановите текущий процесс и запустите заново
npm run start:prod
# или
npm run start:dev
```

3. **Проверьте логи:**
   - Не должно быть ошибок про `Invalid value for argument 'actionType'`
   - Попробуйте создать пользователя или очистить очереди через админ-панель

## Откат (если что-то пошло не так)

Если нужно откатить миграцию:

```sql
-- Вернуть enum к предыдущему состоянию (без USER_CREATE и QUEUE_CLEAR)
ALTER TABLE `audit_logs` MODIFY `actionType` ENUM('LOGIN', 'LOGOUT', 'REGISTER', 'SCRIPT_CREATE', 'SCRIPT_DELETE', 'SCRIPT_START', 'SCRIPT_STOP', 'SCRIPT_RESTART', 'SCRIPT_DEPLOY', 'SCRIPT_EXPIRED', 'SCRIPT_ISSUE', 'SCRIPT_REVOKE', 'SCRIPT_EXTEND', 'SCRIPT_ACCESS_GRANT', 'SCRIPT_ACCESS_REVOKE', 'SERVER_ADD', 'SERVER_UPDATE', 'SERVER_DELETE', 'SERVER_TEST_CONNECTION', 'SERVER_KEY_ADD', 'SERVER_KEY_DELETE', 'SERVER_KEY_UPDATE', 'USER_BLOCK', 'USER_UNBLOCK', 'USER_ROLE_CHANGE', 'USER_PASSWORD_CHANGE', 'SCRIPT_SETTINGS_UPDATE', 'NEWS_CREATE', 'NEWS_UPDATE', 'NEWS_DELETE', 'SCHEDULED_TASK_CREATE', 'SCHEDULED_TASK_UPDATE', 'SCHEDULED_TASK_DELETE', 'SCHEDULED_TASK_RUN') NOT NULL;

-- Обновить существующие записи
UPDATE `audit_logs` 
SET `actionType` = 'SCRIPT_SETTINGS_UPDATE' 
WHERE `actionType` IN ('USER_CREATE', 'QUEUE_CLEAR');
```

Затем пометьте миграцию как откаченную:
```bash
npx prisma migrate resolve --rolled-back 20251209000001_add_user_create_and_queue_clear_actions
```




