# СИБГИУ — Система опросов (sibsiu-survey)

Коротко о том, какие изменения произошли (3-я осенняя аттестация):
1. Добавлено сохранение результата прохождения опроса в БД;
2. Добавлена генерация ссылки на прохождение опроса;
3. Добавлена защита от повторных прохождений одним и тем же человеком;
4. Добавлена система авторизации для админов (авторов - разработчиков анкет и опросов).


Полноценное веб‑приложение для проведения и управления опросами в СибГИУ: список активных опросов, анкеты, ссылки, базовые отчёты (в разработке). Современный UI на React + Vite, серверная часть на Express, деплой на Netlify с серверлесс‑функциями.

## Стек и технологии

- Клиент
  - React 18
  - Vite 7 (vite + @vitejs/plugin-react-swc)
  - TypeScript 5
  - Tailwind CSS 3 (+ tailwind-merge, tailwindcss-animate)
  - Radix UI (набор headless‑компонентов)
  - react-router-dom 6
  - @tanstack/react-query 5
  - Библиотечные утилиты: clsx, class-variance-authority, sonner (тосты), recharts, framer-motion и др.
- Сервер
  - Express 5
  - serverless-http (для Netlify Functions)
- Инфраструктура/сборка
  - Vite (две сборки: клиентская и серверная)
  - Netlify (хостинг SPA + серверлесс‑функции)
  - Node.js (рекомендуется LTS ≥ 18)
  - pnpm (управление пакетами)

## Структура проекта

```
.
├─ client/                 # Клиентское приложение (React + Vite)
│  ├─ App.tsx              # Роутер и провайдеры
│  ├─ global.css           # Tailwind и глобальные стили
│  ├─ pages/
│  │  ├─ Index.tsx         # Главная: список активных опросов
│  │  ├─ Ankety.tsx        # Страница «Анкеты»
│  │  └─ Ssylki.tsx        # Страница «Ссылки»
│  └─ components/
│     ├─ Header.tsx        # Заголовок
│     ├─ Sidebar.tsx       # Навигация (активное состояние страниц)
│     ├─ SurveyCard.tsx    # Карточка опроса на главной
│     ├─ ProgramsTable.tsx # Таблица программ (Анкеты)
│     └─ SurveysTable.tsx  # Таблица анкет (Ссылки)
├─ public/
│  └─ Logo.png             # Логотип, доступен по пути /Logo.png
├─ server/                 # Серверная часть/SSR-заготовка (Express)
│  ├── db/
|  │    └── config.ts                   # Конфигурация PostgreSQL
|  ├── repositories/                    # Репозитории для работы с БД
|  │   ├── surveysRepository.ts
|  │   └── questionnairesRepository.ts
|  ├── routes/                          # API роуты
|  │      ├── demo.ts
|  │      ├── surveys.ts
|  │      └── questionnaires.ts
|  ├── index.ts                         # Главный файл сервера
|  └── node-build.ts
├─ netlify/
│  └─ functions/
│     └─ api.ts            # Пример Netlify Function на Express
├─ shared/
│  └─ api.ts               # Общие типы/вызовы (заготовка)
├─ netlify.toml            # Конфигурация сборки и редиректов
├─ package.json            # Скрипты и зависимости
├─ tailwind.config.ts
├─ tsconfig.json
└─ vite.config*.ts
```

## Ключевые страницы

- Главная «Опросы» (`/`)
  - Список активных опросов (демо‑данные), поиск.
- «Анкеты» (`/ankety`)
  - Таблица программ с датами изменения.
- «Ссылки» (`/ssylki`)
  - Таблица анкет с меню действий (демо).

Навигация подсвечивает активный пункт через проп `activePage` в компоненте `Sidebar`.

## Скрипты

Смотреть раздел `scripts` в `package.json`:

- `pnpm dev` — локальная разработка (Vite dev server)
- `pnpm build` — прод‑сборка (клиент + сервер)
  - `pnpm build:client` — сборка SPA
  - `pnpm build:server` — сборка серверной части (Express)
- `pnpm start` — запуск собранного сервера (`dist/server/node-build.mjs`)
- `pnpm test` — запуск тестов (Vitest)
- `pnpm typecheck` — проверка типов (tsc)
- `pnpm format.fix` — форматирование Prettier

Рекомендуемая версия Node.js: LTS (≥ 18). Пакетный менеджер: pnpm (см. ниже установку).

## Локальный запуск
Перед запуском запустите PgAdmin и подключитесь к базе Quality_of_Sibgiu_DB.sql. В файле .env поменяйте значения констант DB_USER и DB_PASSWORD на актуальные для вас.

1. Установите pnpm (при необходимости):
   ```bash
   npm i -g pnpm
   ```
2. Установите зависимости:
   ```bash
   pnpm i
   ```
3. Запустите dev‑сервер:
   ```bash
   pnpm dev
   ```
4. Откройте в браузере:
   ```
   http://localhost:8080
   ```

## Быстрый старт с Supabase (без локального PostgreSQL)

