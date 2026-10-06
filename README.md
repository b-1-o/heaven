# HEAVEN


Developer command center — a full-stack workspace that brings GitHub repositories, engineering activity, deployments, meetings, integrations, and team collaboration into one focused interface.

Built with Next.js, Clerk Organizations, Neon PostgreSQL, and OAuth integrations (GitHub, Zoom).

## Live Demo
 [heaven-b1o.vercel.app](https://heaven-b1o.vercel.app/)


![Preview](./preview.jpeg)


## Features
- GitHub repository and commit views
- Workspace and team management via Clerk Organizations
- GitHub OAuth integration
- Zoom meeting integration (launches in desktop app)
- Discord event integration
- Neon PostgreSQL persistence
- Encrypted integration tokens
- Glass / fog inspired interface
- Authenticated API routes and OAuth callbacks
- Vercel-ready production architecture

## Tech Stack
Next.js · React · TypeScript · Neon PostgreSQL · Clerk · GitHub OAuth · Zoom OAuth · Discord · Vercel · Lucide React

## Architecture
- Next.js App Router with server-side API routes for authenticated operations.
- Clerk Organizations handle multi-tenant workspaces; each org has its own integrations and data scope.
- OAuth tokens are encrypted before being stored in Neon PostgreSQL.
- GitHub and Zoom data is fetched via their APIs using the stored tokens.
- Static hosting is not sufficient — the app requires authenticated API routes and OAuth callbacks, so it runs as a Next.js server application on Vercel.

## Getting Started
```bash
git clone https://github.com/b-1-o/heaven.git
cd heaven
npm install


## Настройка Zoom API

Раздел **Conference Rooms** создаёт настоящие Zoom-встречи через Server-to-Server OAuth. Пользовательский OAuth-редирект для этого сценария не нужен.

### 1. Создайте Server-to-Server OAuth приложение в Zoom

1. Войдите в [Zoom App Marketplace](https://marketplace.zoom.us/).
2. Откройте **Develop** → **Build an App**.
3. Выберите **Server-to-Server OAuth** и нажмите **Create**.
4. На странице **App Credentials** скопируйте Account ID, Client ID и Client Secret.
5. На вкладке **Scopes** добавьте `meeting:write:admin` и `meeting:read:admin`.
6. Активируйте приложение.

Zoom документирует Server-to-Server OAuth как flow без пользовательского взаимодействия: сервер получает access token через `account_credentials`, а затем использует его для API-запросов. Такой access token действует около часа и при необходимости запрашивается заново. Для создания встреч используется meeting write scope, включая `meeting:write:admin`.

### 2. Добавьте переменные в Vercel

Откройте **Vercel → Project → Settings → Environment Variables** и добавьте:

| Variable | Value | Vercel type |
| --- | --- | --- |
| `ZOOM_ACCOUNT_ID` | Account ID из Zoom | Config |
| `ZOOM_CLIENT_ID` | Client ID из Zoom | Config |
| `ZOOM_CLIENT_SECRET` | Client Secret из Zoom | Secret |

Выберите нужные окружения, обычно **Production**, **Preview** и **Development**. После изменения переменных создайте новый deployment, чтобы значения попали в новый runtime. В актуальном Vercel для env vars доступны типы **Config** и **Secret**; Client Secret следует хранить как Secret.

### 3. Локально

Скопируйте значения в `.env.local`:

```env
ZOOM_ACCOUNT_ID=your-account-id
ZOOM_CLIENT_ID=your-client-id
ZOOM_CLIENT_SECRET=your-client-secret
```

Не используйте `NEXT_PUBLIC_` для Zoom credentials и не коммитьте реальные секреты.

### 4. Архитектура создания встречи

Браузер вызывает только `POST /api/zoom/create-meeting`.

Клиент отправляет `topic`, `startTime`, `duration` и, при необходимости, `timezone`. Next.js server route проверяет авторизацию Clerk, получает/кеширует S2S access token и сервером вызывает `POST https://api.zoom.us/v2/users/me/meetings`.

Клиенту возвращаются только публичные данные встречи: `id`, `join_url`, `password` и данные расписания. Zoom Client Secret и access token никогда не попадают в браузер.

### OAuth с пользовательским редиректом

В проекте всё ещё есть старый user-OAuth поток `/api/integrations/zoom/*`. Он не используется для создания встреч в **Conference Rooms**. Если позже понадобится подключать разные Zoom-аккаунты отдельных пользователей, для этого лучше использовать отдельное General OAuth-приложение и отдельные credentials, не смешивая их с S2S credentials. Для текущего сценария основной способ — Server-to-Server OAuth.