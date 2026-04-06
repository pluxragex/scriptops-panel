-- Step 1: Temporarily change actionType from ENUM to VARCHAR to allow invalid values
-- This allows us to update records with invalid enum values
ALTER TABLE `audit_logs` MODIFY `actionType` VARCHAR(191) NOT NULL;

-- Step 2: Update any invalid actionType values to a temporary valid value
-- This handles cases where SCHEDULED_TASK_* values were already inserted
-- We need to check for these values as strings since we're now in VARCHAR mode
UPDATE `audit_logs`
SET `actionType` = 'SCRIPT_SETTINGS_UPDATE'
WHERE `actionType` = 'SCHEDULED_TASK_CREATE'
   OR `actionType` = 'SCHEDULED_TASK_UPDATE'
   OR `actionType` = 'SCHEDULED_TASK_DELETE'
   OR `actionType` = 'SCHEDULED_TASK_RUN';

-- Step 3: Verify no invalid values remain (safety check)
-- If there are any other unexpected values, update them too
UPDATE `audit_logs`
SET `actionType` = 'SCRIPT_SETTINGS_UPDATE'
WHERE `actionType` NOT IN (
  'LOGIN', 'LOGOUT', 'REGISTER', 'SCRIPT_CREATE', 'SCRIPT_DELETE', 'SCRIPT_START',
  'SCRIPT_STOP', 'SCRIPT_RESTART', 'SCRIPT_DEPLOY', 'SCRIPT_EXPIRED', 'SCRIPT_ISSUE',
  'SCRIPT_REVOKE', 'SCRIPT_EXTEND', 'SCRIPT_ACCESS_GRANT', 'SCRIPT_ACCESS_REVOKE',
  'SERVER_ADD', 'SERVER_UPDATE', 'SERVER_DELETE', 'SERVER_TEST_CONNECTION',
  'SERVER_KEY_ADD', 'SERVER_KEY_DELETE', 'SERVER_KEY_UPDATE', 'USER_BLOCK',
  'USER_UNBLOCK', 'USER_ROLE_CHANGE', 'SCRIPT_SETTINGS_UPDATE', 'NEWS_CREATE',
  'NEWS_UPDATE', 'NEWS_DELETE'
);

-- Step 4: Now we can safely alter back to ENUM with new values included
ALTER TABLE `audit_logs` MODIFY `actionType` ENUM('LOGIN', 'LOGOUT', 'REGISTER', 'SCRIPT_CREATE', 'SCRIPT_DELETE', 'SCRIPT_START', 'SCRIPT_STOP', 'SCRIPT_RESTART', 'SCRIPT_DEPLOY', 'SCRIPT_EXPIRED', 'SCRIPT_ISSUE', 'SCRIPT_REVOKE', 'SCRIPT_EXTEND', 'SCRIPT_ACCESS_GRANT', 'SCRIPT_ACCESS_REVOKE', 'SERVER_ADD', 'SERVER_UPDATE', 'SERVER_DELETE', 'SERVER_TEST_CONNECTION', 'SERVER_KEY_ADD', 'SERVER_KEY_DELETE', 'SERVER_KEY_UPDATE', 'USER_BLOCK', 'USER_UNBLOCK', 'USER_ROLE_CHANGE', 'SCRIPT_SETTINGS_UPDATE', 'NEWS_CREATE', 'NEWS_UPDATE', 'NEWS_DELETE', 'SCHEDULED_TASK_CREATE', 'SCHEDULED_TASK_UPDATE', 'SCHEDULED_TASK_DELETE', 'SCHEDULED_TASK_RUN') NOT NULL;

-- Step 4: Restore the correct actionType values based on details JSON field
-- Restore SCHEDULED_TASK_CREATE
UPDATE `audit_logs`
SET `actionType` = 'SCHEDULED_TASK_CREATE'
WHERE `actionType` = 'SCRIPT_SETTINGS_UPDATE'
  AND JSON_EXTRACT(`details`, '$.taskName') IS NOT NULL
  AND JSON_EXTRACT(`details`, '$.taskType') IS NOT NULL
  AND JSON_EXTRACT(`details`, '$.changes') IS NULL
  AND (JSON_EXTRACT(`details`, '$.manual') IS NULL OR JSON_EXTRACT(`details`, '$.manual') = false);

-- Restore SCHEDULED_TASK_UPDATE
UPDATE `audit_logs`
SET `actionType` = 'SCHEDULED_TASK_UPDATE'
WHERE `actionType` = 'SCRIPT_SETTINGS_UPDATE'
  AND JSON_EXTRACT(`details`, '$.taskName') IS NOT NULL
  AND JSON_EXTRACT(`details`, '$.changes') IS NOT NULL;

-- Restore SCHEDULED_TASK_DELETE
UPDATE `audit_logs`
SET `actionType` = 'SCHEDULED_TASK_DELETE'
WHERE `actionType` = 'SCRIPT_SETTINGS_UPDATE'
  AND JSON_EXTRACT(`details`, '$.taskName') IS NOT NULL
  AND JSON_EXTRACT(`details`, '$.changes') IS NULL
  AND (JSON_EXTRACT(`details`, '$.manual') IS NULL OR JSON_EXTRACT(`details`, '$.manual') = false)
  AND (`details` LIKE '%delete%' OR `details` LIKE '%DELETE%' OR `details` LIKE '%SCHEDULED_TASK_DELETE%');

-- Restore SCHEDULED_TASK_RUN
UPDATE `audit_logs`
SET `actionType` = 'SCHEDULED_TASK_RUN'
WHERE `actionType` = 'SCRIPT_SETTINGS_UPDATE'
  AND JSON_EXTRACT(`details`, '$.taskName') IS NOT NULL
  AND JSON_EXTRACT(`details`, '$.manual') = true;

