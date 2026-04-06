
import { useState, useEffect } from 'react'

export type Language = 'ru' | 'en'

interface Translations {
  [key: string]: {
    ru: string
    en: string
  }
}

const translations: Translations = {

  'nav.home': { ru: 'Главная', en: 'Home' },
  'nav.scripts': { ru: 'Скрипты', en: 'Scripts' },
  'nav.news': { ru: 'Новости', en: 'News' },
  'nav.profile': { ru: 'Профиль', en: 'Profile' },
  'nav.admin': { ru: 'Админ-панель', en: 'Admin Panel' },
  'nav.administration': { ru: 'Администрирование', en: 'Administration' },


  'common.cancel': { ru: 'Отмена', en: 'Cancel' },
  'common.close': { ru: 'Закрыть', en: 'Close' },
  'common.save': { ru: 'Сохранить', en: 'Save' },
  'common.delete': { ru: 'Удалить', en: 'Delete' },
  'common.edit': { ru: 'Редактировать', en: 'Edit' },
  'common.create': { ru: 'Создать', en: 'Create' },
  'common.back': { ru: 'Назад', en: 'Back' },
  'common.next': { ru: 'Далее', en: 'Next' },
  'common.submit': { ru: 'Отправить', en: 'Submit' },
  'common.loading': { ru: 'Загрузка...', en: 'Loading...' },
  'common.error': { ru: 'Ошибка', en: 'Error' },
  'common.success': { ru: 'Успешно', en: 'Success' },
  'common.status': { ru: 'Статус', en: 'Status' },


  'freeze.title': { ru: 'Заморозить подписку', en: 'Freeze Subscription' },
  'freeze.unfreeze.title': { ru: 'Разморозить подписку', en: 'Unfreeze Subscription' },
  'freeze.script': { ru: 'Скрипт', en: 'Script' },
  'freeze.warning.title': { ru: 'Внимание!', en: 'Warning!' },
  'freeze.warning.1': { ru: 'Скрипт можно замораживать только 1 раз на период всей подписки', en: 'Script can only be frozen once during the entire subscription period' },
  'freeze.warning.2': { ru: 'Во время заморозки время подписки не будет убавляться', en: 'During freeze, subscription time will not decrease' },
  'freeze.warning.3': { ru: 'Лимит сбросится только при обновлении срока действия администратором', en: 'Limit will reset only when admin updates expiration date' },
  'freeze.warning.4': { ru: 'Вы сможете заморозить скрипт только один раз!', en: 'You can only freeze the script once!' },
  'freeze.info.title': { ru: 'Что происходит при заморозке:', en: 'What happens when freezing:' },
  'freeze.info.1': { ru: 'Подписка будет заморожена бессрочно', en: 'Subscription will be frozen indefinitely' },
  'freeze.info.2': { ru: 'Время подписки перестанет убавляться', en: 'Subscription time will stop decreasing' },
  'freeze.info.3': { ru: 'Скрипт будет автоматически остановлен на сервере', en: 'Script will be automatically stopped on server' },
  'freeze.info.4': { ru: 'Скрипт нельзя будет запустить до разморозки', en: 'Script cannot be started until unfrozen' },
  'freeze.unfreeze.info.title': { ru: 'Что происходит при разморозке:', en: 'What happens when unfreezing:' },
  'freeze.unfreeze.info.1': { ru: 'Подписка будет разморожена', en: 'Subscription will be unfrozen' },
  'freeze.unfreeze.info.2': { ru: 'Время подписки снова начнет убавляться', en: 'Subscription time will start decreasing again' },
  'freeze.unfreeze.info.3': { ru: 'Скрипт можно будет запустить в панели управления', en: 'Script can be started in control panel' },
  'freeze.button.freeze': { ru: 'Заморозить', en: 'Freeze' },
  'freeze.button.unfreeze': { ru: 'Разморозить', en: 'Unfreeze' },
  'freeze.button.freezing': { ru: 'Заморозка...', en: 'Freezing...' },
  'freeze.button.unfreezing': { ru: 'Разморозка...', en: 'Unfreezing...' },
  'freeze.settings.for': { ru: 'Настройки для скрипта', en: 'Settings for script' },
  'freeze.success.frozen': { ru: 'Подписка успешно заморожена', en: 'Subscription successfully frozen' },
  'freeze.success.unfrozen': { ru: 'Подписка успешно разморожена', en: 'Subscription successfully unfrozen' },


  'header.profile': { ru: 'Профиль', en: 'Profile' },
  'header.logout': { ru: 'Выйти', en: 'Logout' },
  'header.language': { ru: 'Язык', en: 'Language' },


  'dashboard.welcome': { ru: 'Добро пожаловать', en: 'Welcome' },
  'dashboard.manage': { ru: 'Управляйте вашими Discord скриптами и ботами', en: 'Manage your Discord scripts and bots' },
  'dashboard.totalScripts': { ru: 'Всего скриптов', en: 'Total Scripts' },
  'dashboard.running': { ru: 'Запущено', en: 'Running' },
  'dashboard.deployments': { ru: 'Деплойментов', en: 'Deployments' },
  'dashboard.recentScripts': { ru: 'Последние скрипты', en: 'Recent Scripts' },
  'dashboard.noScripts': { ru: 'Нет скриптов', en: 'No Scripts' },
  'dashboard.createFirst': { ru: 'Начните с создания вашего первого скрипта.', en: 'Start by creating your first script.' },
  'dashboard.createScript': { ru: 'Создать скрипт', en: 'Create Script' },
  'dashboard.showAll': { ru: 'Показать все скрипты', en: 'Show All Scripts' },


  'scripts.title': { ru: 'Мои скрипты', en: 'My Scripts' },
  'scripts.manage': { ru: 'Управляйте вашими Discord скриптами и ботами', en: 'Manage your Discord scripts and bots' },
  'scripts.filter': { ru: 'Фильтр по типу:', en: 'Filter by type:' },
  'scripts.all': { ru: 'Все', en: 'All' },
  'scripts.custom': { ru: 'Пользовательский', en: 'Custom' },
  'scripts.cyberLeague': { ru: 'Majestic Cyber League', en: 'Majestic Cyber League' },
  'scripts.weeklyCup': { ru: 'Weekly Cup / WarZone', en: 'Weekly Cup / WarZone' },
  'scripts.allianceBot': { ru: 'Союзный бот', en: 'Alliance Bot' },
  'scripts.noScriptsType': { ru: 'Нет скриптов выбранного типа', en: 'No scripts of selected type' },
  'scripts.tryOther': { ru: 'Попробуйте выбрать другой тип скрипта в фильтре.', en: 'Try selecting another script type in the filter.' },
  'scripts.noScripts': { ru: 'Нет скриптов', en: 'No Scripts' },
  'scripts.noCreated': { ru: 'У вас пока нет созданных скриптов.', en: 'You have no created scripts yet.' },
  'scripts.expiringSoon': { ru: 'Истекает скоро', en: 'Expiring Soon' },


  'scriptCard.running': { ru: 'Запущен', en: 'Running' },
  'scriptCard.stopped': { ru: 'Остановлен', en: 'Stopped' },
  'scriptCard.starting': { ru: 'Запуск...', en: 'Starting...' },
  'scriptCard.stopping': { ru: 'Стоп...', en: 'Stopping...' },
  'scriptCard.error': { ru: 'Ошибка', en: 'Error' },
  'scriptCard.expired': { ru: 'Истек', en: 'Expired' },
  'scriptCard.unknown': { ru: 'Неизвестно', en: 'Unknown' },
  'scriptCard.start': { ru: 'Запустить', en: 'Start' },
  'scriptCard.stop': { ru: 'Остановить', en: 'Stop' },
  'scriptCard.restart': { ru: 'Перезапустить', en: 'Restart' },
  'scriptCard.more': { ru: 'Подробнее', en: 'More' },
  'scriptCard.server': { ru: 'Сервер', en: 'Server' },
  'scriptCard.updated': { ru: 'Обновлен', en: 'Updated' },
  'scriptCard.created': { ru: 'Создан', en: 'Created' },
  'scriptCard.expires': { ru: 'Истекает', en: 'Expires' },
  'scriptCard.frozen': { ru: 'Заморожен', en: 'Frozen' },
  'scriptCard.frozenUntil': { ru: 'До', en: 'Until' },
  'scriptCard.frozenForever': { ru: 'Бессрочно', en: 'Indefinitely' },


  'admin.title': { ru: 'Админ-панель', en: 'Admin Panel' },
  'admin.manage': { ru: 'Управление системой и пользователями', en: 'System and user management' },
  'admin.stats': { ru: 'Статистика', en: 'Statistics' },
  'admin.serverMonitoring': { ru: 'Мониторинг серверов', en: 'Server Monitoring' },
  'admin.users': { ru: 'Пользователи', en: 'Users' },
  'admin.scripts': { ru: 'Скрипты', en: 'Scripts' },
  'admin.news': { ru: 'Новости', en: 'News' },
  'admin.scheduler': { ru: 'Планировщик', en: 'Scheduler' },
  'admin.servers': { ru: 'Серверы', en: 'Servers' },
  'admin.sshKeys': { ru: 'SSH ключи', en: 'SSH Keys' },
  'admin.auditLogs': { ru: 'Журнал аудита', en: 'Audit Logs' },


  'admin.stats.error': { ru: 'Ошибка загрузки статистики', en: 'Failed to load statistics' },
  'admin.stats.totalUsers': { ru: 'Всего пользователей', en: 'Total users' },
  'admin.stats.totalScripts': { ru: 'Всего скриптов', en: 'Total scripts' },
  'admin.stats.activeServers': { ru: 'Активных серверов', en: 'Active servers' },
  'admin.stats.runningScripts': { ru: 'Запущено скриптов', en: 'Running scripts' },
  'admin.stats.usersTitle': { ru: 'Пользователи', en: 'Users' },
  'admin.stats.usersActive': { ru: 'Активных', en: 'Active' },
  'admin.stats.usersBlocked': { ru: 'Заблокированных', en: 'Blocked' },
  'admin.stats.scriptsTitle': { ru: 'Скрипты', en: 'Scripts' },
  'admin.stats.scriptsRunning': { ru: 'Запущено', en: 'Running' },
  'admin.stats.scriptsStopped': { ru: 'Остановлено', en: 'Stopped' },
  'admin.stats.serversTitle': { ru: 'Серверы', en: 'Servers' },
  'admin.stats.totalServers': { ru: 'Всего серверов', en: 'Total servers' },
  'admin.stats.serversActive': { ru: 'Активных', en: 'Active' },
  'admin.stats.serversInactive': { ru: 'Неактивных', en: 'Inactive' },
  'admin.stats.activityTitle': { ru: 'Активность', en: 'Activity' },
  'admin.stats.totalDeployments': { ru: 'Всего деплойментов', en: 'Total deployments' },
  'admin.stats.activity24h': { ru: 'Действий за 24ч', en: 'Actions in last 24h' },


  'admin.pagination.showing': {
    ru: 'Показано {{from}} - {{to}} из {{total}}',
    en: 'Showing {{from}} - {{to}} of {{total}}',
  },


  'admin.users.title': { ru: 'Управление пользователями', en: 'User management' },
  'admin.users.createTitle': { ru: 'Создание нового пользователя', en: 'Create new user' },
  'admin.users.emailLabel': { ru: 'Email *', en: 'Email *' },
  'admin.users.emailPlaceholder': { ru: 'user@example.com', en: 'user@example.com' },
  'admin.users.usernameLabel': { ru: 'Имя пользователя *', en: 'Username *' },
  'admin.users.usernamePlaceholder': { ru: 'username', en: 'username' },
  'admin.users.usernameHint': {
    ru: 'Только буквы, цифры и подчеркивания (3-20 символов)',
    en: 'Only letters, numbers and underscores (3-20 characters)',
  },
  'admin.users.passwordLabel': { ru: 'Пароль *', en: 'Password *' },
  'admin.users.passwordPlaceholder': { ru: 'Минимум 8 символов', en: 'At least 8 characters' },
  'admin.users.passwordHint': {
    ru: 'Минимум 8 символов',
    en: 'Minimum 8 characters',
  },
  'admin.users.roleLabel': { ru: 'Роль *', en: 'Role *' },
  'admin.users.createButton': { ru: 'Создать пользователя', en: 'Create user' },
  'admin.users.creating': { ru: 'Создание...', en: 'Creating...' },
  'admin.users.searchPlaceholder': {
    ru: 'Поиск по email, имени или ID...',
    en: 'Search by email, username or ID...',
  },
  'admin.users.table.user': { ru: 'Пользователь', en: 'User' },
  'admin.users.table.role': { ru: 'Роль', en: 'Role' },
  'admin.users.table.status': { ru: 'Статус', en: 'Status' },
  'admin.users.table.scripts': { ru: 'Скрипты', en: 'Scripts' },
  'admin.users.table.createdAt': { ru: 'Дата регистрации', en: 'Registration date' },
  'admin.users.table.actions': { ru: 'Действия', en: 'Actions' },
  'admin.users.role.user': { ru: 'Пользователь', en: 'User' },
  'admin.users.role.admin': { ru: 'Администратор', en: 'Administrator' },
  'admin.users.role.superAdmin': { ru: 'Супер-администратор', en: 'Super administrator' },
  'admin.users.status.blocked': { ru: 'Заблокирован', en: 'Blocked' },
  'admin.users.status.active': { ru: 'Активен', en: 'Active' },
  'admin.users.viewUserScriptsTooltip': {
    ru: 'Просмотр скриптов пользователя',
    en: 'View user scripts',
  },
  'admin.users.changePassword': { ru: 'Сменить пароль', en: 'Change password' },
  'admin.users.block': { ru: 'Заблокировать', en: 'Block' },
  'admin.users.unblock': { ru: 'Разблокировать', en: 'Unblock' },
  'admin.users.blockTooltip': {
    ru: 'Заблокировать пользователя',
    en: 'Block user',
  },
  'admin.users.unblockTooltip': {
    ru: 'Разблокировать пользователя',
    en: 'Unblock user',
  },
  'admin.users.notFound': { ru: 'Пользователи не найдены', en: 'No users found' },
  'admin.users.empty': { ru: 'Нет пользователей для отображения', en: 'No users to display' },


  'admin.scripts.title': { ru: 'Управление скриптами', en: 'Scripts management' },
  'admin.scripts.createTitle': { ru: 'Создание нового скрипта', en: 'Create new script' },
  'admin.scripts.nameLabel': { ru: 'Название скрипта *', en: 'Script name *' },
  'admin.scripts.namePlaceholder': { ru: 'Мой Discord бот', en: 'My Discord bot' },
  'admin.scripts.descriptionLabel': { ru: 'Описание', en: 'Description' },
  'admin.scripts.descriptionPlaceholder': {
    ru: 'Описание вашего скрипта...',
    en: 'Description of your script...',
  },
  'admin.scripts.typeLabel': { ru: 'Тип скрипта *', en: 'Script type *' },
  'admin.scripts.typeHint.custom': {
    ru: 'Создается пустая директория для загрузки вашего кода',
    en: 'An empty directory will be created for your code',
  },
  'admin.scripts.typeHint.cyberLeague': {
    ru: 'Шаблон MCL_Template загружается с сервера сайта',
    en: 'MCL_Template will be downloaded from the site server',
  },
  'admin.scripts.typeHint.weeklyCup': {
    ru: 'Шаблон Weekly_Template загружается с сервера сайта',
    en: 'Weekly_Template will be downloaded from the site server',
  },
  'admin.scripts.typeHint.allianceBot': {
    ru: 'Шаблон Alliance_Template загружается с сервера сайта',
    en: 'Alliance_Template will be downloaded from the site server',
  },
  'admin.scripts.ownerLabel': { ru: 'Владелец скрипта *', en: 'Script owner *' },
  'admin.scripts.ownerSearchPlaceholder': {
    ru: 'Поиск пользователя по имени или email...',
    en: 'Search user by username or email...',
  },
  'admin.scripts.serverLabel': { ru: 'Сервер *', en: 'Server *' },
  'admin.scripts.loadingServers': {
    ru: 'Загрузка серверов...',
    en: 'Loading servers...',
  },
  'admin.scripts.noServers': {
    ru: 'Нет доступных серверов. Добавьте сервер в разделе "Серверы".',
    en: 'No available servers. Add a server in the "Servers" section.',
  },
  'admin.scripts.serverStats.total': {
    ru: 'Всего скриптов:',
    en: 'Total scripts:',
  },
  'admin.scripts.loadingServerStats': {
    ru: 'Загрузка статистики...',
    en: 'Loading statistics...',
  },
  'admin.scripts.autoUpdateTitle': {
    ru: 'Автоматическое обновление',
    en: 'Automatic update',
  },
  'admin.scripts.autoUpdateActive': { ru: 'Активно', en: 'Active' },
  'admin.scripts.autoUpdateDescription': {
    ru: 'Скрипт будет автоматически обновляться при изменении шаблона',
    en: 'The script will be automatically updated when the template changes',
  },
  'admin.scripts.autoUpdateDependencies': {
    ru: 'Зависимости будут переустанавливаться автоматически.',
    en: 'Dependencies will be reinstalled automatically.',
  },
  'admin.scripts.creating': { ru: 'Создание...', en: 'Creating...' },
  'admin.scripts.createButton': { ru: 'Создать скрипт', en: 'Create script' },
  'admin.scripts.searchPlaceholder': {
    ru: 'Поиск по названию, владельцу или email...',
    en: 'Search by name, owner or email...',
  },
  'admin.scripts.table.script': { ru: 'Скрипт', en: 'Script' },
  'admin.scripts.table.type': { ru: 'Тип', en: 'Type' },
  'admin.scripts.table.owner': { ru: 'Владелец', en: 'Owner' },
  'admin.scripts.table.server': { ru: 'Сервер', en: 'Server' },
  'admin.scripts.table.autoUpdate': { ru: 'Автообновление', en: 'Auto update' },
  'admin.scripts.autoUpdateUnavailable': {
    ru: 'Недоступно',
    en: 'Unavailable',
  },
  'admin.scripts.extendTooltip': {
    ru: 'Продлить срок действия',
    en: 'Extend expiration',
  },
  'admin.scripts.revokeTooltip': {
    ru: 'Отозвать скрипт',
    en: 'Revoke script',
  },
  'admin.scripts.filteredCount': {
    ru: '(Отфильтровано: {{count}})',
    en: '(Filtered: {{count}})',
  },


  'news.title': { ru: 'Новости', en: 'News' },
  'news.description': { ru: 'Будьте в курсе последних обновлений и новостей системы', en: 'Stay up to date with the latest updates and system news' },
  'news.searchPlaceholder': { ru: 'Поиск новостей...', en: 'Search news...' },
  'news.search': { ru: 'Поиск', en: 'Search' },
  'news.featured': { ru: 'Рекомендуемые', en: 'Featured' },
  'news.featuredNews': { ru: 'Рекомендуемые новости', en: 'Featured News' },
  'news.latestNews': { ru: 'Последние новости', en: 'Latest News' },
  'news.otherNews': { ru: 'Остальные новости', en: 'Other News' },
  'news.notFound': { ru: 'Новости не найдены', en: 'News not found' },
  'news.tryChangeQuery': { ru: 'Попробуйте изменить поисковый запрос или фильтры', en: 'Try changing your search query or filters' },
  'news.read': { ru: 'Читать', en: 'Read' },
  'news.share': { ru: 'Поделиться', en: 'Share' },
  'news.linkCopied': { ru: 'Ссылка скопирована в буфер обмена!', en: 'Link copied to clipboard!' },
  'news.copyFailed': { ru: 'Не удалось скопировать ссылку', en: 'Failed to copy link' },
  'news.notFoundTitle': { ru: 'Новость не найдена', en: 'News not found' },
  'news.backToList': { ru: 'Вернуться к списку новостей', en: 'Back to news list' },
  'news.views': { ru: 'просмотров', en: 'views' },
  'news.uniqueViews': { ru: 'уникальных', en: 'unique' },
  'news.recent24h': { ru: 'за 24ч', en: 'in 24h' },
  'news.aboutAuthor': { ru: 'Об авторе', en: 'About Author' },
  'news.author': { ru: 'Автор новости', en: 'News Author' },


  'profile.title': { ru: 'Профиль пользователя', en: 'User Profile' },
  'profile.description': { ru: 'Управление личной информацией и настройками аккаунта', en: 'Manage personal information and account settings' },
  'profile.personalInfo': { ru: 'Личная информация', en: 'Personal Information' },
  'profile.edit': { ru: 'Редактировать', en: 'Edit' },
  'profile.changePassword': { ru: 'Сменить пароль', en: 'Change Password' },
  'profile.username': { ru: 'Имя пользователя', en: 'Username' },
  'profile.email': { ru: 'Email', en: 'Email' },
  'profile.userId': { ru: 'ID пользователя', en: 'User ID' },
  'profile.role': { ru: 'Роль', en: 'Role' },
  'profile.role.admin': { ru: 'Администратор', en: 'Administrator' },
  'profile.role.superAdmin': { ru: 'Супер-администратор', en: 'Super Administrator' },
  'profile.role.user': { ru: 'Пользователь', en: 'User' },
  'profile.registrationDate': { ru: 'Дата регистрации', en: 'Registration Date' },
  'profile.telegram': { ru: 'Telegram', en: 'Telegram' },
  'profile.telegramLinkedId': { ru: 'Привязан (ID:', en: 'Linked (ID:' },
  'profile.twoFactor': { ru: '2FA', en: '2FA' },
  'profile.twoFactorEnabledStatus': { ru: 'Включена', en: 'Enabled' },
  'profile.saving': { ru: 'Сохранение...', en: 'Saving...' },
  'profile.save': { ru: 'Сохранить', en: 'Save' },
  'profile.passwordChange': { ru: 'Смена пароля', en: 'Change Password' },
  'profile.currentPassword': { ru: 'Текущий пароль', en: 'Current Password' },
  'profile.newPassword': { ru: 'Новый пароль', en: 'New Password' },
  'profile.confirmPassword': { ru: 'Подтвердите новый пароль', en: 'Confirm New Password' },
  'profile.enterCurrentPassword': { ru: 'Введите текущий пароль', en: 'Enter current password' },
  'profile.enterNewPassword': { ru: 'Введите новый пароль', en: 'Enter new password' },
  'profile.confirmNewPassword': { ru: 'Подтвердите новый пароль', en: 'Confirm new password' },
  'profile.changing': { ru: 'Изменение...', en: 'Changing...' },
  'profile.changePasswordBtn': { ru: 'Изменить пароль', en: 'Change Password' },
  'profile.telegramIntegration': { ru: 'Интеграция с Telegram', en: 'Telegram Integration' },
  'profile.telegramDescription': { ru: 'Привяжите Telegram аккаунт для быстрого входа и двухфакторной аутентификации', en: 'Link Telegram account for quick login and two-factor authentication' },
  'profile.telegramLinked': { ru: 'Telegram аккаунт привязан', en: 'Telegram account linked' },
  'profile.unlink': { ru: 'Отвязать', en: 'Unlink' },
  'profile.linkTelegram': { ru: 'Привязать Telegram аккаунт', en: 'Link Telegram Account' },
  'profile.useWidget': { ru: 'Используйте виджет справа для привязки', en: 'Use the widget on the right to link' },
  'profile.twoFactorEnabled': { ru: '2FA включена', en: '2FA Enabled' },
  'profile.twoFactorDescription': { ru: 'При входе через логин/пароль будет отправляться запрос на подтверждение через Telegram', en: 'When logging in with username/password, a confirmation request will be sent via Telegram' },
  'profile.twoFactorDisabled': { ru: '2FA выключена', en: '2FA Disabled' },
  'profile.enable2FADescription': { ru: 'Включите 2FA для дополнительной защиты аккаунта', en: 'Enable 2FA for additional account protection' },
  'profile.telegramRequired': { ru: 'Для включения 2FA необходимо привязать Telegram аккаунт', en: 'Telegram account must be linked to enable 2FA' },
  'profile.enable': { ru: 'Включить', en: 'Enable' },
  'profile.disable': { ru: 'Выключить', en: 'Disable' },
  'profile.waiting': { ru: 'Ожидание...', en: 'Waiting...' },
  'profile.telegramLoginInfo': { ru: 'Вы можете войти на сайт через Telegram, используя кнопку входа на странице авторизации.', en: 'You can log in to the site via Telegram using the login button on the authorization page.' },
  'profile.activeSessions': { ru: 'Активные сессии', en: 'Active Sessions' },
  'profile.sessionsDescription': { ru: 'Управление активными сессиями вашего аккаунта', en: 'Manage active sessions of your account' },
  'profile.refresh': { ru: 'Обновить', en: 'Refresh' },
  'profile.noSessions': { ru: 'Нет активных сессий', en: 'No active sessions' },
  'profile.sessionsWillAppear': { ru: 'Сессии появятся после следующего входа в систему', en: 'Sessions will appear after the next login' },
  'profile.currentSession': { ru: 'Текущая сессия', en: 'Current Session' },
  'profile.expired': { ru: 'Истекла', en: 'Expired' },
  'profile.created': { ru: 'Создана:', en: 'Created:' },
  'profile.active': { ru: 'Активна:', en: 'Active:' },
  'profile.until': { ru: 'До:', en: 'Until:' },
  'profile.unknownDevice': { ru: 'Неизвестное устройство', en: 'Unknown Device' },
  'profile.revokeSession': { ru: 'Завершить', en: 'Revoke' },
  'profile.revokeAllOther': { ru: 'Завершить все остальные сессии', en: 'Revoke All Other Sessions' },
  'profile.cannotRevokeCurrent': { ru: 'Нельзя завершить текущую сессию', en: 'Cannot revoke current session' },
  'profile.confirmUnlink': { ru: 'Вы уверены, что хотите отвязать Telegram аккаунт?', en: 'Are you sure you want to unlink Telegram account?' },
  'profile.confirmRevoke': { ru: 'Вы уверены, что хотите завершить эту сессию?', en: 'Are you sure you want to revoke this session?' },
  'profile.confirmRevokeCurrent': { ru: 'Вы завершаете текущую сессию. Вы будете выкинуты из системы. Продолжить?', en: 'You are revoking the current session. You will be logged out. Continue?' },
  'profile.confirmRevokeAll': { ru: 'Вы уверены, что хотите завершить все остальные сессии?', en: 'Are you sure you want to revoke all other sessions?' },
  'profile.updateSuccess': { ru: 'Профиль обновлен успешно', en: 'Profile updated successfully' },
  'profile.passwordChangeSuccess': { ru: 'Пароль изменен успешно', en: 'Password changed successfully' },
  'profile.telegramLinkSuccess': { ru: 'Telegram аккаунт успешно привязан!', en: 'Telegram account linked successfully!' },
  'profile.telegramUnlinkSuccess': { ru: 'Telegram аккаунт успешно отвязан', en: 'Telegram account unlinked successfully' },
  'profile.twoFactorToggleSuccess': { ru: '2FA', en: '2FA' },
  'profile.sessionRevokedSuccess': { ru: 'Сессия успешно завершена', en: 'Session revoked successfully' },
  'profile.allSessionsRevokedSuccess': { ru: 'Все остальные сессии успешно завершены', en: 'All other sessions revoked successfully' },


  'scriptDetail.back': { ru: 'Назад', en: 'Back' },
  'scriptDetail.backToScripts': { ru: 'Назад к скриптам', en: 'Back to scripts' },
  'scriptDetail.notFound': { ru: 'Скрипт не найден', en: 'Script not found' },
  'scriptDetail.notFoundDescription': { ru: 'Возможно, скрипт был удален или у вас нет прав доступа.', en: 'The script may have been deleted or you do not have access rights.' },
  'scriptDetail.actions': { ru: 'Действия', en: 'Actions' },
  'scriptDetail.id': { ru: 'ID', en: 'ID' },
  'scriptDetail.start': { ru: 'Запустить', en: 'Start' },
  'scriptDetail.stop': { ru: 'Остановить', en: 'Stop' },
  'scriptDetail.restart': { ru: 'Перезапустить', en: 'Restart' },
  'scriptDetail.settings': { ru: 'Настройки', en: 'Settings' },
  'scriptDetail.logs': { ru: 'Логи', en: 'Logs' },
  'scriptDetail.showLogs': { ru: 'Показать логи', en: 'Show Logs' },
  'scriptDetail.freeze': { ru: 'Заморозить', en: 'Freeze' },
  'scriptDetail.unfreeze': { ru: 'Разморозить', en: 'Unfreeze' },
  'scriptDetail.frozenCannotStart': { ru: 'Скрипт заморожен. Разморозьте подписку, чтобы запустить скрипт.', en: 'Script is frozen. Unfreeze the subscription to start the script.' },
  'scriptDetail.frozenCannotRestart': { ru: 'Скрипт заморожен. Разморозьте подписку, чтобы перезапустить скрипт.', en: 'Script is frozen. Unfreeze the subscription to restart the script.' },
  'scriptDetail.access': { ru: 'Управление доступом', en: 'Access Management' },
  'scriptDetail.information': { ru: 'Информация', en: 'Information' },
  'scriptDetail.status': { ru: 'Статус', en: 'Status' },
  'scriptDetail.type': { ru: 'Тип', en: 'Type' },
  'scriptDetail.server': { ru: 'Сервер', en: 'Server' },
  'scriptDetail.pathOnServer': { ru: 'Путь на сервере', en: 'Path on server' },
  'scriptDetail.pm2Name': { ru: 'PM2 имя', en: 'PM2 name' },
  'scriptDetail.version': { ru: 'Версия', en: 'Version' },
  'scriptDetail.created': { ru: 'Создан', en: 'Created' },
  'scriptDetail.updated': { ru: 'Обновлен', en: 'Updated' },
  'scriptDetail.expires': { ru: 'Истекает', en: 'Expires' },
  'scriptDetail.expired': { ru: 'Истек', en: 'Expired' },
  'scriptDetail.frozen': { ru: 'Заморожен', en: 'Frozen' },
  'scriptDetail.uptime': { ru: 'Время работы', en: 'Uptime' },
  'scriptDetail.description': { ru: 'Описание', en: 'Description' },
  'scriptDetail.noDescription': { ru: 'Описание отсутствует', en: 'No description' },


  'admin.changePassword.title': { ru: 'Изменить пароль пользователя', en: 'Change user password' },
  'admin.changePassword.userLabel': { ru: 'Пользователь:', en: 'User:' },
  'admin.changePassword.warningTitle': { ru: 'Внимание!', en: 'Warning!' },
  'admin.changePassword.warningText': {
    ru: 'Вы собираетесь изменить пароль пользователя. Это действие будет записано в журнал аудита.',
    en: 'You are about to change the user password. This action will be logged in the audit log.',
  },
  'admin.changePassword.newPasswordLabel': { ru: 'Новый пароль', en: 'New password' },
  'admin.changePassword.newPasswordPlaceholder': {
    ru: 'Введите новый пароль',
    en: 'Enter a new password',
  },
  'admin.changePassword.confirmPasswordLabel': { ru: 'Подтвердите пароль', en: 'Confirm password' },
  'admin.changePassword.confirmPasswordPlaceholder': {
    ru: 'Подтвердите новый пароль',
    en: 'Confirm the new password',
  },
  'admin.changePassword.reasonLabel': { ru: 'Причина изменения', en: 'Reason for change' },
  'admin.changePassword.reasonPlaceholder': {
    ru: 'Укажите причину изменения пароля (минимум 10 символов)',
    en: 'Specify the reason for the password change (at least 10 characters)',
  },
  'admin.changePassword.reasonHint': {
    ru: 'Эта информация будет сохранена в журнале аудита',
    en: 'This information will be stored in the audit log',
  },
  'admin.changePassword.changing': { ru: 'Изменение...', en: 'Changing...' },
  'admin.changePassword.submit': { ru: 'Изменить пароль', en: 'Change password' },
  'admin.changePassword.success': {
    ru: 'Пароль пользователя успешно изменен',
    en: 'User password has been successfully changed',
  },
  'admin.changePassword.errors.newPasswordRequired': {
    ru: 'Введите новый пароль',
    en: 'Enter a new password',
  },
  'admin.changePassword.errors.newPasswordTooShort': {
    ru: 'Пароль должен содержать минимум 6 символов',
    en: 'Password must be at least 6 characters long',
  },
  'admin.changePassword.errors.confirmPasswordRequired': {
    ru: 'Подтвердите пароль',
    en: 'Confirm the password',
  },
  'admin.changePassword.errors.passwordsNotMatch': {
    ru: 'Пароли не совпадают',
    en: 'Passwords do not match',
  },
  'admin.changePassword.errors.reasonRequired': {
    ru: 'Укажите причину изменения пароля',
    en: 'Specify the reason for password change',
  },
  'admin.changePassword.errors.reasonTooShort': {
    ru: 'Причина должна содержать минимум 10 символов',
    en: 'The reason must be at least 10 characters long',
  },


  'logs.title': { ru: 'Логи скрипта', en: 'Script logs' },
  'logs.status': { ru: 'Статус', en: 'Status' },
  'logs.unknown': { ru: 'НЕИЗВЕСТНО', en: 'UNKNOWN' },
  'logs.lines': { ru: 'Строк', en: 'Lines' },
  'logs.refresh': { ru: 'Обновить логи', en: 'Refresh logs' },
  'logs.clear': { ru: 'Очистить логи', en: 'Clear logs' },
  'logs.clearConfirm': {
    ru: 'Вы уверены, что хотите очистить логи этого скрипта? Это действие нельзя отменить.',
    en: 'Are you sure you want to clear the logs for this script? This action cannot be undone.',
  },
  'logs.cleared': { ru: 'Логи очищены', en: 'Logs cleared' },
  'logs.updated': { ru: 'Логи обновлены', en: 'Logs updated' },
  'logs.autoRefreshOn': { ru: 'Включить автообновление', en: 'Enable auto refresh' },
  'logs.autoRefreshOff': { ru: 'Отключить автообновление', en: 'Disable auto refresh' },
  'logs.autoRefreshEnabled': { ru: 'Автообновление включено', en: 'Auto refresh is enabled' },
  'logs.download': { ru: 'Скачать', en: 'Download' },
  'logs.notFound': { ru: 'Логи не найдены', en: 'Logs not found' },
  'logs.shownLines': {
    ru: 'Показано последних {{count}} строк логов',
    en: 'Showing last {{count}} log lines',
  },
  'logs.updatedAt': { ru: 'Обновлено', en: 'Updated at' },


  'error.somethingWrong': { ru: 'Что-то пошло не так', en: 'Something went wrong' },
  'error.unexpected': { ru: 'Произошла непредвиденная ошибка. Пожалуйста, попробуйте обновить страницу.', en: 'An unexpected error occurred. Please try refreshing the page.' },
  'error.tryAgain': { ru: 'Попробовать снова', en: 'Try Again' },
  'error.reloadPage': { ru: 'Обновить страницу', en: 'Reload Page' },
}

