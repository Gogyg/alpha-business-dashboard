# Альфа-Бизнес Дашборд

Веб-приложение дашборда с метриками для дирекции Альфа-Бизнес с системой аутентификации и синхронизацией данных.

## Возможности

- **Аутентификация**: Регистрация и вход пользователей
- **Главная страница**: VOC/eNPS и итоговые показатели
- **Важные метрики дирекции**: Управление ключевыми метриками
- **Цели квартала**: Полный функционал управления целями с согласованием
- **Real-time синхронизация**: Все пользователи видят актуальные данные
- **Защита паролем**: Критические операции требуют подтверждения

## Технологии

- React 18 + TypeScript
- Tailwind CSS v4
- React Router v7
- Recharts для графиков
- Material UI компоненты
- Supabase (Auth + Database + Real-time, self-hosted)
- VPS (Production hosting)
- Vercel (Reserve hosting)

## Установка для разработки

```bash
# Установка зависимостей
npm install

# Создайте файл .env из .env.example
cp .env.example .env

# Добавьте ваши Supabase credentials в .env
# VITE_SUPABASE_URL=http://your-vps:8000
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build
```

## Деплой (Production)

### Шаг 1: VPS + self-hosted Supabase

1. Поднимите Supabase на VPS (например, http://your-vps:8000)
2. Укажите `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` в окружении

### Шаг 2: Vercel (резервный)

1. Перейдите на [vercel.com](https://vercel.com)
2. Войдите через GitHub
3. Нажмите "Add New Project"
4. Импортируйте этот репозиторий
5. Добавьте Environment Variables:
   - `VITE_SUPABASE_URL` = URL вашего self-hosted Supabase
   - `VITE_SUPABASE_ANON_KEY` = ваш Anon Key
6. Нажмите "Deploy"

### Шаг 3: Автоматические обновления

После настройки каждый push в main автоматически обновляет приложение.

```bash
git add .
git commit -m "Update dashboard"
git push
```

## Структура данных

Данные хранятся в Supabase по кварталам 2026 года:
- VOC метрики (voc_Q1, voc_Q2, voc_Q3, voc_Q4)
- Важные метрики дирекции (metrics_Q1, metrics_Q2, etc.)
- Цели квартала (goals_Q1, goals_Q2, etc.)
- Данные команды (team_data)

## Безопасность

- Аутентификация через Supabase Auth
- Критические операции защищены паролем "md520"
- Все API запросы требуют авторизации
- HTTPS encryption на всех соединениях

## API Endpoints

Backend на Supabase Edge Functions:
- `POST /auth/signup` - Регистрация
- `POST /auth/login` - Вход
- `GET/POST /voc/:quarter` - VOC метрики
- `GET/POST /metrics/:quarter` - Важные метрики
- `GET/POST /goals/:quarter` - Цели квартала
- `GET/POST /team` - Данные команды

## Версия

Текущая стабильная версия: 30 (с интеграцией Supabase)

## Поддержка

Для вопросов и поддержки обратитесь к команде разработки.

---

© 2026 Альфа-Бизнес. Все права защищены.
