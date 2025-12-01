# Testing Guide

## Manual Testing

### 1. Test Environment Setup

Before testing, ensure you have:
- PostgreSQL running
- Environment variables configured
- Server started (`npm run dev`)

### 2. Test Webhook Handler (Development Mode)

Use the test endpoint to simulate a Shopify order:

```bash
curl -X POST http://localhost:3000/webhook/test \
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
    "failed": [],
    "skipped": [],
    "status": "success"
  }
}
```

### 3. Test Product Mapping

1. Access admin: `http://localhost:3000/admin`
2. Go to "Product Mappings"
3. Add a test mapping:
   - Shopify Product ID: `7234567890123` (from test-order.json)
   - aXcelerate Instance ID: Your test class ID
   - Type: `p`
4. Save mapping

### 4. Test Full Flow

1. Create product mapping (step 3)
2. Send test webhook (step 2)
3. Check sync logs in admin dashboard
4. Verify enrolment created in aXcelerate

### 5. Test Group Booking

Modify `test-order.json` to have `quantity: 3` in line_items:

```json
{
  "line_items": [
    {
      ...
      "quantity": 3,
      ...
    }
  ]
}
```

Send webhook and verify 3 enrolments are created.

### 6. Test Error Handling

**Missing Product Mapping:**
1. Remove product mapping
2. Send webhook
3. Check logs - should show "skipped" status

**Invalid aXcelerate Instance:**
1. Create mapping with invalid instance ID
2. Send webhook
3. Check logs - should show "failed" status with error message

**Invalid Contact Data:**
Modify test-order.json to remove customer email:
```json
{
  "email": "",
  "customer": {
    "email": "",
    ...
  }
}
```
Send webhook - should fail with appropriate error.

## Testing with Shopify Development Store

### Setup

1. Create a Shopify Partner account
2. Create a development store
3. Install Easy Appointment Booking (if using)
4. Create a test product
5. Create product mapping in admin dashboard

### Test Purchase Flow

1. Add product to cart
2. Go through checkout
3. Use test payment:
   - Card: `1` (Bogus Gateway)
   - Or use Shopify test mode
4. Complete order
5. Check webhook was received:
   - View server logs
   - Check admin dashboard sync logs
6. Verify enrolment in aXcelerate

### Webhook Verification

In Shopify Admin:
1. Go to Settings → Notifications → Webhooks
2. View your webhook
3. Check "Recent Deliveries"
4. Should show 200 OK responses

## API Testing with Postman/Insomnia

### Health Check

```
GET http://localhost:3000/health
```

### Get Stats (JSON)

```
GET http://localhost:3000/admin/api/stats
```

### Get Recent Logs (JSON)

```
GET http://localhost:3000/admin/api/logs?limit=10&status=success
```

Parameters:
- `limit`: Number of results (default 50)
- `offset`: Pagination offset
- `status`: Filter by status (success/failed/pending/skipped)

## Testing aXcelerate Integration

### Test Contact Search

```bash
curl -H "apitoken: YOUR_TOKEN" \
     -H "wstoken: YOUR_TOKEN" \
     "https://yourdomain.stg.axcelerate.com/api/contact/search?emailAddress=test@example.com"
```

### Test Contact Creation

```bash
curl -X POST \
  -H "apitoken: YOUR_TOKEN" \
  -H "wstoken: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"givenName":"John","surname":"Smith","emailAddress":"test@example.com"}' \
  "https://yourdomain.stg.axcelerate.com/api/contact"
```

### Test Class Instance Retrieval

```bash
curl -H "apitoken: YOUR_TOKEN" \
     -H "wstoken: YOUR_TOKEN" \
     "https://yourdomain.stg.axcelerate.com/api/course/instance/22500?type=p"
```

### Test Enrolment Creation

```bash
curl -X POST \
  -H "apitoken: YOUR_TOKEN" \
  -H "wstoken: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contactID":"123456","instanceID":"22500","type":"p","tentative":"false"}' \
  "https://yourdomain.stg.axcelerate.com/api/course/enrol"
```

## Database Testing

### Check Tables

```sql
-- Connect to database
psql $DATABASE_URL

-- View sync logs
SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10;

-- View product mappings
SELECT * FROM product_mappings WHERE is_active = true;

-- Get statistics
SELECT 
  status, 
  COUNT(*) as count 
FROM sync_logs 
GROUP BY status;
```

### Reset Test Data

```sql
-- Clear sync logs (careful in production!)
TRUNCATE TABLE sync_logs;

-- Clear product mappings (careful in production!)
TRUNCATE TABLE product_mappings;
```

## Load Testing

For high-volume testing, use tools like:

### Apache Bench

