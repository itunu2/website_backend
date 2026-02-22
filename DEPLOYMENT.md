# Deployment Checklist

This guide helps you prepare the backend for deployment as a standalone repository.

## Pre-Deployment Security Checklist

- [x] All console.log statements wrapped with development checks
- [x] No hardcoded secrets or API keys in code
- [x] .env files properly ignored in .gitignore
- [x] Environment validation using Zod
- [x] CORS properly configured with dynamic origins
- [x] Security headers configured in middleware

## Environment Variables Setup

### Required Variables (Must Set)

1. **Generate Secrets** (run this command 5 times):
   ```bash
   node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
   ```

2. **Set in your hosting platform**:
   ```env
   NODE_ENV=production
   HOST=0.0.0.0
   PORT=10000  # Or your platform's port

   # Use the generated secrets above
   APP_KEYS="secret1,secret2,secret3,secret4"
   API_TOKEN_SALT=<generated>
   ADMIN_JWT_SECRET=<generated>
   TRANSFER_TOKEN_SALT=<generated>
   JWT_SECRET=<generated>
   ENCRYPTION_KEY=<generated>

   # Database (e.g., Supabase, Railway)
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   DATABASE_CLIENT=postgres
   DATABASE_SSL=true
   DATABASE_SSL_REJECT_UNAUTHORIZED=true

   # CORS - Your frontend domain
   CORS_ORIGINS="https://your-frontend.vercel.app"
   PUBLIC_BASE_URL=https://your-backend.onrender.com

   # Supabase Storage for file uploads
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   SUPABASE_STORAGE_BUCKET=strapi-uploads

   # Optional: Redis for caching
   REDIS_URL=redis://user:pass@host:6379
   CACHE_TTL_SECONDS=300
   ```

## Hosting Platforms

### Render (Recommended)
- Use the included `render.yaml` configuration
- Add environment variables in Render dashboard
- Database: Use Render PostgreSQL or external (Supabase)
- Set `sync: false` for all secret variables
- If you see `ENETUNREACH ... :5432`, remove any manually-set `DATABASE_URL` in Render so the Blueprint-managed DB URL is used
- Keep `NODE_OPTIONS=--dns-result-order=ipv4first` (set in `render.yaml`) to prefer IPv4 when DB hosts return dual-stack DNS

### Railway
- Use the included `railway.toml` configuration
- Link Railway PostgreSQL addon
- Add environment variables in Railway dashboard

### Fly.io
- Use the included `fly.toml` configuration
- Create Postgres cluster: `fly postgres create`
- Set secrets: `fly secrets set API_TOKEN_SALT=...`

## Post-Deployment Steps

1. **Test Health Endpoint**
   ```bash
   curl https://your-backend.com/api/health
   ```

2. **Access Admin Panel**
   - Navigate to: `https://your-backend.com/admin`
   - Create your first admin user

3. **Generate API Token**
   - Go to Settings → API Tokens
   - Create a read-only token for frontend
   - Add to frontend's `STRAPI_BLOG_API_TOKEN`

4. **Test API**
   ```bash
   curl https://your-backend.com/api/blog-posts?populate=*
   ```

## Monitoring

- Enable health check: `/api/health`
- Monitor error logs in your hosting dashboard
- Set up alerts for downtime
- Configure backups for database

## Troubleshooting

**Database Connection Issues**
- Verify DATABASE_URL format
- Check SSL settings match your provider
- Ensure database allows connections from hosting IP

**CORS Errors**
- Add frontend domain to CORS_ORIGINS
- Verify PUBLIC_BASE_URL is correct

**File Upload Issues**
- Configure Supabase Storage (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
- Verify Supabase Storage bucket exists and is public

## Security Best Practices

- Rotate secrets every 90 days
- Use strong database passwords
- Enable database SSL in production
- Keep dependencies updated
- Monitor for security vulnerabilities
- Regularly backup database

## See Also

- [SECURITY.md](./SECURITY.md) - Complete security guidelines
- [README.md](./README.md) - Development setup
- [Backend plan](./BACKEND_PLAN.md) - Architecture details
