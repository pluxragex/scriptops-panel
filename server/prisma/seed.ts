import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...');


  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: adminPassword,
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });


  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      username: 'testuser',
      password: userPassword,
      role: UserRole.USER,
      emailVerified: true,
    },
  });


  const testKey = await prisma.serverKey.upsert({
    where: { id: 'test-key-1' },
    update: {},
    create: {
      id: 'test-key-1',
      label: 'Test Server Key',
      privateKeyEncrypted: 'encrypted-test-key-data',
      publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC...',
    },
  });


  const testServer = await prisma.server.upsert({
    where: { id: 'test-server-1' },
    update: {},
    create: {
      id: 'test-server-1',
      name: 'Test Server',
      host: 'localhost',
      port: 22,
      sshUser: 'deploy',
      keyId: testKey.id,
      note: 'Тестовый сервер для разработки',
    },
  });


  const testScript = await prisma.script.upsert({
    where: { id: 'test-script-1' },
    update: {},
    create: {
      id: 'test-script-1',
      name: 'Test Discord Bot',
      description: 'Тестовый Discord бот',
      ownerId: user.id,
      serverId: testServer.id,
      pathOnServer: `/opt/discord-scripts/${user.id}/test-script-1`,
      pm2Name: `user-${user.id}-script-test-script-1`,
      status: 'STOPPED',
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });


  await prisma.systemSetting.upsert({
    where: { key: 'max_scripts_per_user' },
    update: {},
    create: {
      key: 'max_scripts_per_user',
      value: '5',
      type: 'number',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'default_script_expiry_days' },
    update: {},
    create: {
      key: 'default_script_expiry_days',
      value: '30',
      type: 'number',
    },
  });


  const news1 = await prisma.news.create({
    data: {
      title: 'Добро пожаловать в систему управления Discord скриптами!',
      content: `Мы рады представить вам новую систему управления Discord скриптами 222prod.

Эта платформа позволяет:
- Создавать и управлять Discord ботами
- Развертывать скрипты на удаленных серверах
- Мониторить работу ваших ботов
- Управлять пользователями и их доступом

Система поддерживает различные типы скриптов:
- **Cyber League** - для регистрации в турнирах
- **Weekly Cup** - для еженедельных соревнований
- **Family Bot** - для семейных серверов
- **Custom** - ваши собственные разработки

Начните с создания первого скрипта в разделе "Скрипты"!`,
      excerpt: 'Знакомство с новой системой управления Discord скриптами 222prod',
      slug: 'welcome-to-222prod-system',
      imageUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=400&fit=crop',
      isPublished: true,
      isFeatured: true,
      priority: 100,
      publishedAt: new Date(),
      authorId: admin.id,
    },
  });

  const news2 = await prisma.news.create({
    data: {
      title: 'Обновление системы: новые возможности и улучшения',
      content: `Мы выпустили важное обновление системы с множеством новых возможностей:

## 🆕 Новые функции:
- **Система новостей** - теперь вы можете читать актуальные новости прямо в интерфейсе
- **Улучшенный мониторинг** - более детальная информация о работе скриптов
- **Новые типы скриптов** - поддержка дополнительных форматов ботов

## 🔧 Улучшения:
- Повышена стабильность работы системы
- Улучшен интерфейс управления скриптами
- Добавлены новые настройки безопасности

## 🐛 Исправления:
- Устранены проблемы с SSH подключениями
- Исправлены ошибки в системе логирования
- Улучшена обработка ошибок

Спасибо за использование нашей системы!`,
      excerpt: 'Обзор новых возможностей и улучшений в последнем обновлении',
      slug: 'system-update-new-features',
      imageUrl: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&h=400&fit=crop',
      isPublished: true,
      isFeatured: false,
      priority: 80,
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      authorId: admin.id,
    },
  });

  const news3 = await prisma.news.create({
    data: {
      title: 'Руководство по созданию первого Discord бота',
      content: `Создание Discord бота может показаться сложным, но с нашей системой это стало намного проще!

## 📋 Пошаговое руководство:

### 1. Подготовка
- Убедитесь, что у вас есть токен Discord бота
- Подготовьте код вашего бота
- Выберите подходящий сервер для развертывания

### 2. Создание скрипта
- Перейдите в раздел "Скрипты"
- Нажмите "Создать новый скрипт"
- Заполните необходимую информацию
- Загрузите файлы вашего бота

### 3. Настройка
- Укажите токен бота в настройках
- Настройте переменные окружения
- Проверьте все параметры

### 4. Запуск
- Нажмите "Развернуть" для загрузки на сервер
- Дождитесь завершения развертывания
- Запустите бота кнопкой "Старт"

### 💡 Полезные советы:
- Всегда тестируйте бота перед публичным запуском
- Регулярно проверяйте логи на наличие ошибок
- Используйте систему мониторинга для отслеживания работы

Удачи в создании вашего первого бота!`,
      excerpt: 'Подробное руководство по созданию и настройке Discord бота в системе',
      slug: 'discord-bot-creation-guide',
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop',
      isPublished: true,
      isFeatured: true,
      priority: 90,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      authorId: admin.id,
    },
  });

  console.log('✅ База данных успешно заполнена!');
  console.log('👤 Админ: admin@example.com / admin123');
  console.log('👤 Пользователь: user@example.com / user123');
  console.log('📰 Создано 3 тестовые новости');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
