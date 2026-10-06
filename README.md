# HEAVEN

Developer command center — a full-stack workspace that brings GitHub repositories, engineering activity, deployments, meetings, integrations, and team collaboration into one focused interface.

Built with Next.js, Clerk, Neon PostgreSQL, Server-to-Server Zoom OAuth, GitHub OAuth, Discord, and Vercel.

## Live Demo

[heaven-b1o.vercel.app](https://heaven-b1o.vercel.app/)

![Preview](./preview.jpeg)

## Features

- GitHub repository and commit views
- Workspace and team management via Clerk Organizations
- GitHub OAuth integration
- Zoom meeting creation via Server-to-Server OAuth
- Discord event integration
- Neon PostgreSQL persistence
- Encrypted integration tokens
- Glass / fog inspired interface
- Authenticated API routes
- Vercel-ready production architecture

## Tech Stack

Next.js · React · TypeScript · Neon PostgreSQL · Clerk · GitHub OAuth · Zoom Server-to-Server OAuth · Discord · Vercel · Lucide React

## Architecture

- Next.js App Router with server-side API routes for authenticated operations.
- Clerk Organizations provide the workspace identity and tenant boundary.
- Database records keep created meetings available to the workspace.
- Zoom Client Secret and access tokens stay server-side.
- Zoom access tokens are cached in server memory until shortly before expiry.
- A failed Zoom API request with HTTP 401 causes exactly one forced token refresh and one retry.
- Static hosting is not sufficient — HEAVEN runs as a Next.js server application on Vercel.

## Getting Started

```bash
git clone https://github.com/b-1-o/heaven.git
cd heaven
npm install
npm run dev
```

## Настройка Zoom API

Conference Rooms создаёт настоящие Zoom-встречи через **Server-to-Server OAuth**. Пользовательский Zoom OAuth redirect для этого сценария не нужен.

### 1. Создайте Server-to-Server OAuth приложение

Откройте [Zoom App Marketplace](https://marketplace.zoom.us/) и:

1. Перейдите в **Develop → Build an App**.
2. Выберите **Server-to-Server OAuth**.
3. Создайте приложение.
4. На странице **App Credentials** сохраните:
   - **Account ID**
   - **Client ID**
   - **Client Secret**
5. В **Scopes** добавьте:
   - `meeting:write:admin`
   - `meeting:read:admin`
   - `meeting:delete:admin`
   - `user:read:admin`
6. Активируйте приложение.

Zoom документирует Server-to-Server OAuth как двухшаговый серверный flow: приложение получает access token через `account_credentials`, после чего использует этот токен для API-запросов. У S2S access token нет refresh token; новый токен получают повторным запросом к `/oauth/token`. Срок жизни токена — один час. 

Для создания встречи HEAVEN использует Zoom Meetings API `POST /v2/users/{userId}/meetings`, где `{userId}` задаётся значением `ZOOM_USER_EMAIL`. Zoom также указывает `meeting:write:admin` как scope для создания встреч.

### 2. Переменные окружения

Добавьте в локальный `.env.local`:

```env
ZOOM_ACCOUNT_ID=your-zoom-account-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
ZOOM_USER_EMAIL=owner@example.com
```

`ZOOM_USER_EMAIL` — **email владельца Zoom-аккаунта/пользователя, на котором должны создаваться встречи**.

Не используйте `NEXT_PUBLIC_` для Zoom credentials и никогда не коммитьте реальные секреты в Git.

### 3. Добавьте переменные в Vercel

Откройте:

**Vercel → Project → Settings → Environment Variables**

Добавьте:

| Variable | Value | Vercel type |
| --- | --- | --- |
| `ZOOM_ACCOUNT_ID` | Account ID из Zoom Marketplace | Config |
| `ZOOM_CLIENT_ID` | Client ID из Zoom Marketplace | Config |
| `ZOOM_CLIENT_SECRET` | Client Secret из Zoom Marketplace | **Secret** |
| `ZOOM_USER_EMAIL` | Email владельца Zoom-аккаунта | Config |

Выберите нужные окружения: **Production**, **Preview** и/или **Development**.

После изменения переменных окружения нужен **новый deployment / redeploy**, чтобы новый runtime получил значения.

### 4. Как работает создание

Браузер отправляет только:

`POST /api/zoom/create-meeting`

с:

- `topic`
- `startTime`
- `duration`
- `timezone`

Сервер:

1. Проверяет Clerk authentication.
2. Валидирует тему, дату, duration и timezone.
3. Получает S2S access token.
4. Вызывает Zoom с серверным Bearer token.
5. Если Zoom отвечает **401**, очищает кеш, получает новый access token и повторяет исходный запрос **ровно один раз**.
6. Если второй запрос тоже возвращает 401, клиент получает понятную ошибку `Zoom API error: 401 ...`.
7. При любом другом non-2xx ответе Zoom ошибка логируется только на сервере, а клиент получает статус **502** и сообщение формата `Zoom API error: {status} {message}`.

Client Secret и access token никогда не отправляются клиентскому JavaScript.

### 5. Conference Rooms

В разделе **Conference Rooms** доступны:

- Topic
- Start time
- Duration
- Timezone
- Create Zoom meeting
- Join URL
- Password
- Open in browser
- Copy link

Часовой пояс по умолчанию определяется через `Intl.DateTimeFormat().resolvedOptions().timeZone`, если он входит в поддерживаемый список. В противном случае используется UTC.

### 6. Server-side deletion

Созданные через S2S-встречи записываются в `heaven_meetings` с метаданными `authMode: "s2s"`.

Удаление использует тот же серверный S2S OAuth client и также выполняется только на сервере.
