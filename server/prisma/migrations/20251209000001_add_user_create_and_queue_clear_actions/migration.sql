-- Step 1: Temporarily change actionType from ENUM to VARCHAR to allow adding new enum values
ALTER TABLE `audit_logs` MODIFY `actionType` VARCHAR(191) NOT NULL;

-- Step 2: Update any invalid actionType values to a temporary valid value (if any exist)
-- This handles cases where USER_CREATE or QUEUE_CLEAR values were already inserted
UPDATE `audit_logs`
SET `actionType` = 'SCRIPT_SETTINGS_UPDATE'
WHERE `actionType` = 'USER_CREATE'
   OR `actionType` = 'QUEUE_CLEAR';

-- Step 3: Now we can safely alter back to ENUM with new values included
ALTER TABLE `audit_logs` MODIFY `actionType` ENUM('LOGIN', 'LOGOUT', 'REGISTER', 'SCRIPT_CREATE', 'SCRIPT_DELETE', 'SCRIPT_START', 'SCRIPT_STOP', 'SCRIPT_RESTART', 'SCRIPT_DEPLOY', 'SCRIPT_EXPIRED', 'SCRIPT_ISSUE', 'SCRIPT_REVOKE', 'SCRIPT_EXTEND', 'SCRIPT_ACCESS_GRANT', 'SCRIPT_ACCESS_REVOKE', 'SERVER_ADD', 'SERVER_UPDATE', 'SERVER_DELETE', 'SERVER_TEST_CONNECTION', 'SERVER_KEY_ADD', 'SERVER_KEY_DELETE', 'SERVER_KEY_UPDATE', 'USER_CREATE', 'USER_BLOCK', 'USER_UNBLOCK', 'USER_ROLE_CHANGE', 'USER_PASSWORD_CHANGE', 'SCRIPT_SETTINGS_UPDATE', 'NEWS_CREATE', 'NEWS_UPDATE', 'NEWS_DELETE', 'SCHEDULED_TASK_CREATE', 'SCHEDULED_TASK_UPDATE', 'SCHEDULED_TASK_DELETE', 'SCHEDULED_TASK_RUN', 'QUEUE_CLEAR') NOT NULL;

-- Step 4: Restore the correct actionType values (if any were updated in step 2)
-- Restore USER_CREATE
UPDATE `audit_logs`
SET `actionType` = 'USER_CREATE'
WHERE `actionType` = 'SCRIPT_SETTINGS_UPDATE'
  AND JSON_EXTRACT(`details`, '$.email') IS NOT NULL
  AND JSON_EXTRACT(`details`, '$.username') IS NOT NULL
  AND JSON_EXTRACT(`details`, '$.role') IS NOT NULL;

-- Restore QUEUE_CLEAR
UPDATE `audit_logs`
SET `actionType` = 'QUEUE_CLEAR'
WHERE `actionType` = 'SCRIPT_SETTINGS_UPDATE'
  AND JSON_EXTRACT(`details`, '$.removed') IS NOT NULL;


