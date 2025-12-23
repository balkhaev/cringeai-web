# Trender

Платформа для анализа видео, скрапинга Instagram Reels и AI-генерации видео.

## Требования

- Docker и Docker Compose
- Bun 1.3+
- Python 3.12+ (опционально, для локального запуска video-frames)

## Быстрый старт

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd trender

# 2. Создать .env файлы
cp .env.docker.example .env
cp apps/server/.env.example apps/server/.env
# Заполнить API ключи (GEMINI_API_KEY обязателен)

# 3. Первый запуск (установка + настройка БД)
make setup

# 4. Запуск разработки
make dev
```

После запуска:
- **Web UI**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/reference
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

## Команды

### Разработка

| Команда | Описание |
|---------|----------|
| `make dev` | Установить зависимости + запустить infra + bun dev |
| `make setup` | Полная настройка (deps + python + db) |
| `make install` | Только установка зависимостей |
| `make build` | Собрать все пакеты |

### Инфраструктура

| Команда | Описание |
|---------|----------|
| `make infra` | Запустить postgres, redis, minio |
| `make infra-down` | Остановить инфраструктуру |

### База данных

| Команда | Описание |
|---------|----------|
| `make db-push` | Push схемы в БД |
| `make db-migrate` | Применить миграции |
| `make db-studio` | Открыть Prisma Studio |
| `make db-reset` | Сбросить БД |

### Docker (полный стек)

| Команда | Описание |
|---------|----------|
| `make docker` | Запустить всё в Docker (dev) |
| `make docker-prod` | Запустить всё в Docker (prod) |
| `make docker-down` | Остановить Docker |
| `make docker-clean` | Удалить containers и volumes |

## Архитектура

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web UI    │────▶│   Server    │────▶│  PostgreSQL │
│  (Next.js)  │     │   (Hono)    │     └─────────────┘
└─────────────┘     └──────┬──────┘            │
                          │              ┌─────────┐
         ┌────────────────┼──────────────│  Redis  │
         │                │              │(BullMQ) │
         ▼                ▼              └─────────┘
   ┌───────────┐   ┌─────────────┐
   │  Scrapper │   │Video-Frames │
   │(Instagram)│   │(PySceneDetect)│
   └───────────┘   └─────────────┘
```

## Сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| web | 3000 | Next.js фронтенд |
| server | 3001 | Hono API сервер |
| video-frames | 8002 | Python: извлечение кадров, детекция сцен |
| scrapper | 8001 | Python: Instagram скрапер |
| postgres | 5432 | База данных |
| redis | 6379 | Очереди задач |
| minio | 9000/9001 | S3-совместимое хранилище |

## Структура проекта

```
trender/
├── apps/
│   ├── web/           # Frontend (Next.js)
│   ├── server/        # Backend API (Hono)
│   ├── video-frames/  # Python: кадры и сцены
│   └── scrapper/      # Python: Instagram
├── packages/
│   ├── db/            # Prisma схема и клиент
│   └── auth/          # Аутентификация
```

## Переменные окружения

Скопировать и заполнить:
- `.env.docker.example` → `.env` (для docker-compose)
- `apps/server/.env.example` → `apps/server/.env` (для сервера)

Основные ключи:

```env
GEMINI_API_KEY=          # Google Gemini (анализ видео) - обязательно
KLING_ACCESS_KEY=        # Kling AI (генерация видео)
KLING_SECRET_KEY=
INSTAGRAM_USER=          # Instagram (опционально)
INSTAGRAM_PASS=
```

## Scene-based генерация

Разбиение видео на сцены с помощью PySceneDetect:

1. Детекция переходов в видео
2. Анализ каждой сцены через Gemini
3. Параллельная генерация через Kling
4. Автоматическая склейка результата

API:
```
POST /api/scenes/analyze     - запустить анализ
GET  /api/scenes/:analysisId - получить сцены
POST /api/scenes/generate    - запустить генерацию
```

## Технологии

- **Frontend**: Next.js, TailwindCSS, shadcn/ui
- **Backend**: Hono, BullMQ, Prisma
- **AI**: Google Gemini, Kling AI
- **Video**: PySceneDetect, FFmpeg
- **Infra**: PostgreSQL, Redis, MinIO
