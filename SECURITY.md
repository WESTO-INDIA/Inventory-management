# Security Enhancements

This document outlines the security improvements implemented in the Inventory Management System.

## Overview

The application has been enhanced with enterprise-grade security features to protect against common web vulnerabilities and attacks.

## Security Features Implemented

### 1. **Input Validation & Sanitization**

#### Validation Middleware (`server/src/middleware/validator.ts`)
- **Email validation**: RFC-compliant email format checking with length limits
- **Username validation**: Alphanumeric with hyphens/underscores, 3-50 characters
- **Password validation**: 6-200 character length enforcement
- **MongoDB ObjectId validation**: Ensures valid database identifiers
- **Age validation**: Employee age must be between 16-100 years

#### Sanitization Middleware (`server/src/middleware/sanitizer.ts`)
- **XSS Protection**: Strips HTML tags and script content from all inputs
- **NoSQL Injection Prevention**: Blocks MongoDB operators in user input
- **Request-wide sanitization**: Automatically sanitizes body, query, and params

### 2. **Rate Limiting**

#### Rate Limiter (`server/src/middleware/rateLimiter.ts`)
- **Authentication routes**: 5 attempts per 15 minutes (brute-force protection)
- **General API routes**: 100 requests per 15 minutes
- **Strict operations**: 10 requests per hour for sensitive operations
- In-memory store with automatic cleanup
- Configurable per-route limits

### 3. **Security Headers**

#### Helmet.js Integration
- Content Security Policy (CSP)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing prevention)
- Strict-Transport-Security (HSTS)
- X-XSS-Protection

### 4. **Authentication & Authorization**

#### Enhanced Auth Routes (`server/src/routes/auth.ts`)
- Rate-limited login attempts
- Input validation on all auth endpoints
- Secure JWT token generation (HS256 algorithm)
- 7-day token expiration
- Password hashing with bcrypt (10 salt rounds)
- Separate admin authentication via environment variables

#### Protected Routes
- Authentication middleware applied to all employee routes
- Token verification on protected endpoints
- Role-based access control support

### 5. **Environment Security**

#### Environment Validation (`server/src/utils/envValidator.ts`)
- Validates required environment variables on startup
- Checks JWT_SECRET strength (minimum 32 characters recommended)
- Checks ADMIN_PASSWORD strength (minimum 8 characters recommended)
- Warns about missing optional but recommended variables
- Prevents server start with missing critical configuration

**Required Environment Variables:**
- `MONGODB_URI` - Database connection string
- `JWT_SECRET` - Secret key for JWT signing
- `ADMIN_USERNAME` - Admin account username
- `ADMIN_PASSWORD` - Admin account password

**Recommended Environment Variables:**
- `CLIENT_URL` - Client application URL for CORS
- `SESSION_SECRET` - Session secret key
- `NODE_ENV` - Environment (development/production)

### 6. **Error Handling**

#### Error Handler (`server/src/utils/errorHandler.ts`)
- Custom error classes (ValidationError, AuthenticationError, etc.)
- Centralized error handling middleware
- Production vs development error details
- Comprehensive error logging
- Mongoose error handling (CastError, ValidationError, duplicate keys)
- JWT error handling (expired tokens, invalid tokens)

### 7. **Additional Security Measures**

- **MongoDB Injection Protection**: Using `express-mongo-sanitize`
- **Response Compression**: Using `compression` middleware for performance
- **CORS Configuration**: Strict origin policy in production
- **Request Size Limits**: 10MB limit on JSON and URL-encoded payloads
- **TypeScript Strict Mode**: Full type safety with strict compiler options

## Security Best Practices

### For Developers

1. **Always validate user input**: Use the validation middleware for all routes accepting user data
2. **Never store secrets in code**: Use environment variables for all sensitive data
3. **Use authentication middleware**: Protect all routes that require authentication
4. **Log security events**: Use the logger for authentication failures and suspicious activity
5. **Keep dependencies updated**: Regularly update npm packages for security patches

### For Deployment

1. **Set strong JWT_SECRET**: Minimum 32 characters, randomly generated
2. **Set strong ADMIN_PASSWORD**: Minimum 8 characters with mixed case, numbers, and symbols
3. **Configure CLIENT_URL**: Set to your actual client domain in production
4. **Enable HTTPS**: Always use HTTPS in production
5. **Set NODE_ENV=production**: Enables production security features
6. **Monitor logs**: Regularly review error and warning logs
7. **Use environment-specific .env files**: Never commit .env to version control

### Environment Setup

Create a `.env` file in the `server` directory:

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/inventory
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
ADMIN_USERNAME=admin
ADMIN_PASSWORD=SecureAdminPassword123!

# Recommended
PORT=4000
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```

## Security Checklist for Production

- [ ] All required environment variables are set
- [ ] JWT_SECRET is at least 32 characters and randomly generated
- [ ] ADMIN_PASSWORD is strong (8+ chars, mixed case, numbers, symbols)
- [ ] NODE_ENV is set to 'production'
- [ ] CLIENT_URL is set to actual client domain
- [ ] HTTPS is enabled
- [ ] Database connection uses authentication
- [ ] Logs are being monitored
- [ ] Dependencies are up to date
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled

## Monitoring & Logging

The application uses Winston for comprehensive logging:

- **Info logs**: Server startup, successful operations
- **Warning logs**: Rate limit exceeded, validation failures, missing optional config
- **Error logs**: Authentication failures, database errors, unhandled errors

Log locations:
- Console output (always)
- `error.log` - Error level logs (production only)
- `combined.log` - All logs (production only)

## Reporting Security Issues

If you discover a security vulnerability, please:

1. Do NOT open a public issue
2. Contact the development team directly
3. Provide detailed information about the vulnerability
4. Allow time for a fix before public disclosure

## Future Security Enhancements

Consider implementing:
- [ ] Redis-based rate limiting for distributed systems
- [ ] Two-factor authentication (2FA)
- [ ] Password reset functionality with email verification
- [ ] Account lockout after multiple failed attempts
- [ ] Security audit logging
- [ ] CSRF protection for state-changing operations
- [ ] Content Security Policy for uploaded files
- [ ] Regular security audits and penetration testing

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
