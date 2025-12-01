# Turnkey Strapi v5.20 Backend Development Plan

This document outlines the phased approach to building a reusable, production-ready Strapi v5.20 TypeScript backend.

**Strategy:** Phase 1 establishes a fully functional, strictly validated core that is ready for local development and basic deployment. Phase 2 adds cloud-native features (S3, Redis) and resilience. Phase 3 focuses on "turnkey" deployment automation and documentation.

---

## Phase 1: The Robust Foundation (Core, Config, & Content)
**Goal:** A fully functional, locally runnable Strapi instance with strict configuration validation, the complete data model, and essential API endpoints. By the end of this phase, the application can be started, connected to any SQL database, and serve content.

### 1.1. Scaffolding & Tooling
*   **Generate Project:** Initialize Strapi v5.20 in `backend/` using TypeScript (ES2019).
*   **Dependencies:** Install core drivers (`pg`, `mysql2`, `sqlite3`) and dev tools (`zod`, `ts-node`, `typescript`).
*   **Scripts:** Add robust scripts to `package.json`:
    *   `npm run develop`: Start in watch mode.
    *   `npm run build`: Build admin and server.
    *   `npm start`: Production start.
    *   `npm run lint`: Run ESLint.
    *   `npm run format`: Run Prettier.
    *   `npm run test`: Run Jest.
*   **Git Configuration:** Create `.gitignore` excluding `.env`, `.tmp`, `build`, `dist`, `node_modules`, `public/uploads`.
*   **Testing Setup:** Configure `jest` with `ts-jest` and `tsconfig.json` to support unit testing of services.

### 1.2. The Configuration Engine (Crucial for "Turnkey")
*   **Environment Validation (`src/utils/env.ts`):**
    *   Implement a Zod schema to strictly validate all required environment variables at startup (`HOST`, `PORT`, `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `DATABASE_URL`).
    *   Fail fast with clear error messages if configuration is missing.
    *   Export a typed `env` object for use throughout the app.
*   **Dynamic Database Config (`config/database.ts`):**
    *   Logic to parse `DATABASE_URL`.
    *   Auto-switch between `postgres`, `mysql`, and `sqlite` clients based on the URL protocol.
    *   Default to local SQLite if no URL is provided.
*   **Server & Middleware Config:**
    *   `config/server.ts`: Bind host/port from validated env.
    *   `config/middlewares.ts`: Configure CORS (allowing Render/Fly domains), Security Headers, and CSP.

### 1.3. Content Architecture (Blog Post)
*   **Schema Definition:** Create the `Blog Post` Collection Type (`src/api/blog-post/content-types/blog-post/schema.json`) with:
    *   `title` (String, required)
    *   `slug` (UID, required, unique)
    *   `description` (Text)
    *   `content` (Rich Text / Blocks)
    *   `tags` (JSON or Component for array of strings)
    *   `publishedDate` (Datetime)
    *   `status` (Enumeration: `draft`, `published`)
    *   `featuredImage` (Media)
    *   `isFeatured` (Boolean)
*   **Service Layer (`src/api/blog-post/services/blog-post.ts`):**
    *   Implement `findPublished(slug)`: Returns a post only if status is 'published'.
    *   Implement `findByTag(tag)`: Filters posts by tag.
*   **Controller Layer (`src/api/blog-post/controllers/blog-post.ts`):**
    *   Extend core controllers.
    *   Sanitize output using `sanitize.contentAPI.output`.
    *   Return proper 404s for unpublished content.
*   **Routes:** Configure public access for read operations and authenticated access for write operations.

### 1.4. Observability
*   **Health Endpoint (`src/api/health`):**
    *   Create a dedicated route `/api/health`.
    *   Controller returns: System Uptime, Node Version, Strapi Version, and Database Connection Status (simple `SELECT 1` check).

---

## Phase 2: Production Capabilities (Storage, Caching, & Resilience)
**Goal:** Enhance the application for production environments by adding cloud storage, caching strategies, and self-healing mechanisms.

### 2.1. Cloud Storage (AWS S3)
*   **Provider Setup:** Install `@strapi/provider-upload-aws-s3`.
*   **Conditional Config (`config/plugins.ts`):**
    *   Check for `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET`.
    *   If present, enable S3 provider with `public-read` ACL.
    *   If missing, fall back gracefully to local disk storage (and log a warning).

### 2.2. Performance (Caching)
*   **Redis/Upstash Integration:**
    *   Add Redis configuration to `env.ts` (Zod optional).
    *   Implement a caching wrapper in `src/api/blog-post/services/blog-post.ts`.
    *   Cache `findPublished` requests with a configurable TTL.
    *   Implement cache invalidation hooks on Post update/delete.

### 2.3. Resilience & Logging
*   **Self-Ping Scheduler:**
    *   Modify `src/index.ts` bootstrap function.
    *   Add a `cron` job (or `setInterval`) to ping the health endpoint every 10 minutes (prevents sleeping on free tiers like Render).
    *   Guard this feature with a `SELF_PING_ENABLED` env var.
*   **Structured Logging:**
    *   Enhance default logger to include Request IDs in production logs.

---

## Phase 3: Deployment Ecosystem (Manifests & Final Polish)
**Goal:** Provide the "Turnkey" experience with drop-in deployment configurations and comprehensive documentation.

### 3.1. Deployment Manifests (Infrastructure as Code)
*   **Render (`render.yaml`):** Define the web service, build command, start command, and managed PostgreSQL database.
*   **Railway (`railway.toml`):** Define build/deploy phases and health check path.
*   **Fly.io (`fly.toml`):** Define app config, regions, and volume mounts for SQLite/Uploads (if not using S3).

### 3.2. Documentation & Testing
*   **README.md:**
    *   "Quick Start" for local dev.
    *   "Deploy to Production" guides for each provider.
    *   Environment Variable Reference (copy-paste ready).
*   **Testing:**
    *   Write unit tests for `src/utils/env.ts` (ensure validation works).
    *   Write integration tests for the `Blog Post` API (ensure published/draft logic holds).

### 3.3. Final Review
*   **Security Audit:** Verify no secrets are leaked in API responses.
*   **Build Check:** Ensure `npm run build` passes with strict TypeScript settings.
