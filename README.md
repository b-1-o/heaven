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

## Zoom API Setup

Conference Rooms creates real Zoom meetings through **Server-to-Server OAuth**. No user-facing Zoom OAuth redirect is required for this flow.

### 1. Create a Server-to-Server OAuth app

Open the [Zoom App Marketplace](https://marketplace.zoom.us/) and:

1. Go to **Develop → Build an App**.
2. Select **Server-to-Server OAuth**.
3. Create the application.
4. On the **App Credentials** page, copy:
   - **Account ID**
   - **Client ID**
   - **Client Secret**
5. Under **Scopes**, add:
   - `meeting:write:admin`
   - `meeting:read:admin`
   - `meeting:delete:admin`
   - `user:read:admin`
6. Activate the application.

Zoom Server-to-Server OAuth uses the `account_credentials` grant to obtain an access token for server-side API requests. S2S OAuth does not use a refresh token; when the access token expires, HEAVEN requests a new one from `/oauth/token`.

HEAVEN creates meetings through the Zoom Meetings API endpoint `POST /v2/users/{userId}/meetings`, using the value of `ZOOM_USER_EMAIL` as the target Zoom user.

### 2. Environment variables

For local development, add the following to `.env.local`:

```env
ZOOM_ACCOUNT_ID=your-zoom-account-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
ZOOM_USER_EMAIL=owner@example.com
```

`ZOOM_USER_EMAIL` is the **email address of the Zoom account owner/user on whose account the meetings should be created**.

Never use `NEXT_PUBLIC_` for Zoom credentials and never commit real secrets to Git.

### 3. Configure Vercel

Open:

**Vercel → Project → Settings → Environment Variables**

Add:

| Variable | Value | Vercel type |
| --- | --- | --- |
| `ZOOM_ACCOUNT_ID` | Account ID from Zoom Marketplace | Config |
| `ZOOM_CLIENT_ID` | Client ID from Zoom Marketplace | Config |
| `ZOOM_CLIENT_SECRET` | Client Secret from Zoom Marketplace | **Secret** |
| `ZOOM_USER_EMAIL` | Email address of the Zoom account owner/user | Config |

Choose the environments where the app should have access to them: **Production**, **Preview**, and/or **Development**.

After changing environment variables, create a **new deployment / redeploy** so the new runtime receives the updated values.

### 4. How meeting creation works

The browser sends only:

`POST /api/zoom/create-meeting`

with:

- `topic`
- `startTime`
- `duration`
- `timezone`

The server then:

1. Verifies Clerk authentication.
2. Validates the topic, start time, duration, and timezone.
3. Gets a Server-to-Server OAuth access token.
4. Calls the Zoom API with a server-side Bearer token.
5. If Zoom returns **401**, clears the cached token, obtains a new token, and retries the original request **exactly once**.
6. If the retry also returns 401, the client receives a clear error such as `Zoom API error: 401 ...`.
7. For other non-2xx Zoom responses, the response body is logged server-side and the client receives HTTP **502** with an error in the format `Zoom API error: {status} {message}`.

The Zoom Client Secret and access token are never exposed to client-side JavaScript.

### 5. Conference Rooms

The **Conference Rooms** interface provides:

- Topic
- Start time
- Duration
- Timezone
- Create Zoom meeting
- Join URL
- Password
- Open in browser
- Copy link

The default timezone is detected with `Intl.DateTimeFormat().resolvedOptions().timeZone` when it is included in the supported timezone list. Otherwise, UTC is used.

### 6. Server-side deletion

S2S-created meetings are stored in `heaven_meetings` with `authMode: "s2s"` metadata.

Deleting a meeting uses the same server-side S2S OAuth client and never sends Zoom credentials to the browser.
