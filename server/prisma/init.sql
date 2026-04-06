-- Инициализация базы данных для 222prod.cc

-- Создание базы данных если не существует
CREATE DATABASE IF NOT EXISTS discord_scripts CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Использование базы данных
USE discord_scripts;

-- Создание пользователя для приложения
CREATE USER IF NOT EXISTS 'app_user'@'%' IDENTIFIED BY 'app_password';
GRANT ALL PRIVILEGES ON discord_scripts.* TO 'app_user'@'%';

-- Применение привилегий
FLUSH PRIVILEGES;