class I18n {
  private currentLanguage: Language = (localStorage.getItem('language') as Language) || 'ru'

  setLanguage(lang: Language) {
    this.currentLanguage = lang
    localStorage.setItem('language', lang)

    window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }))
  }

  getLanguage(): Language {
    return this.currentLanguage
  }

  t(key: string, vars?: Record<string, string | number>): string {
    const translation = translations[key]
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`)
      return key
    }
    const template = translation[this.currentLanguage] || translation.ru
    if (!vars) {
      return template
    }

    return Object.keys(vars).reduce((result, k) => {
      const value = String(vars[k])
      const regex = new RegExp(`{{\\s*${k}\\s*}}`, 'g')
      return result.replace(regex, value)
    }, template)
  }
}

export const i18n = new I18n()


export function useTranslation() {
  const [language, setLanguageState] = useState<Language>(i18n.getLanguage())

  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent<Language>) => {
      setLanguageState(event.detail)
    }

    window.addEventListener('languageChanged', handleLanguageChange as EventListener)
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener)
    }
  }, [])

  const t = (key: string, vars?: Record<string, string | number>) => i18n.t(key, vars)
  const changeLanguage = (lang: Language) => {
    i18n.setLanguage(lang)
    setLanguageState(lang)
  }

  return { t, language, changeLanguage }
}
