# Itunus Backend (Strapi v5)

Production-ready Strapi v5.31 backend powering the Itunus content platform. Phase 1 delivered the validated core; Phase 2 hardened the runtime (persistent DB, AWS S3, Redis cache, observability); Phase 3 — completed here — adds turnkey deployment manifests plus automated endpoint verification so the frontend can rely on every contract.

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
| `npm run test` | Run Jest unit + integration suites (boots Strapi + performs CRUD smoke tests) |

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
| `AWS_*` | Enable S3 uploads/CDN delivery when key/secret/region/bucket are set |
| `DATABASE_FILENAME` | Local SQLite filename (defaults to `.tmp/data.db`, tests override with `.tmp/jest-data.db`) |
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

## Frontend Endpoint Contract

### Public read endpoints (no auth required)

- `GET /api/blog-posts` – paginated feed of published posts sorted by `publishedDate desc`.
- `GET /api/blog-posts/slug/:slug` – fetch a single published post by slug.
- `GET /api/blog-posts/tag/:tag` – case-insensitive tag filter.
- `GET /api/health` – health probe with uptime + DB latency.

### Authenticated write endpoints (API token)

Frontend admin experiences (create/edit/delete) should use Strapi API tokens:

1. Start the server (`npm run develop` or production build) and log into the Strapi Admin panel.
2. Navigate to **Settings → API Tokens → Create new API Token**.
3. Choose **Full access** (or **Custom** with `api::blog-post.blog-post` permissions) and copy the generated `Token` value once.
4. Use the token as a Bearer credential for any write operation.

Sample cURL workflow (replace `YOUR_API_TOKEN`):

```bash
# Create a blog post
curl -X POST http://localhost:1337/api/blog-posts \
	-H "Authorization: Bearer YOUR_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{
		"data": {
			"title": "Launch Notes",
			"slug": "launch-notes",
			"description": "Release summary",
			"content": "## Release notes",
			"status": "draft",
			"tags": ["product", "launch"],
			"publishedDate": "2025-12-01T00:00:00.000Z"
		}
	}'

# Update / publish a post
curl -X PUT http://localhost:1337/api/blog-posts/1 \
	-H "Authorization: Bearer YOUR_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{"data": {"status": "published", "tags": ["product"]}}'

# Delete a post
curl -X DELETE http://localhost:1337/api/blog-posts/1 \
	-H "Authorization: Bearer YOUR_API_TOKEN"
```

Lifecycle hooks automatically maintain slugs on changes and flush Redis/tag caches on any write.

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

- **Unit tests:** `src/utils/__tests__/env.test.ts` validates configuration parsing/normalization.
- **Integration tests:** `tests/blog-post.api.test.ts` boots Strapi (using the compiled `dist/` output) and exercises authenticated create/update/delete plus every public read endpoint via HTTP using a generated API token.
- **Lint + Format:** `npm run lint` / `npm run format` keep the TypeScript surface area clean.

Run everything locally:

```bash
npm run build   # ensures dist/ is fresh for integration tests
npm run test
```

## Phase 2 & 3 Enhancements

- **S3 uploads:** Automatically switches to `@strapi/provider-upload-aws-s3` when AWS creds & bucket are supplied (keeps CDN-ready cache headers).
- **Redis caching:** Published article + tag lookups now use Redis/Upstash with TTL control and cache busting on create/update/delete.
- **Request correlation:** Custom middleware injects/returns `X-Request-ID` and emits structured `request.completed` / `request.failed` logs.
- **Self-ping scheduler:** Optional health pinger keeps free-tier dynos warm via `/api/health`.
- **Deployment manifests:** `render.yaml`, `railway.toml`, and `fly.toml` provide drop-in Infra-as-Code for the most common hosting targets (Render free tier, Railway, and Fly.io).
- **Automated CRUD smoke tests:** Jest integration test exercises create → publish → read → delete via HTTP so the frontend can trust the contract.

## Deployment Manifests

- **Render (`render.yaml`):** Deploys a Node web service plus managed Postgres. Set `APP_KEYS`, `*_SECRET`, AWS, and Redis variables through the Render dashboard; `DATABASE_URL` is auto-populated from the attached DB. Enable `SELF_PING_ENABLED=true` if you want the scheduler to offset Render's auto-sleep.
- **Railway (`railway.toml`):** Configures a Nixpacks build, healthy start command, and volume mount for local uploads (if you skip S3). Link a Railway Postgres plugin so `DATABASE_URL` resolves automatically.
- **Fly.io (`fly.toml`):** Exposes ports 80/443, keeps the Node process on port 8080, and mounts the `strapi_uploads` volume to persist files when not using S3. Run `fly launch --copy-config` to create the app, then `fly secrets set` for all sensitive env vars.

Each manifest expects `npm run build` during CI/CD and `npm run start` for the runtime.

## Observability & Security Defaults

- Dynamic CORS middleware allows localhost plus Render/Fly domains (and can be extended via `CORS_ORIGINS`).
- Security middleware enforces CSP, HSTS, XSS filter, and strict frame-guarding.
- Structured health response includes database latency plus uptime markers for dashboards.
- Request-level logging captures method/path/status/duration with correlation IDs for downstream tracing.

## Next Steps

- Phase 1 & 2: ✅ delivered.
- Phase 3: ✅ (deployment manifests, CRUD integration tests, documentation refresh).
- Optional future work: add preview/draft tokens, CDN cache headers, GraphQL schema exposure, or CI workflows that run lint → build → tests on pull requests.
# website_backend
