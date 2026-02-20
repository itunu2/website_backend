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

   # Optional: AWS S3 for file uploads
   AWS_ACCESS_KEY_ID=<your-key>
   AWS_SECRET_ACCESS_KEY=<your-secret>
   AWS_REGION=us-east-1
   AWS_BUCKET=<your-bucket>
   AWS_ACL=public-read

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
- Configure AWS S3 or use Render disk volumes
- Verify AWS credentials and bucket permissions

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
