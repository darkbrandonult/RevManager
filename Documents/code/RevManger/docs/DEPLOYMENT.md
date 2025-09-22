# Deployment Guide for RevManager

This guide provides comprehensive instructions for deploying the RevManager restaurant management PWA to production environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Frontend Deployment](#frontend-deployment)
  - [Netlify Deployment](#netlify-deployment)
  - [Vercel Deployment](#vercel-deployment)
- [Backend Deployment](#backend-deployment)
  - [Railway Deployment](#railway-deployment)
  - [Render Deployment](#render-deployment)
  - [DigitalOcean App Platform](#digitalocean-app-platform)
- [Database Setup](#database-setup)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## Overview

RevManager is split into two main components:
- **Frontend**: React PWA built with Vite (can be deployed to static hosting)
- **Backend**: Node.js Express API (requires server hosting with database)

## Prerequisites

Before deploying, ensure you have:
- [ ] Git repository with your RevManager code
- [ ] Node.js 18+ installed locally
- [ ] PostgreSQL database (local or cloud)
- [ ] Environment variables configured
- [ ] All tests passing (`npm run test:ci`)

## Environment Configuration

### 1. Frontend Environment Variables

Create production environment files:

```bash
# .env.production (frontend)
VITE_API_URL=https://your-backend-domain.com
VITE_SOCKET_URL=https://your-backend-domain.com
VITE_APP_NAME=RevManager
VITE_APP_VERSION=1.0.0
```

### 2. Backend Environment Variables

```bash
# .env.production (server)
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secure-jwt-secret-256-bits-minimum
CORS_ORIGIN=https://your-frontend-domain.com
REDIS_URL=redis://username:password@host:port
SESSION_SECRET=your-session-secret-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Frontend Deployment

### Netlify Deployment

#### Option 1: Git Integration (Recommended)

1. **Connect Repository**
   ```bash
   # Push your code to GitHub/GitLab
   git push origin main
   ```

2. **Configure Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "New site from Git"
   - Connect your repository
   - Configure build settings:
     ```
     Build command: npm run build
     Publish directory: dist
     Base directory: client
     ```

3. **Set Environment Variables**
   - In Netlify dashboard: Site Settings → Environment Variables
   - Add all `VITE_*` variables from your `.env.production`

4. **Configure Redirects**
   Create `client/public/_redirects`:
   ```
   /*    /index.html   200
   /api/*  https://your-backend-domain.com/api/:splat  200
   ```

#### Option 2: Manual Deploy

```bash
# Build and deploy manually
cd client
npm run build
npx netlify-cli deploy --prod --dir=dist
```

### Vercel Deployment

#### Option 1: Git Integration (Recommended)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository

2. **Configure Build Settings**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "rootDirectory": "client"
   }
   ```

3. **Set Environment Variables**
   - In project settings, add all `VITE_*` variables

4. **Configure Rewrites**
   Create `client/vercel.json`:
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://your-backend-domain.com/api/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

#### Option 2: Vercel CLI

```bash
# Install and deploy
npm i -g vercel
cd client
vercel --prod
```

## Backend Deployment

### Railway Deployment

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Initialize Project**
   ```bash
   cd server
   railway init
   railway link
   ```

3. **Configure Environment**
   ```bash
   # Set environment variables
   railway variables set NODE_ENV=production
   railway variables set JWT_SECRET=your-jwt-secret
   railway variables set CORS_ORIGIN=https://your-frontend-domain.com
   ```

4. **Add Database**
   ```bash
   # Add PostgreSQL service
   railway add postgresql
   # Railway will automatically set DATABASE_URL
   ```

5. **Deploy**
   ```bash
   railway up
   ```

6. **Custom Domain (Optional)**
   - Go to Railway dashboard
   - Settings → Domains → Add custom domain

### Render Deployment

1. **Connect Repository**
   - Go to [Render Dashboard](https://render.com)
   - New → Web Service
   - Connect your repository

2. **Configure Service**
   ```yaml
   # render.yaml (optional)
   services:
     - type: web
       name: revmanager-backend
       env: node
       buildCommand: npm install
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: JWT_SECRET
           generateValue: true
         - key: CORS_ORIGIN
           value: https://your-frontend-domain.com
   ```

3. **Add Database**
   - New → PostgreSQL
   - Connect to your web service
   - Copy the DATABASE_URL to your environment variables

4. **Configure Environment Variables**
   - In service settings, add all required environment variables

### DigitalOcean App Platform

1. **Create App**
   ```bash
   doctl apps create --spec app.yaml
   ```

2. **Configure App Spec**
   Create `app.yaml`:
   ```yaml
   name: revmanager
   services:
   - name: backend
     source_dir: /server
     github:
       repo: your-username/revmanager
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: NODE_ENV
       value: production
     - key: JWT_SECRET
       type: SECRET
       value: your-jwt-secret
   - name: frontend
     source_dir: /client
     github:
       repo: your-username/revmanager
       branch: main
     build_command: npm run build
     environment_slug: node-js
     static_sites:
     - name: frontend
       source_dir: /dist
   databases:
   - name: revmanager-db
     engine: PG
     version: "14"
   ```

## Database Setup

### Production Database Options

#### 1. Railway PostgreSQL
```bash
railway add postgresql
# DATABASE_URL is automatically configured
```

#### 2. Render PostgreSQL
- Create PostgreSQL service in Render dashboard
- Copy connection string to DATABASE_URL

#### 3. Supabase (Recommended)
```bash
# Sign up at supabase.com
# Create new project
# Copy connection string from Settings → Database
```

#### 4. AWS RDS
```bash
# Create RDS PostgreSQL instance
# Configure security groups for backend access
# Use connection string in DATABASE_URL
```

### Database Migration

After deploying backend with database:

```bash
# Run database setup
railway run npm run setup-db:prod
# or
curl -X POST https://your-backend-domain.com/api/setup-db
```

## Docker Deployment

### Single Container Deployment

1. **Build and Push Image**
   ```bash
   # Build production image
   docker build -t revmanager-backend ./server
   docker build -t revmanager-frontend ./client
   
   # Push to registry (Docker Hub, ECR, etc.)
   docker tag revmanager-backend your-registry/revmanager-backend:latest
   docker push your-registry/revmanager-backend:latest
   ```

2. **Deploy to Container Platform**
   - AWS ECS/Fargate
   - Google Cloud Run
   - DigitalOcean Container Registry

### Docker Compose Deployment

```bash
# On your server
git clone your-repository
cd RevManger
cp .env.example .env.production
# Edit .env.production with production values
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

Create Kubernetes manifests:

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: revmanager-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: revmanager-backend
  template:
    metadata:
      labels:
        app: revmanager-backend
    spec:
      containers:
      - name: backend
        image: your-registry/revmanager-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: revmanager-secrets
              key: database-url
```

## Environment Variables

### Required Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret | `your-256-bit-secret` |
| `CORS_ORIGIN` | Frontend domain | `https://app.example.com` |

### Optional Backend Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection | None (optional) |
| `SESSION_SECRET` | Session secret | Auto-generated |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit | `100` |

### Required Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.example.com` |
| `VITE_SOCKET_URL` | Socket.io URL | `https://api.example.com` |

## Post-Deployment

### 1. Verify Deployment

```bash
# Check frontend
curl https://your-frontend-domain.com

# Check backend health
curl https://your-backend-domain.com/health

# Check API endpoints
curl https://your-backend-domain.com/api/auth/check
```

### 2. Database Setup

```bash
# Initialize database schema
curl -X POST https://your-backend-domain.com/api/setup-db
```

### 3. Test Core Functionality

- [ ] User registration/login
- [ ] Dashboard loads correctly
- [ ] Order management works
- [ ] Inventory tracking functions
- [ ] Real-time updates via Socket.io
- [ ] PWA installation prompt
- [ ] Offline functionality

### 4. Performance Optimization

```bash
# Check Lighthouse scores
npx lighthouse https://your-frontend-domain.com --view

# Monitor backend performance
curl https://your-backend-domain.com/api/health
```

## Monitoring & Maintenance

### Application Monitoring

1. **Frontend Monitoring**
   - Google Analytics
   - Sentry for error tracking
   - Web Vitals monitoring

2. **Backend Monitoring**
   - Application logs
   - Database performance
   - API response times
   - Error rates

### Logging Setup

```javascript
// Add to server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### Backup Strategy

```bash
# Database backups (daily)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Automated backups with Railway
railway run pg_dump $DATABASE_URL | gzip > backup.sql.gz
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   ```javascript
   // Ensure CORS_ORIGIN matches frontend domain exactly
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

2. **Database Connection Failed**
   ```bash
   # Test database connection
   railway run node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()', (err, res) => { console.log(err ? err : res.rows[0]); pool.end(); });"
   ```

3. **JWT Token Issues**
   ```bash
   # Ensure JWT_SECRET is at least 32 characters
   openssl rand -base64 32
   ```

4. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

### Health Check Endpoints

Add to your backend:

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

### Debugging Commands

```bash
# View deployment logs
railway logs

# Check service status
railway status

# Connect to production database
railway connect postgresql
```

## Security Checklist

- [ ] HTTPS enabled on all domains
- [ ] Environment variables secured
- [ ] Database connection encrypted
- [ ] JWT secrets rotated regularly
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation in place
- [ ] SQL injection protection
- [ ] XSS protection headers
- [ ] Regular dependency updates

## Performance Checklist

- [ ] Frontend assets minimized and gzipped
- [ ] Images optimized
- [ ] CDN configured (optional)
- [ ] Database queries optimized
- [ ] Caching strategy implemented
- [ ] Error handling in place
- [ ] Monitoring configured

---

## Quick Deploy Commands

### Frontend to Netlify
```bash
cd client && npm run build && npx netlify-cli deploy --prod --dir=dist
```

### Backend to Railway
```bash
cd server && railway up
```

### Full Docker Deploy
```bash
docker-compose -f docker-compose.prod.yml up -d
```

This completes the comprehensive deployment guide for RevManager. Choose the deployment strategy that best fits your needs and infrastructure requirements.
