# Shopify to aXcelerate Integration Plugin

**Version:** 1.0.0  
**Client:** Training Organisations using Shopify + aXcelerate  
**Developer:** NODA Digital Agency

## Overview

This custom Shopify application automatically creates student enrolments in aXcelerate when specific products (courses/training) are purchased through a Shopify store. It eliminates manual data entry and ensures students are enrolled immediately upon payment confirmation.

## Features

- ✅ Automatic enrolment upon Shopify order payment
- ✅ Contact creation/matching in aXcelerate
- ✅ **Attendee information extraction** from Easy Appointment Booking
- ✅ Smart attendee vs purchaser handling
- ✅ Group booking support (multiple enrolments per order)
- ✅ Product-to-class mapping configuration
- ✅ Comprehensive admin dashboard
- ✅ Sync logging and error tracking
- ✅ Retry logic with exponential backoff
- ✅ Easy Appointment Booking metadata extraction

## How Attendee Information Works

The integration automatically extracts **attendee information** from Easy Appointment Booking properties:

### Single Booking
- Attendee name captured by booking app
- Contact created for attendee in aXcelerate
- Enrolment created for attendee (not purchaser)

### Group Booking (qty > 1)
- Same attendee name used for all enrolments
- Multiple enrolments created for that one attendee
- Matches WooCommerce plugin behavior

### Fallback
- If no attendee info found, uses purchaser details
- Ensures enrolment always succeeds

**See [ATTENDEE_HANDLING.md](ATTENDEE_HANDLING.md) for complete details.**

## Architecture

```
Shopify Store + Easy Appointment Booking
              │
              ▼
    Webhook (orders/paid)
              │
              ▼
    Integration App (Node.js/Express)
              │
              ├──► PostgreSQL (sync logs, config)
              │
              ▼
       aXcelerate API
              │
              ▼
    Contact + Class Enrolment
```

## Prerequisites

### Required Credentials

1. **aXcelerate API Credentials**
   - API Token
   - WS Token
   - API URL (e.g., `https://yourdomain.stg.axcelerate.com/api`)

2. **Shopify Credentials**
   - Custom App API Key
   - Custom App API Secret
   - Webhook Secret
   - Store Domain

3. **Database**
   - PostgreSQL database URL

### Required Software

- Node.js >= 18.0.0
- PostgreSQL >= 12
- npm or yarn

## Installation

### 1. Clone and Install Dependencies

```bash
cd axcelerate
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/shopify_axcelerate

# Shopify Configuration
SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret_here
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com

# aXcelerate Configuration
AXCELERATE_API_URL=https://yourdomain.stg.axcelerate.com/api
AXCELERATE_API_TOKEN=your_axcelerate_api_token_here
AXCELERATE_WS_TOKEN=your_axcelerate_ws_token_here
```

### 3. Initialize Database

```bash
npm run migrate
```

This will create the required tables:
- `sync_logs` - Tracks all sync operations
- `product_mappings` - Maps Shopify products to aXcelerate classes

### 4. Start the Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## Configuration

### Setting Up Shopify

1. **Create a Custom App in Shopify**
   - Go to: Shopify Admin → Settings → Apps and sales channels → Develop apps
   - Click "Create an app"
   - Name it "aXcelerate Integration"

2. **Configure API Scopes**
   - Admin API access scopes:
     - `read_orders`
     - `read_products`
     - `read_customers`

3. **Create Webhook**
   - Topic: `orders/paid`
   - Format: `JSON`
   - URL: `https://your-domain.com/webhook/shopify`
   - Make note of the webhook secret

### Setting Up Product Mappings

1. Access the admin dashboard: `http://localhost:3000/admin`
2. Go to "Product Mappings"
3. Click "Add Mapping"
4. Fill in:
   - **Shopify Product ID**: Found in product URL or admin
   - **aXcelerate Instance ID**: PDataID (workshops) or ClassID (programs)
   - **Type**: Usually "p" for programs/classes
   - **Product Title**: For reference

### Finding aXcelerate IDs

According to the aXcelerate API documentation:

**For Workshops (type=w):**
- **ID** = ProgramCodeID (PCID) - found in workshop type edit URL
- **instanceID** = PDataID - found in workshop view page or URL under "Workshop ID"

**For Programs (type=p):**
- **ID** = DiplomaID (DID) - found in program edit URL
- **instanceID** = ClassID - found in class view URL

**For E-Learning (type=el):**
- Both **ID** and **instanceID** = learningActivityID

## Usage

### Enrolment Workflow

1. **Customer places order in Shopify**
2. **Order is paid** (triggers webhook)
3. **Webhook received and verified**
4. **System processes order:**
   - Parses customer data
   - Finds/creates contact in aXcelerate
   - For each line item:
     - Looks up product mapping
     - Creates enrolment(s) in aXcelerate
     - Logs result
5. **Admin can monitor in dashboard**

### Group Bookings

When a customer orders quantity > 1:
- System extracts attendee name from Easy Appointment Booking
- Creates multiple enrolments for that same attendee
- All enrolments logged separately

**Important:** The attendee field from the booking app determines who gets enrolled, not the purchaser.

**Example:**
- Purchaser: John Smith buys 3 seats
- Attendee Name (from booking): Sarah Johnson
- Result: 3 enrolments created for Sarah Johnson

