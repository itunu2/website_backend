# Itunus Backend (Strapi v5)

Production-ready Strapi v5.31 backend powering the Itunus content platform. Phase 1 delivered the validated core; Phase 2 (this build) adds persistent database guidance, AWS S3 uploads, Redis caching, structured logging, and self-healing pings.

## Requirements

- Node.js 20+
- npm 9+
- Postgres/MySQL instance reachable via `DATABASE_URL` (SQLite only for smoke tests)

## Getting Started

```bash
# install dependencies
npm install

# run Postgres locally (persistent volume)
docker compose -f docker-compose.db.yml up -d

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
| `npm run develop` | Start Strapi with auto-reload (DB must be running) |
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
| `AWS_*` | Enable S3 uploads when key/secret/region/bucket are set |
| `REDIS_URL` / `CACHE_TTL_SECONDS` | Toggle Redis/Upstash caching and TTL |
| `SELF_PING_*`, `PUBLIC_BASE_URL` | Configure background health pings |
| `CORS_ORIGINS` | Optional comma-separated list of allowed origins |

Boot-time validation (powered by Zod) fails fast when required values are missing, ensuring misconfigurations never reach runtime.

## Persistent Database (required)

SQLite remains helpful for quick smoke tests, but production and shared environments must run against a durable SQL engine. For local persistence spin up Postgres with the bundled compose file:

```bash
docker compose -f docker-compose.db.yml up -d
```

This seeds a Postgres 16 instance with a volume (`db-data`) so entries survive container restarts. Update `.env` with the same credentials (see `.env.example`) and rotate the default passwords for non-local usage.

## Blog Post API

- Collection type with title, slug, description, rich content, tags, featured image, publish status, and metadata.
- Slugs auto-generate from the title via lifecycles and stay in sync when titles change.
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

## Phase 2 Enhancements

- **S3 uploads:** Automatically switches to `@strapi/provider-upload-aws-s3` when AWS creds & bucket are supplied (keeps CDN-ready cache headers).
- **Redis caching:** Published article + tag lookups now use Redis/Upstash with TTL control and cache busting on create/update/delete.
- **Request correlation:** Custom middleware injects/returns `X-Request-ID` and emits structured `request.completed` / `request.failed` logs.
- **Self-ping scheduler:** Optional health pinger keeps free-tier dynos warm via `/api/health`.

## Observability & Security Defaults

- Dynamic CORS middleware allows localhost plus Render/Fly domains (and can be extended via `CORS_ORIGINS`).
- Security middleware enforces CSP, HSTS, XSS filter, and strict frame-guarding.
- Structured health response includes database latency plus uptime markers for dashboards.
- Request-level logging captures method/path/status/duration with correlation IDs for downstream tracing.

## Next Steps

- Phase 2: ✅ delivered with this update.
- Phase 3: add deployment manifests (Render/Railway/Fly.io), deeper test coverage, and turnkey documentation.
