# Deployment Guide

## Render Deployment

### Step 1: Prepare Your Repository

1. Ensure all code is committed to Git
2. Push to GitHub/GitLab/Bitbucket

```bash
git add .
git commit -m "Initial commit - Shopify aXcelerate integration"
git push origin main
```

### Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up or log in
3. Connect your Git repository

### Step 3: Create PostgreSQL Database

1. From Render Dashboard, click **New +**
2. Select **PostgreSQL**
3. Configuration:
   - **Name**: `shopify-axcelerate-db`
   - **Database**: `shopify_axcelerate`
   - **User**: `axcelerate_user`
   - **Region**: Choose closest to your location
   - **Plan**: Starter ($7/month) or Free (for testing)
4. Click **Create Database**
5. Wait for database to be ready
6. Copy the **Internal Database URL** (starts with `postgresql://`)

### Step 4: Create Web Service

1. From Render Dashboard, click **New +**
2. Select **Web Service**
3. Connect to your repository
4. Configuration:
   - **Name**: `shopify-axcelerate-integration`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: Leave empty (or path to your app)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter ($7/month) or Free (spins down after inactivity)

### Step 5: Configure Environment Variables

In the **Environment** section, add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | |
| `DATABASE_URL` | _From database_ | Use Internal URL |
| `SHOPIFY_WEBHOOK_SECRET` | _Your secret_ | From Shopify app |
| `SHOPIFY_API_KEY` | _Your key_ | From Shopify app |
| `SHOPIFY_API_SECRET` | _Your secret_ | From Shopify app |
| `SHOPIFY_STORE_DOMAIN` | `yourstore.myshopify.com` | |
| `AXCELERATE_API_URL` | `https://yourdomain.stg.axcelerate.com/api` | |
| `AXCELERATE_API_TOKEN` | _Your token_ | From aXcelerate |
| `AXCELERATE_WS_TOKEN` | _Your token_ | From aXcelerate |
| `MAX_RETRY_ATTEMPTS` | `3` | Optional |
| `RETRY_DELAY_MS` | `1000` | Optional |

### Step 6: Deploy

1. Click **Create Web Service**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Run migrations
   - Start the application
3. Monitor the logs for any errors
4. Once deployed, note your service URL: `https://your-app.onrender.com`

### Step 7: Initialize Database

If migrations didn't run automatically:

1. Go to your Web Service in Render
2. Click **Shell** tab
3. Run: `npm run migrate`

### Step 8: Configure Shopify Webhook

1. Go to your Shopify app settings
2. Navigate to **Webhooks**
3. Create webhook:
   - **Event**: `Order payment`
   - **Format**: `JSON`
   - **URL**: `https://your-app.onrender.com/webhook/shopify`
   - **API Version**: Latest
4. Save webhook secret and update `SHOPIFY_WEBHOOK_SECRET` in Render

### Step 9: Test the Integration

1. Access admin dashboard: `https://your-app.onrender.com/admin`
2. Add a product mapping
3. Make a test purchase in Shopify
4. Check sync logs in the admin dashboard

## Alternative: Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose (with PostgreSQL)

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/shopify_axcelerate
      - SHOPIFY_WEBHOOK_SECRET=${SHOPIFY_WEBHOOK_SECRET}
      - SHOPIFY_API_KEY=${SHOPIFY_API_KEY}
      - SHOPIFY_API_SECRET=${SHOPIFY_API_SECRET}
      - SHOPIFY_STORE_DOMAIN=${SHOPIFY_STORE_DOMAIN}
      - AXCELERATE_API_URL=${AXCELERATE_API_URL}
      - AXCELERATE_API_TOKEN=${AXCELERATE_API_TOKEN}
      - AXCELERATE_WS_TOKEN=${AXCELERATE_WS_TOKEN}
    depends_on:
      - db
    command: sh -c "npm run migrate && npm start"

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=shopify_axcelerate
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose up -d
```

## Post-Deployment Checklist

- [ ] Database is connected and initialized
- [ ] Admin dashboard is accessible
- [ ] Environment variables are set correctly
- [ ] Shopify webhook is configured
- [ ] Product mappings are created
- [ ] Test order processed successfully
- [ ] Logs show successful enrolments in aXcelerate

## Monitoring

### Check Service Health

```bash
curl https://your-app.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-27T...",
  "service": "shopify-axcelerate-integration"
}
```

### View Logs

In Render:
1. Go to your Web Service
2. Click **Logs** tab
3. View real-time logs

### Set Up Alerts (Optional)

Configure Render to send alerts on:
- Deploy failures
- Service downtime
- High error rates

## Scaling

For high-volume stores:

1. **Upgrade Render Plan**
   - Move to Professional or higher
   - Increase instances if needed

2. **Database Optimization**
   - Upgrade to Standard or Pro plan
   - Enable connection pooling

3. **Add Redis (Optional)**
   - For caching and job queues
   - Reduces database load

## Troubleshooting

### "Application failed to start"

Check logs for:
- Missing environment variables
- Database connection errors
- Port conflicts

### "Cannot connect to database"

Verify:
- `DATABASE_URL` is set correctly
- Database is in same region
- Using **Internal** database URL (not external)

### Webhook not receiving requests

Verify:
- Webhook URL is correct (HTTPS)
- Shopify webhook is active
- Service is not sleeping (Free tier)

### Migrations not running

Manually run:
```bash
# In Render Shell
npm run migrate
```

## Backup and Recovery

### Database Backups

Render automatically backs up PostgreSQL databases:
- Starter plan: Daily backups, 7-day retention
- Standard plan: Daily backups, 30-day retention
- Pro plan: Daily backups, 90-day retention

### Manual Backup

```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

## Updating the Application

1. Push changes to Git
2. Render automatically detects and deploys
3. Monitor logs for successful deployment
4. Run migrations if schema changed:
   ```bash
   npm run migrate
   ```

## Support

For deployment issues:
- Check Render documentation: [render.com/docs](https://render.com/docs)
- Review service logs in Render dashboard
- Test locally first with same environment variables