```bash
ab -n 100 -c 10 \
   -p test-order.json \
   -T "application/json" \
   http://localhost:3000/webhook/test
```

### Artillery

```yaml
# artillery.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5

scenarios:
  - name: "Webhook test"
    flow:
      - post:
          url: "/webhook/test"
          json:
            # order data here
```

Run: `artillery run artillery.yml`

## Common Test Scenarios

### Scenario 1: First Time Customer

1. New customer (no existing contact in aXcelerate)
2. Single product purchase
3. Should create contact and enrolment

### Scenario 2: Returning Customer

1. Existing contact in aXcelerate
2. Single product purchase
3. Should find existing contact and create enrolment

### Scenario 3: Group Booking

1. Purchase with quantity > 1
2. Should create multiple enrolments for same contact

### Scenario 4: Multiple Products

1. Order with multiple line items
2. Each with product mapping
3. Should create separate enrolments for each

### Scenario 5: Partial Failure

1. Order with 2 products
2. One has mapping, one doesn't
3. Should succeed for mapped product, skip for unmapped

### Scenario 6: Retry Logic

1. Temporarily disable aXcelerate API (or use invalid token)
2. Send webhook
3. Should retry 3 times before failing
4. Re-enable API
5. Manually retry or resend webhook

## Monitoring Tests

### Check Logs

```bash
# View all logs
tail -f logs/app.log

# Filter errors
tail -f logs/app.log | grep ERROR

# Filter specific order
tail -f logs/app.log | grep "5678901234567"
```

### Admin Dashboard Checks

1. Dashboard shows correct statistics
2. Recent logs appear immediately after webhook
3. Failed logs show error messages
4. Product mappings display correctly
5. Forms validate correctly

## Security Testing

### Webhook Signature Verification

Send webhook with invalid HMAC:
```bash
curl -X POST http://localhost:3000/webhook/shopify \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: invalid_signature" \
  -d @test-order.json
```

Should return: `401 Unauthorized`

### SQL Injection Prevention

Try injecting SQL in form fields:
```
Product ID: 123'; DROP TABLE sync_logs; --
```

Should be safely escaped.

### XSS Prevention

Try injecting JavaScript:
```
Product Title: <script>alert('XSS')</script>
```

Should be safely escaped in admin UI.

## Troubleshooting Tests

### Server Won't Start

Check:
- `.env` file exists and has all required variables
- PostgreSQL is running
- Port 3000 is not in use
- Dependencies installed (`npm install`)

### Database Connection Failed

Check:
- `DATABASE_URL` format is correct
- PostgreSQL is accessible
- Database exists
- User has permissions

### Webhook Not Receiving

Check:
- Server is running
- Port is accessible (not firewalled)
- Shopify webhook URL is correct
- Webhook is activated in Shopify

### aXcelerate API Errors

Check:
- API tokens are correct
- API URL is correct (include `/api` path)
- Tokens are sent as headers (not parameters)
- Class instance is eligible for enrolment

## Automated Tests (Future Enhancement)

### Unit Tests

```javascript
// Example: test/helpers.test.js
import { parseCustomerData } from '../src/utils/helpers.js';

test('parseCustomerData extracts customer info', () => {
  const order = {
    customer: {
      first_name: 'John',
      last_name: 'Smith',
      email: 'john@example.com'
    }
  };
  
  const result = parseCustomerData(order);
  
  expect(result.givenName).toBe('John');
  expect(result.surname).toBe('Smith');
  expect(result.emailAddress).toBe('john@example.com');
});
```

### Integration Tests

```javascript
// Example: test/enrolment.test.js
import enrolmentService from '../src/services/enrolment.js';

test('processOrder creates enrolments', async () => {
  const order = { /* test order data */ };
  
  const result = await enrolmentService.processOrder(order);
  
  expect(result.status).toBe('success');
  expect(result.success.length).toBeGreaterThan(0);
});
```

Run tests: `npm test`

## Test Checklist

Before deployment:

- [ ] Test webhook handler with valid order
- [ ] Test webhook handler with invalid signature
- [ ] Test contact creation (new customer)
- [ ] Test contact matching (existing customer)
- [ ] Test single enrolment
- [ ] Test group enrolment (qty > 1)
- [ ] Test missing product mapping (skipped)
- [ ] Test invalid class instance (failed)
- [ ] Test admin dashboard access
- [ ] Test product mapping CRUD
- [ ] Test sync logs display
- [ ] Test database migrations
- [ ] Test environment variables loading
- [ ] Test health check endpoint
- [ ] Test error logging
- [ ] Test retry logic
- [ ] Verify aXcelerate enrolments created
- [ ] Verify idempotency (duplicate orders)

