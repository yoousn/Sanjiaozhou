# Sanjiaozhou (三角洲行动)

[简体中文](./README.zh-CN.md) | English

A full-stack website for firearm configuration management, automated video collection, and daily password display for the game *Delta Force* (三角洲行动). The project is powered by [server.ts](server.ts), which runs an Express backend and Vite frontend together. Data is persisted as JSON files, with some collection features relying on Python scripts.

## Tech Stack

- **Frontend:** React 19 + Vite 6 + Tailwind CSS 4
- **Backend:** Express + TypeScript
- **Data Storage:** Local JSON files / Server `runtime/` persistent files
- **Scripts:** Python (Bilibili video collection, daily password scraping)
- **Deployment:** GitHub Actions + SSH + Docker Compose

## Project Structure

| Path | Description |
|---|---|
| [server.ts](server.ts) | Server entry point — handles API routes, static assets, and runtime file I/O |
| [src/](src/) | Frontend pages and components |
| [server/](server/) | Backend routes and utility modules |
| [scripts/](scripts/) | Deployment scripts, collection configs, and log templates |
| `爬取每日密码.py` | Daily password scraping script |
| `runtime/` | Server-only runtime data directory (must **never** be overwritten by deployments) |
| [docs/](docs/) | Project rules, deployment guide, versioning, and optimization plans |
| [AGENTS.md](AGENTS.md) | Entry point for AI / CLI tool collaboration |

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Python 3
- Docker / Docker Compose (for deployment only)

### Common Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start local development server |
| `npm run lint` | Run type checking |
| `npm run build` | Build frontend for production |
| `npm run restart` | Kill port 3000 and restart dev server |

Default local address: `http://127.0.0.1:3000`

## Runtime Data

The application reads and writes the following data files at runtime:

- `data.json` — Firearm configuration data
- `daily_pwd.json` — Daily passwords
- `collect_settings.json` — Collection settings
- `auto_logs.json` — Automation logs
- `daily_pwd_logs.json` — Daily password scraping logs
- `auto_processed_videos.json` — Processed video records
- `cookies.txt` — Bilibili cookies
- `users.json` — User accounts
- `community_posts.json` — Community posts
- `community_activity.json` — Community activity data
- `community_comments.json` — Community comments

> **⚠️ Important:** In production, all runtime data files must reside under `/opt/xiujiao-era/runtime/` on the server and be individually bind-mounted into the container via Docker Compose. **Never** overwrite them with repository deployments.

## Deployment

Production deployments are fully automated via GitHub Actions on every push to `main`. The workflow SSHs into the server at `/opt/xiujiao-era` and runs [scripts/deploy_remote.sh](scripts/deploy_remote.sh):

```bash
docker-compose build
docker-compose up -d
docker image prune -f
```

> **🚫 Never** run `docker-compose down` before updating. The deploy script performs a rolling update to avoid downtime.

## Documentation Index

| Document | Description |
|---|---|
| [AGENTS.md](AGENTS.md) | AI / CLI tool collaboration entry point |
| [docs/project-rules.md](docs/project-rules.md) | Project hard rules and product constraints |
| [docs/deployment.md](docs/deployment.md) | Deployment, runtime data, and GitHub Actions guide |
| [docs/versioning.md](docs/versioning.md) | Version numbering rules |
| [docs/release-notes.md](docs/release-notes.md) | Official release notes |
| [docs/optimization-plan.md](docs/optimization-plan.md) | Performance, image, pagination, CDN, compression, and security optimization plan |

## License

This project is private and not open-sourced.
