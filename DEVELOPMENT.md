# Shopify to aXcelerate Integration - Development Notes

## Project Overview

This integration connects Shopify e-commerce with aXcelerate Student Management System to automatically create course enrolments when orders are placed.

## Key Architecture Decisions

### 1. Webhook-Based vs Polling

**Decision**: Use Shopify webhooks (orders/paid)

**Rationale**:
- Real-time processing
- No need for scheduled jobs
- Lower server load
- Shopify best practice

### 2. Database Choice

**Decision**: PostgreSQL

**Rationale**:
- JSONB support for flexible metadata storage
- Robust transaction support
- Well-supported on Render
- Good for audit logs

### 3. Contact Matching Strategy

**Decision**: Match by email, create if not found

**Rationale**:
- Email is unique identifier in both systems
- Avoids duplicate contacts
- Simple and reliable

### 4. Group Bookings

**Decision**: Create multiple enrolments for purchaser

**Status**: Open item - client needs to decide on attendee details collection

**Options**:
1. All enrolments to purchaser (current implementation)
2. Post-purchase form for attendee details
3. Custom checkout fields
4. Manual admin entry

### 5. Error Handling

**Decision**: Retry with exponential backoff, log all attempts

**Rationale**:
- Handles transient API failures
- Exponential backoff prevents API hammering
- Comprehensive logs for debugging
- Idempotency prevents duplicates

## API Integration Notes

### aXcelerate API

**Authentication**: Token-based (apitoken + wstoken in headers)

**Key Endpoints Used**:
- `/contact/search` - Find existing contacts
- `/contact` (POST) - Create new contact
- `/course/instance/:id` - Verify class exists
- `/course/enrol` (POST) - Create enrolment

**Important Gotchas**:
- Surname is required (spec says so)
- Type must be correct ('p' for programs, 'w' for workshops, 'el' for e-learning)
- Tentative should be 'true' or 'false' (string, not boolean)
- Instance eligibility rules vary by type (see FAQ in docs)

**Error Responses**:
- 404/204 = Not found (acceptable for searches)
- 400 = Validation error (check response.data.details)
- 401 = Authentication error (check tokens)
- 500 = Server error (retry)

### Shopify Webhooks

**Topic**: orders/paid

**Why not orders/create?** 
- We only want paid orders to avoid free/abandoned orders
- Payment confirmation is essential

**Webhook Verification**:
- Must verify HMAC signature
- Use raw body (before JSON parsing)
- Compare with X-Shopify-Hmac-Sha256 header

**Important Fields**:
- `order.id` - Unique order ID
- `order.name` - Human-readable order number
- `order.customer` - Customer details
- `order.line_items` - Products purchased
- `line_items[].properties` - Booking metadata from Easy Appointment Booking

### Easy Appointment Booking

**Metadata Extraction**:
- Booking data stored in `line_items[].properties`
- Look for keys containing: date, time, instance, class, booking
- Format varies by configuration

**Current Implementation**:
- Extracts metadata for logging
- Mapping to aXcelerate instance done via product_mappings table
- More flexible than hard-coding metadata field names

## Database Schema Notes

### sync_logs

**Purpose**: Audit trail of all sync operations

**Key Fields**:
- `shopify_order_id` - For deduplication
- `shopify_line_item_id` - For per-item tracking
- `status` - success/failed/pending/skipped/partial
- `metadata` - JSONB for flexible data storage

**Indexing**:
- order_id for duplicate checking (fast lookups)
- status for filtering in admin
- created_at for chronological display

### product_mappings

**Purpose**: Link Shopify products to aXcelerate classes

**Key Fields**:
- `shopify_product_id` - Unique identifier
- `axcelerate_instance_id` - Target class
- `is_active` - Soft delete capability

**Why Not Auto-Discovery?**:
- Manual mapping gives explicit control
- Different products may map to same class
- Allows testing before activation

## Security Considerations

### Implemented

✅ HMAC webhook verification  
✅ Environment variables for secrets  
✅ HTTPS enforcement in production  
✅ SQL injection prevention (parameterized queries)  
✅ XSS prevention (EJS auto-escaping)  
✅ Helmet.js security headers  

### Future Enhancements

