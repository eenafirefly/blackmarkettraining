# Project File Structure

```
axcelerate/
│
├── src/                          # Source code
│   ├── index.js                  # Main Express application
│   │
│   ├── db/                       # Database layer
│   │   ├── index.js              # PostgreSQL connection & schema init
│   │   ├── migrate.js            # Migration script
│   │   └── repositories.js       # Data access layer (sync_logs, product_mappings)
│   │
│   ├── services/                 # Business logic
│   │   ├── axcelerate.js         # aXcelerate API client
│   │   └── enrolment.js          # Enrolment processing service
│   │
│   ├── routes/                   # Express routes
│   │   ├── webhook.js            # Shopify webhook handler
│   │   └── admin.js              # Admin dashboard routes & API
│   │
│   ├── utils/                    # Helper utilities
│   │   └── helpers.js            # HMAC verification, parsing, retry logic
│   │
│   ├── views/                    # EJS templates
│   │   ├── layout.ejs            # Base layout template
│   │   ├── dashboard.ejs         # Admin dashboard home
│   │   ├── logs.ejs              # Sync logs page
│   │   ├── mappings.ejs          # Product mappings list
│   │   ├── mapping-form.ejs      # Add/edit mapping form
│   │   └── error.ejs             # Error page
│   │
│   └── public/                   # Static assets (currently empty)
│
├── package.json                  # Node.js dependencies & scripts
├── .env                          # Environment variables (not in git)
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
│
├── render.yaml                   # Render deployment configuration
│
├── test-order.json               # Sample Shopify order for testing
│
├── README.md                     # Main documentation
├── QUICKSTART.md                 # Quick start guide
├── DEPLOYMENT.md                 # Deployment instructions
├── DEVELOPMENT.md                # Development notes & decisions
├── TESTING.md                    # Testing guide
│
└── LICENSE                       # MIT License

```

## Key Files Explained

### Application Core

**`src/index.js`**
- Express application setup
- Middleware configuration (security, parsing, logging)
- Route mounting
- View engine setup with custom layout wrapper
- Server initialization with database connection

### Database Layer

**`src/db/index.js`**
- PostgreSQL connection pool
- Query execution helpers
- Database schema initialization
- Creates `sync_logs` and `product_mappings` tables

**`src/db/repositories.js`**
- Data access layer
- SyncLogRepository: CRUD for sync logs
- ProductMappingRepository: CRUD for product mappings
- Abstraction layer over raw SQL queries

### Business Logic

**`src/services/axcelerate.js`**
- aXcelerate API client class
- Authentication handling (apitoken + wstoken headers)
- Contact search and creation
- Class instance verification
- Enrolment creation (single and multiple)
- Error handling and response parsing

**`src/services/enrolment.js`**
- Main enrolment processing service
- Order processing workflow
- Line item handling
- Product mapping lookups
- Group booking logic
- Comprehensive logging

### Routes

**`src/routes/webhook.js`**
- Shopify webhook endpoint (`/webhook/shopify`)
- HMAC signature verification
- Order parsing
- Async processing (responds quickly to Shopify)
- Test endpoint for development (`/webhook/test`)

**`src/routes/admin.js`**
- Admin dashboard routes
- Product mapping CRUD
- Sync logs display with filtering
- Statistics API endpoints
- Form handling for mappings

### Utilities

**`src/utils/helpers.js`**
- `verifyShopifyWebhook()`: HMAC signature verification
- `extractBookingMetadata()`: Parse Easy Appointment Booking data
- `parseCustomerData()`: Transform Shopify customer to aXcelerate format
- `retryWithBackoff()`: Exponential backoff retry logic
- `sendAlert()`: Error notification (placeholder)

### Views

**EJS Templates** - Server-side rendered HTML
- Modern, clean UI with gradient header
- Responsive design
- Inline CSS (no external dependencies)
- Table-based data display
- Forms with validation
- Status badges with color coding

### Configuration

**`package.json`**
- Dependencies: express, pg, axios, ejs, dotenv, helmet, etc.
- Scripts: start, dev, migrate, test
- Node version requirement (18+)

**`.env` / `.env.example`**
- Server configuration (PORT, NODE_ENV)
- Database connection (DATABASE_URL)
- Shopify credentials (API keys, webhook secret)
- aXcelerate credentials (API URL, tokens)
- Optional settings (retry attempts, delays)

**`render.yaml`**
- Render deployment configuration
- Web service definition
- PostgreSQL database definition
- Environment variable declarations

### Documentation

**`README.md`**
- Comprehensive project documentation
- Installation and setup instructions
- Configuration guide
- API reference
- Troubleshooting

