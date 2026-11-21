# Bot Land

Bot Land is a web dashboard and GraphQL service for managing messaging bots.

| Directory | Role |
| --- | --- |
| [client/](client/) | React and Vite dashboard |
| [service/](service/) | GraphQL API and Railway provisioning |
| [providers/telegram/](providers/telegram/) | Telegram bot runtime |
| [providers/wa/](providers/wa/) | WhatsApp provider placeholder |

With pnpm 8, install dependencies with `pnpm install --frozen-lockfile` in each of the three Node.js packages. The packages keep their own lockfiles.

- **Client.** Set `VITE_BACKEND_SERVICE_URL` to the GraphQL endpoint and run `pnpm dev`.
- **Service.** Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` for persistence. Railway provisioning also uses `RAILWAY_API_URL`, `RAILWAY_API_TOKEN`, `RAILWAY_PROJECT`, `RAILWAY_ENV`, and `GITHUB_REPOSITORY`. Run `pnpm build` and `pnpm start`.
- **Telegram.** Set `TELEGRAM_BOT_TOKEN` and run `pnpm build` and `pnpm start` from the provider directory.

Keep credentials in local environment files or in the hosting platform's environment settings. The GraphQL service handles bot credentials and should run behind access controls.

Existing Railway deployments need to be pointed at this repository and the appropriate service directory. When provisioning a Telegram deployment from this repository, use `/providers/telegram` as its root directory.
