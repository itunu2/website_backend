# Security Guidelines

## Environment Variables

**CRITICAL**: Never commit `.env` files or expose secrets in your codebase.

### Required Secrets (Generate Securely)

```bash
# Generate secure random strings for these:
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

Required environment variables:
- `APP_KEYS` - Comma-separated keys for session encryption
- `API_TOKEN_SALT` - Salt for API token generation
- `ADMIN_JWT_SECRET` - Secret for admin JWT tokens
- `TRANSFER_TOKEN_SALT` - Salt for transfer tokens
- `JWT_SECRET` - Secret for user JWT tokens (if using auth)
- `ENCRYPTION_KEY` - For encrypting sensitive data

### Database Security

- Always use `DATABASE_SSL=true` in production
- Use strong database passwords (min 16 characters, mixed case, numbers, symbols)
- Restrict database access by IP/VPC when possible
- Never expose database port publicly

### API Security

- Keep `STRAPI_BLOG_API_TOKEN` in environment variables only
- Rotate API tokens regularly (every 90 days recommended)
- Use read-only tokens for frontend where possible

### AWS/S3 Security

- Use IAM roles/policies with minimal required permissions
- Enable S3 bucket encryption at rest
- Use CloudFront CDN with signed URLs for private content
- Set `AWS_ACL=public-read` only for truly public assets

### Redis Security

- Always use password-protected Redis instances
- Use TLS/SSL for Redis connections in production
- Store `REDIS_URL` with credentials in environment variables

## Deployment Checklist

Before deploying to production:

- [ ] All secrets set in hosting platform's environment variables
- [ ] `.env` files added to `.gitignore` (already done)
- [ ] `NODE_ENV=production` configured
- [ ] Database SSL enabled and validated
- [ ] CORS origins properly configured for your domain
- [ ] `PUBLIC_BASE_URL` set to your actual backend URL
- [ ] Admin dashboard secured with strong password
- [ ] API rate limiting enabled (if needed)
- [ ] Monitoring/logging configured
- [ ] Regular backups scheduled for database

## Security Headers

The following security headers are already configured in `config/middlewares.ts`:

- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- Referrer Policy
- Frame Protection

## Reporting Security Issues

If you discover a security vulnerability, please do NOT create a public issue.
Contact the repository owner directly.