See [ATTENDEE_HANDLING.md](ATTENDEE_HANDLING.md) for complete attendee handling documentation.

### Monitoring

Access the admin dashboard at: `http://localhost:3000/admin`

**Dashboard sections:**
- **Overview**: Statistics and recent activity
- **Sync Logs**: Detailed logs of all sync operations
- **Product Mappings**: Configure product-to-class mappings

## API Endpoints

### Webhooks

- `POST /webhook/shopify` - Shopify orders/paid webhook (production)
- `POST /webhook/test` - Test webhook endpoint (development only)

### Admin API

- `GET /admin/api/stats` - Get sync statistics (JSON)
- `GET /admin/api/logs` - Get recent logs (JSON)

### Health Check

- `GET /health` - Service health check

## Database Schema

### sync_logs

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| shopify_order_id | VARCHAR(255) | Shopify order ID |
| shopify_order_number | VARCHAR(255) | Shopify order number |
| shopify_line_item_id | VARCHAR(255) | Shopify line item ID |
| customer_email | VARCHAR(255) | Customer email |
| customer_name | VARCHAR(255) | Customer name |
| product_title | VARCHAR(500) | Product title |
| axcelerate_contact_id | VARCHAR(255) | aXcelerate contact ID |
| axcelerate_enrolment_id | VARCHAR(255) | aXcelerate learner ID |
| axcelerate_instance_id | VARCHAR(255) | aXcelerate instance ID |
| status | VARCHAR(50) | success/failed/pending/skipped |
| error_message | TEXT | Error details if failed |
| retry_count | INTEGER | Number of retry attempts |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

### product_mappings

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| shopify_product_id | VARCHAR(255) | Shopify product ID (unique) |
| shopify_variant_id | VARCHAR(255) | Shopify variant ID (optional) |
| product_title | VARCHAR(500) | Product title for reference |
| booking_metadata_key | VARCHAR(255) | Easy Appointment Booking key |
| axcelerate_instance_id | VARCHAR(255) | aXcelerate instance ID |
| axcelerate_type | VARCHAR(10) | p/w/el |
| is_active | BOOLEAN | Mapping enabled/disabled |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

## Error Handling

The system includes comprehensive error handling:

- **Retry Logic**: Up to 3 attempts with exponential backoff
- **Idempotency**: Checks for duplicate processing
- **Detailed Logging**: All errors logged with context
- **Status Tracking**: success/failed/pending/partial/skipped

### Common Issues

**"No product mapping configured"**
- Solution: Add a product mapping in the admin dashboard

**"Contact creation failed - Surname is required"**
- Solution: Ensure customers provide full name at checkout

**"Class instance not accessible"**
- Solution: Verify the instance ID exists in aXcelerate and meets eligibility requirements

**"Invalid HMAC signature"**
- Solution: Check that SHOPIFY_WEBHOOK_SECRET matches your Shopify webhook configuration

## Deployment

### Render Deployment

1. **Create a new Web Service on Render**
   - Repository: Your GitHub repository
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Add PostgreSQL Database**
   - Create a PostgreSQL database on Render
   - Copy the Internal Database URL

3. **Configure Environment Variables**
   - Add all variables from `.env.example`
   - Use the Internal Database URL for `DATABASE_URL`

4. **Deploy**
   - Render will automatically deploy your application
   - Note your service URL (e.g., `https://your-app.onrender.com`)

5. **Update Shopify Webhook**
   - Update webhook URL to: `https://your-app.onrender.com/webhook/shopify`

### render.yaml Example

```yaml
services:
  - type: web
    name: shopify-axcelerate-integration
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: shopify-axcelerate-db
          property: connectionString
      # Add other env vars via Render dashboard

databases:
  - name: shopify-axcelerate-db
    plan: starter
```

## Testing

### Manual Testing

1. **Test Webhook Handler (Development)**

```bash
curl -X POST http://localhost:3000/webhook/test \
  -H "Content-Type: application/json" \
  -d @test-order.json
```

2. **Test with Shopify Development Store**
   - Create a test product
   - Add product mapping
   - Make a test purchase
   - Check logs in admin dashboard

### Unit Tests

```bash
npm test
```

## Troubleshooting

### Check Server Status

```bash
curl http://localhost:3000/health
```

### View Logs

Logs are output to console. In production, they're captured by your hosting platform.

### Database Connection Issues

Verify PostgreSQL connection:
```bash
psql $DATABASE_URL
```

### aXcelerate API Issues

Test authentication:
```bash
curl -H "apitoken: YOUR_TOKEN" -H "wstoken: YOUR_TOKEN" \
  https://yourdomain.stg.axcelerate.com/api/contact/search?emailAddress=test@example.com
```

## Security Considerations

- ✅ HMAC webhook verification
- ✅ Environment variables for credentials (never in code)
- ✅ HTTPS for all API communications
- ✅ Database connection via SSL in production
- ✅ Input validation and sanitization
- ✅ Helmet.js for HTTP security headers

## Support

For issues or questions:
1. Check the admin dashboard for sync logs
2. Review error messages in the Sync Logs section
3. Verify product mappings are configured correctly
4. Ensure aXcelerate class instances are eligible for enrolment

## License

MIT License - See LICENSE file for details

## Contributing

This is a custom development for NODA Digital Agency clients. For modifications or enhancements, contact the development team.

