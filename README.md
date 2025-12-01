# Itunus Backend (Strapi v5)

Production-ready Strapi v5.31 backend powering the Itunus content platform. Phase 1 delivers a robust local setup with strict configuration validation, a complete Blog Post content model, and operational health monitoring.

## Requirements

- Node.js 20+
- npm 9+
- SQLite (bundled) or any SQL database reachable via `DATABASE_URL`

## Getting Started

```bash
# install dependencies
npm install

# start Strapi in watch mode
npm run develop

# build admin & server for production
npm run build

# start the compiled server
npm start
```

### Helpful Scripts

| Script | Purpose |
| --- | --- |
| `npm run develop` | Start Strapi with auto-reload |
| `npm run build` | Compile admin panel & server |
| `npm start` | Launch production server |
| `npm run lint` | ESLint with type-aware rules |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run Jest test suite |

## Environment Configuration

All secrets live in `.env`. Copy `.env.example`, update the blanks, and keep secrets out of git.

| Variable | Description |
| --- | --- |
| `HOST` / `PORT` | Bind address for the HTTP server |
| `APP_KEYS` | Comma-separated list of Strapi application keys |
| `API_TOKEN_SALT` | Salt used for API tokens |
| `ADMIN_JWT_SECRET` | Secret for the admin panel JWT |
| `TRANSFER_TOKEN_SALT` | Salt for transfer tokens |
| `JWT_SECRET` | Front-office JWT secret (if used) |
| `DATABASE_URL` | Optional connection string (`postgres://`, `mysql://`, `sqlite://`) |
| `DATABASE_CLIENT` + granular fields | Fallback discrete DB configuration |
| `CORS_ORIGINS` | Optional comma-separated list of allowed origins |

Boot-time validation (powered by Zod) fails fast when required values are missing, ensuring misconfigurations never reach runtime.

## Blog Post API

- Collection type with title, slug, description, rich content, tags, featured image, publish status, and metadata.
- Public read endpoints:
	- `GET /api/blog-posts` – paginated feed of published posts only.
	- `GET /api/blog-posts/slug/:slug` – fetch a single published post by slug.
	- `GET /api/blog-posts/tag/:tag` – filter published posts by tag.
- All write operations remain authenticated (handled via Strapi role permissions).

## Health Endpoint

`GET /api/health` returns:

```json
{
	"status": "ok",
	"uptimeSeconds": 1234,
	"nodeVersion": "v20.11.0",
	"strapiVersion": "5.31.2",
	"timestamp": "2025-12-01T00:00:00.000Z",
	"database": {
		"status": "up",
		"latencyMs": 4
	}
}
```

Use it for uptime monitoring, load balancer health checks, or synthetic pings.

## Testing & Quality Gates

- **Unit tests:** `npm run test` executes Jest with ts-jest, currently covering environment validation (extend with services/controllers as they evolve).
- **Linting:** `npm run lint` runs ESLint (type-aware) with Prettier integration.
- **Formatting:** `npm run format` enforces consistent code style.

## Observability & Security Defaults

- Dynamic CORS middleware allows localhost plus Render/Fly domains (and can be extended via `CORS_ORIGINS`).
- Security middleware enforces CSP, HSTS, XSS filter, and strict frame-guarding.
- Structured health response includes database latency plus uptime markers for dashboards.

## Next Steps

- Phase 2: provision S3 upload provider, Redis caching, scheduled self-pings, and structured request logging.
- Phase 3: add deployment manifests (Render/Railway/Fly.io), deeper test coverage, and turnkey documentation.
