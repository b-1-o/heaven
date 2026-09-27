# HEAVEN

**HEAVEN is a Developer Command Center** — a fog / glass workspace that brings source control, engineering activity, deployments, meetings and team collaboration into one product.

## Product

- **Repositories** — connect GitHub and see the repositories available to the workspace.
- **Commits** — inspect recent commits directly from HEAVEN.
- **Teams** — create/switch workspaces with Clerk Organizations and invite members by email.
- **Meetings** — connect Zoom to create real Zoom meetings, or connect Discord and schedule server events.
- **Integrations** — one place to manage connected services.
- **Workspace data** — persisted in Neon Postgres.
- **Security** — OAuth tokens are encrypted before they are written to the database.
- **Glass UI** — the existing misty, translucent visual system stays intact.

## Stack

- Next.js 16.3
- React 19
- TypeScript
- Clerk
- Neon Postgres
- GitHub OAuth
- Zoom OAuth
- Discord OAuth + bot API
- Vercel for production

## Local

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill the service credentials.

## Production services

### Clerk

Enable email sign-up, email verification at sign-up, email sign-in, Organizations and Organization invitations.

### Neon

Create a Postgres database and set `DATABASE_URL`. HEAVEN creates its small application schema lazily on the first authenticated API request.

### GitHub

Create a GitHub OAuth App and use:

`https://YOUR-DOMAIN/api/integrations/github/callback`

The current implementation requests `read:user user:email repo`. GitHub notes that OAuth Apps are broad at repository scope; for a hardened multi-tenant product, the next security step is migrating the connector to a GitHub App with fine-grained permissions and webhooks.

### Zoom

Create a Zoom OAuth app and use:

`https://YOUR-DOMAIN/api/integrations/zoom/callback`

The app needs permission to create meetings for the connected user.

### Discord

Create a Discord application/bot, set the OAuth callback, install the bot in the target server, and give it the permissions required to create scheduled events.

## CI / deployment

GitHub Actions verifies:

```bash
npm install
npm run build
```

Production should run as a Next.js server application rather than a static GitHub Pages export because HEAVEN contains authenticated API routes and OAuth callbacks.

## Hardening roadmap

- GitHub App installation + webhook ingestion for pushes, pull requests, workflow runs and deployments.
- Background sync jobs.
- Encrypted token rotation and revocation UI.
- Audit log storage for workspace actions.
- Fine-grained organization roles and permissions.