**`QUICKSTART.md`**
- 10-minute setup guide
- Step-by-step instructions
- Quick troubleshooting

**`DEPLOYMENT.md`**
- Render deployment guide
- Docker deployment alternative
- Post-deployment checklist
- Monitoring and scaling

**`DEVELOPMENT.md`**
- Architecture decisions
- API integration notes
- Known limitations
- Future enhancements
- Troubleshooting guide

**`TESTING.md`**
- Manual testing procedures
- API testing with curl/Postman
- Test scenarios
- Load testing
- Security testing

### Testing

**`test-order.json`**
- Sample Shopify order payload
- Used for testing webhook handler
- Contains realistic order structure with:
  - Customer details
  - Billing/shipping address
  - Line items with properties (booking metadata)
  - Payment information

## Data Flow

```
Shopify Order Paid
       ↓
POST /webhook/shopify (webhook.js)
       ↓
HMAC Verification (helpers.js)
       ↓
Order Parsing (helpers.js)
       ↓
Process Order (enrolment.js)
       ↓
├─ Get/Create Contact (axcelerate.js)
│      ↓
├─ For Each Line Item:
│  ├─ Check Product Mapping (repositories.js)
│  ├─ Verify Class Instance (axcelerate.js)
│  └─ Create Enrolment(s) (axcelerate.js)
│      ↓
└─ Log Results (repositories.js)
       ↓
Display in Admin Dashboard (admin.js → views/)
```

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **View Engine**: EJS
- **HTTP Client**: Axios
- **Security**: Helmet.js, HMAC verification
- **Deployment**: Render (PaaS)

## Dependencies

### Core
- `express`: Web framework
- `pg`: PostgreSQL client
- `axios`: HTTP client for APIs
- `dotenv`: Environment configuration

### View & Middleware
- `ejs`: Template engine
- `body-parser`: Request parsing
- `helmet`: Security headers
- `cors`: Cross-origin resource sharing
- `morgan`: HTTP logging

### Development
- `nodemon`: Auto-reload during development

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development/production |
| DATABASE_URL | PostgreSQL connection | postgresql://... |
| SHOPIFY_WEBHOOK_SECRET | Webhook verification | abc123... |
| SHOPIFY_API_KEY | Shopify app key | def456... |
| SHOPIFY_API_SECRET | Shopify app secret | ghi789... |
| SHOPIFY_STORE_DOMAIN | Store URL | store.myshopify.com |
| AXCELERATE_API_URL | aXcelerate API base | https://domain.stg.axcelerate.com/api |
| AXCELERATE_API_TOKEN | aXcelerate auth | token123... |
| AXCELERATE_WS_TOKEN | aXcelerate auth | token456... |

## Database Schema

### sync_logs
Audit trail of all synchronization attempts
- Tracks order, line item, customer details
- Records aXcelerate IDs (contact, instance, enrolment)
- Stores status and error messages
- Includes metadata (JSONB) for flexible data

### product_mappings
Maps Shopify products to aXcelerate classes
- Links product ID to instance ID
- Configurable type (p/w/el)
- Soft delete via is_active flag
- Optional booking metadata key

## API Endpoints

### Webhooks
- `POST /webhook/shopify` - Production webhook
- `POST /webhook/test` - Test webhook (dev only)

### Admin Pages
- `GET /admin` - Dashboard home
- `GET /admin/logs` - Sync logs
- `GET /admin/mappings` - Product mappings
- `GET /admin/mappings/new` - Add mapping form
- `GET /admin/mappings/:id/edit` - Edit mapping form

### Admin Actions
- `POST /admin/mappings` - Create mapping
- `POST /admin/mappings/:id` - Update mapping
- `POST /admin/mappings/:id/delete` - Delete mapping

### Admin API (JSON)
- `GET /admin/api/stats` - Statistics
- `GET /admin/api/logs` - Logs (JSON)

### Utility
- `GET /health` - Health check
- `GET /` - Redirects to admin

## Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server (nodemon)
npm run migrate    # Run database migrations
npm test           # Run tests (when implemented)
```

## Deployment

### Local Development
```bash
npm install
npm run migrate
npm run dev
```

### Production (Render)
- Push to Git repository
- Connect to Render
- Auto-deploy on push to main
- Environment variables in dashboard
- Database migrations run on deploy

## Future Enhancements

See DEVELOPMENT.md for full list:
- Refund/cancellation sync
- Admin authentication
- Email notifications
- Attendee management for group bookings
- Advanced reporting
- Retry failed syncs from admin

