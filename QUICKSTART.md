# Quick Start Guide

Get the Shopify → aXcelerate integration running in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running (local or remote)
- aXcelerate API credentials
- Shopify custom app credentials

## 1. Install Dependencies

```bash
cd axcelerate
npm install
```

## 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required - Database
DATABASE_URL=postgresql://user:password@localhost:5432/shopify_axcelerate

# Required - Shopify
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com

# Required - aXcelerate
AXCELERATE_API_URL=https://yourdomain.stg.axcelerate.com/api
AXCELERATE_API_TOKEN=your_api_token
AXCELERATE_WS_TOKEN=your_ws_token
```

## 3. Initialize Database

```bash
npm run migrate
```

You should see:
```
✅ Database initialized
✅ Migrations completed successfully!
```

## 4. Start the Server

```bash
npm run dev
```

You should see:
```
✅ Database initialized
🚀 Server running on port 3000
📊 Admin dashboard: http://localhost:3000/admin
🪝 Webhook endpoint: http://localhost:3000/webhook/shopify
```

## 5. Access Admin Dashboard

Open your browser to: **http://localhost:3000/admin**

You should see the dashboard with empty statistics.

## 6. Add a Product Mapping

1. Click **"Product Mappings"** in the nav
2. Click **"+ Add Mapping"**
3. Fill in:
   - **Shopify Product ID**: `7234567890123` (from test order)
   - **Product Title**: `Advanced First Aid Training`
   - **aXcelerate Instance ID**: Get from your aXcelerate system
   - **Type**: `p`
4. Click **"Create Mapping"**

## 7. Test with Sample Order

```bash
curl -X POST http://localhost:3000/webhook/test
  -H "Content-Type: application/json" \
  -d @test-order.json
```

Expected response:
```json
{
  "success": true,
  "result": {
    "orderId": "5678901234567",
    "orderNumber": "#1234",
    "success": [...],
    "status": "success"
  }
}
```

## 8. Check the Results

Go back to the admin dashboard and click **"Sync Logs"**.

You should see your test order with:
- ✅ Status: **success**
- Contact ID from aXcelerate
- Enrolment ID (LEARNERID)

## 9. Configure Shopify Webhook (Production)

Once you're happy with testing:

1. Go to your Shopify app settings
2. Navigate to **Webhooks**
3. Create webhook:
   - **Event**: Order payment
   - **URL**: `https://your-domain.com/webhook/shopify`
   - **Format**: JSON
4. Save the webhook secret
5. Update `SHOPIFY_WEBHOOK_SECRET` in `.env`

## 10. Deploy to Production

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment instructions.

Quick deploy to Render:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

Then follow Render deployment steps.

---

## Troubleshooting

### Server won't start

**Check**: Do you have `.env` file? Run: `ls -la .env`

**Fix**: Copy from `.env.example`: `cp .env.example .env`

### Database connection failed

**Check**: Is PostgreSQL running? Run: `psql $DATABASE_URL`

**Fix**: Install PostgreSQL or update `DATABASE_URL`

### Migration failed

**Check**: Can you connect to database?

**Fix**: Verify `DATABASE_URL` format:
```
postgresql://username:password@host:port/database
```

### Test webhook returns error

**Check**: Is the product mapping configured?

**Check**: Is the aXcelerate instance ID valid?

**Fix**: Update product mapping with correct instance ID from aXcelerate

### Contact creation failed

**Check**: Are your aXcelerate tokens correct?

**Test**: Try direct API call:
```bash
curl -H "apitoken: YOUR_TOKEN" \
     -H "wstoken: YOUR_TOKEN" \
     "https://yourdomain.stg.axcelerate.com/api/contact/search?emailAddress=test@example.com"
```

---

## Next Steps

- ✅ Add more product mappings for your courses
- ✅ Test with real Shopify orders
- ✅ Monitor the sync logs regularly
- ✅ Deploy to production (Render)
- ✅ Configure Shopify webhook to production URL

## Need Help?

- Check [README.md](README.md) for full documentation
- See [TESTING.md](TESTING.md) for comprehensive testing guide
- Review [DEVELOPMENT.md](DEVELOPMENT.md) for technical details

---

**Happy integrating! 🚀**