🔄 Rate limiting (if needed for high volume)  
🔄 Admin authentication (currently public)  
🔄 API key for admin API endpoints  

## Performance Considerations

### Current Capacity

- Synchronous processing per webhook
- ~5-10 seconds per order (includes API calls)
- Should handle ~100 orders/hour comfortably

### Optimization Opportunities

1. **Job Queue** (if volume increases)
   - Use Bull/Bee-Queue with Redis
   - Process orders asynchronously
   - Better handling of spikes

2. **Caching** (if needed)
   - Cache product mappings (rarely change)
   - Cache contact lookups (if many returning customers)

3. **Batch Operations** (if aXcelerate supports)
   - Batch multiple enrolments in single API call
   - Reduces API overhead for group bookings

## Known Limitations

1. **Group Bookings**
   - All enrolments go to purchaser
   - No attendee details collection
   - Manual follow-up required

2. **Refunds/Cancellations**
   - Not synced back to aXcelerate
   - Manual unenrolment required
   - Future enhancement

3. **Stock Sync**
   - Shopify controls inventory
   - No sync from aXcelerate to Shopify
   - Class capacity managed in aXcelerate

4. **USI Collection**
   - Not collected at checkout
   - Must be collected later (client is not RTO)

5. **Payment Recording**
   - Payment handled in Shopify
   - Not recorded in aXcelerate
   - Invoice field optional in enrolment

## Testing Strategy

### Development

- Use `/webhook/test` endpoint
- Test orders in `test-order.json`
- Local aXcelerate staging environment

### Staging

- Shopify development store
- Test gateway payments
- Real webhook calls
- Monitor admin dashboard

### Production

- Gradual rollout (selected products first)
- Monitor logs closely
- Keep manual process as backup initially

## Deployment Notes

### Render-Specific

- Auto-deploy from Git push
- Environment variables in dashboard
- PostgreSQL in same region (important!)
- Use internal database URL (faster)

### Database Migrations

- Run automatically on deploy: `npm run migrate`
- Migrations are idempotent (safe to re-run)
- No down migrations yet (add if needed)

### Monitoring

- View logs in Render dashboard
- Use `/health` endpoint for uptime monitoring
- Check admin dashboard daily initially

## Future Enhancements

### Phase 2 Features

1. **Refund Sync**
   - Listen for refund webhooks
   - Unenroll or cancel in aXcelerate
   - Configurable behavior

2. **Admin Authentication**
   - Simple password protection
   - Or OAuth integration

3. **Email Notifications**
   - Send confirmation to customer
   - Alert admins of failures
   - Digest reports

4. **Attendee Management**
   - Post-purchase form
   - Collect attendee details
   - Create separate contacts

5. **Reporting**
   - Dashboard analytics
   - Export to CSV
   - Integration success rate

6. **Webhook Retry**
   - Admin button to retry failed syncs
   - Bulk retry functionality

## Troubleshooting Guide

### "Order already processed"

**Cause**: Webhook received multiple times (Shopify retries)  
**Solution**: This is expected behavior, idempotency working correctly  

### "Surname is required"

**Cause**: Customer only provided first name  
**Solution**: Form validation at checkout, or use first name as surname fallback (implemented)  

### "Class instance not accessible"

**Causes**:
- Wrong instance ID in mapping
- Class archived or ended
- Class not public
- Close days passed

**Solution**: Check aXcelerate class settings, update mapping  

### "Invalid HMAC signature"

**Cause**: Wrong webhook secret or not using raw body  
**Solution**: Verify SHOPIFY_WEBHOOK_SECRET matches Shopify  

### "Contact creation failed"

**Cause**: Invalid email or missing required fields  
**Solution**: Check customer data, ensure valid email provided  

## Code Style Guidelines

- ES6 modules (import/export)
- Async/await (not callbacks)
- Descriptive variable names
- Comments for complex logic
- Console logs for important events
- Error messages should be actionable

## Git Workflow

1. Feature branches from `main`
2. Descriptive commit messages
3. Test before push
4. Render auto-deploys from `main`

## Contact

For questions or issues:
- Check admin dashboard logs first
- Review this documentation
- Contact NODA Digital Agency

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Status**: Ready for deployment

