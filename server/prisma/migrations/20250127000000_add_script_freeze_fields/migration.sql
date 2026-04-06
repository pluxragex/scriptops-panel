-- Add freeze fields to scripts table
ALTER TABLE `scripts`
  ADD COLUMN `frozenAt` DATETIME(3) NULL,
  ADD COLUMN `frozenUntil` DATETIME(3) NULL,
  ADD COLUMN `ownerFrozenOnce` BOOLEAN NOT NULL DEFAULT FALSE;

-- Add SCRIPT_FREEZE to ActionType enum
-- Step 1: Temporarily change actionType from ENUM to VARCHAR to allow adding new enum values
ALTER TABLE `audit_logs` MODIFY `actionType` VARCHAR(191) NOT NULL;

-- Step 2: Update any invalid actionType values to a temporary valid value (if any exist)
UPDATE `audit_logs`
SET `actionType` = 'SCRIPT_SETTINGS_UPDATE'
WHERE `actionType` = 'SCRIPT_FREEZE';

-- Step 3: Now we can safely alter back to ENUM with new values included
ALTER TABLE `audit_logs` MODIFY `actionType` ENUM('LOGIN', 'LOGOUT', 'REGISTER', 'SCRIPT_CREATE', 'SCRIPT_DELETE', 'SCRIPT_START', 'SCRIPT_STOP', 'SCRIPT_RESTART', 'SCRIPT_DEPLOY', 'SCRIPT_EXPIRED', 'SCRIPT_ISSUE', 'SCRIPT_REVOKE', 'SCRIPT_EXTEND', 'SCRIPT_FREEZE', 'SCRIPT_UNFREEZE', 'SCRIPT_ACCESS_GRANT', 'SCRIPT_ACCESS_REVOKE', 'SERVER_ADD', 'SERVER_UPDATE', 'SERVER_DELETE', 'SERVER_TEST_CONNECTION', 'SERVER_KEY_ADD', 'SERVER_KEY_DELETE', 'SERVER_KEY_UPDATE', 'USER_CREATE', 'USER_BLOCK', 'USER_UNBLOCK', 'USER_ROLE_CHANGE', 'USER_PASSWORD_CHANGE', 'SCRIPT_SETTINGS_UPDATE', 'NEWS_CREATE', 'NEWS_UPDATE', 'NEWS_DELETE', 'SCHEDULED_TASK_CREATE', 'SCHEDULED_TASK_UPDATE', 'SCHEDULED_TASK_DELETE', 'SCHEDULED_TASK_RUN', 'QUEUE_CLEAR') NOT NULL;

-- Step 4: Restore the correct actionType values (if any were updated in step 2)
UPDATE `audit_logs`
SET `actionType` = 'SCRIPT_FREEZE'
WHERE `actionType` = 'SCRIPT_SETTINGS_UPDATE'
  AND JSON_EXTRACT(`details`, '$.frozenAt') IS NOT NULL;

-- Restore SCRIPT_UNFREEZE
UPDATE `audit_logs`
SET `actionType` = 'SCRIPT_UNFREEZE'
WHERE `actionType` = 'SCRIPT_SETTINGS_UPDATE'
  AND JSON_EXTRACT(`details`, '$.unfrozenAt') IS NOT NULL;

