# HEAVEN

> A developer command center for repositories, engineering activity, deployments, meetings, integrations, and team collaboration.

HEAVEN is a full-stack workspace designed to bring everyday developer operations into one focused interface. The product combines a glassmorphism UI with authenticated integrations and persistent workspace data.

## Features

- GitHub repository and commit views
- Workspace and team management
- Clerk Organizations integration
- GitHub OAuth integration
- Zoom meeting integration
- Discord event integration
- Neon PostgreSQL persistence
- Encrypted integration tokens
- Glass / fog inspired interface
- Authenticated API routes and OAuth callbacks
- Vercel-ready production architecture

## Tech Stack

- Next.js
- React
- TypeScript
- Neon PostgreSQL
- Clerk
- GitHub OAuth
- Zoom OAuth
- Vercel
- Lucide React

## Getting Started

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` and configure the required service credentials.

## Production

HEAVEN is designed to run as a Next.js server application. Static hosting is not sufficient because the application uses authenticated API routes and OAuth callbacks.

## Roadmap

- GitHub App installation and webhooks
- Background synchronization
- Token rotation and revocation UI
- Workspace audit logs
- More granular permissions and roles

## Project

**Live:** https://heaven-b1o.vercel.app/  
**Repository:** https://github.com/b-1-o/heaven