1. Создайте проект на https://supabase.com и скопируйте:
   - Project URL (например, https://xxxxx.supabase.co)
   - API Key (anon)
2. В корне проекта откройте `.env` и добавьте:
   ```env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_KEY=eyJhbGciOi... (anon ключ)
   ```
   Примечание: если заданы `SUPABASE_URL` и `SUPABASE_KEY`, приложение использует Supabase вместо локального PostgreSQL.
3. Создайте таблицы в Supabase через SQL Editor (один раз):
   ```sql
   create table if not exists questionnaires (
     id serial primary key,
     title varchar(255) not null,
     description text,
     version integer not null default 1,
     created_by integer,
     created_at timestamp not null default now()
   );

   create table if not exists surveys (
     id serial primary key,
     questionnaire_id integer references questionnaires(id) on delete set null,
     title varchar(255) not null,
     is_active boolean not null default true,
     start_date timestamp null,
     end_date timestamp null,
     unique_link varchar(255),
     created_by integer,
     created_at timestamp not null default now()
   );

   create table if not exists questions (
     id serial primary key,
     questionnaire_id integer not null references questionnaires(id) on delete cascade,
     question_text text not null,
     question_type varchar(32) not null check (question_type in ('single_choice','multiple_choice','text')),
     is_required boolean not null default false,
     question_order integer not null default 1,
     created_at timestamp not null default now()
   );

   create table if not exists answer_options (
     id serial primary key,
     question_id integer not null references questions(id) on delete cascade,
     option_text text not null,
     option_order integer not null default 1,
     created_at timestamp not null default now()
   );

   create index if not exists idx_surveys_active on surveys(is_active);
   create index if not exists idx_surveys_dates on surveys(end_date);
   create index if not exists idx_questions_questionnaire on questions(questionnaire_id);
   create index if not exists idx_options_question on answer_options(question_id);
   ```
   - Если включён RLS, добавьте политики на чтение (или временно отключите RLS) для этих таблиц.
4. Запустите dev-сервер:
   ```bash
   pnpm dev
   ```

## Переменные окружения

Файл `.env` содержит публичные и серверные переменные. Пример для локальной разработки:

```env
# Публичные (используются на клиенте)
VITE_PUBLIC_BUILDER_KEY=__BUILDER_PUBLIC_KEY__
PING_MESSAGE=ping pong

# Подключение к PostgreSQL (используется сервером)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Quality_of_Sibgiu_DB
DB_USER=postgres
DB_PASSWORD=your_password_here

# Настройки приложения
NODE_ENV=development
PORT=3000
```

Эти переменные считываются в `server/db/config.ts` через пул `pg`. Не публикуйте реальные пароли в репозитории.

### Настройка PostgreSQL через pgAdmin (Windows)

- Установите PostgreSQL и pgAdmin: https://www.postgresql.org/download/
- Во время установки задайте пароль для пользователя `postgres` и запомните его.
- Откройте pgAdmin → Servers → PostgreSQL → (правый клик) Create → Database…
  - Name: `Quality_of_Sibgiu_DB`
  - Owner: `postgres`
- Сопоставьте параметры из pgAdmin с `.env`:
  - Host: `localhost`
  - Port: `5432`
  - Database: `Quality_of_Sibgiu_DB`
  - Username: `postgres`
  - Password: (ваш пароль)
- Проверьте подключение: Databases → `Quality_of_Sibgiu_DB` → (правый клик) Query Tool → выполните `SELECT 1;`
- Перезапустите dev‑сервер (`pnpm dev`). В консоли при успешном коннекте появится сообщение `Connected to PostgreSQL database`.

### Локальный PostgreSQL через pgAdmin (вариант “из коробки”)

1. Установите PostgreSQL и pgAdmin: https://www.postgresql.org/download/
2. Создайте БД в pgAdmin: Servers → PostgreSQL → Create → Database…
     - Name: `Quality_of_Sibgiu_DB`, Owner: `postgres`
3. В файле `.env` отключите Supabase (уберите `SUPABASE_URL`, `SUPABASE_KEY`) и укажите локальные настройки:
     ```env
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=Quality_of_Sibgiu_DB
     DB_USER=postgres
     DB_PASSWORD=ВАШ_ПАРОЛЬ
     # (или используйте одну строку)
     # DATABASE_URL=postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/Quality_of_Sibgiu_DB
     ```
4. Создайте таблицы и демо‑данные:
     ```bash
     pnpm run db:init
     ```
5. Запустите проект:
     ```bash
     pnpm dev
     ```

### Переключение между Supabase и локальным PostgreSQL

- Если заданы `SUPABASE_URL` и `SUPABASE_KEY` → используется Supabase.
- Иначе, если задан `DATABASE_URL` → используется он.
- Иначе используются дискретные `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`.


## Архитектурные заметки

- UI компонентный, с разделением на страницы и переиспользуемые компоненты (`ProgramsTable`, `SurveysTable`, `SurveyCard`, `Sidebar`).
- Стили — Tailwind CSS + утилиты для вариаций классов.
- Реактивные данные и кеширование — `@tanstack/react-query`.
- Серверная часть — Express; на Netlify обёрнута в serverless‑функцию (`netlify/functions/api.ts`).

## Команды разработки

- Линт/формат: проект использует Prettier. ESLint можно добавить при необходимости.
- Тесты: Vitest (`pnpm test`).


## Контакты/поддержка

- Вопросы и предложения: создавайте Issues в GitHub
