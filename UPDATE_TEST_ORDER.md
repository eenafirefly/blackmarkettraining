# How to Update test-order.json with Your Shopify Order #5011

## Quick Method: Get Order JSON from Shopify Admin

1. **Go to Shopify Admin** → Settings → Notifications
2. **Or use Shopify API** (if you have credentials):
   ```bash
   curl "https://YOUR_API_KEY:YOUR_API_SECRET@YOUR_STORE.myshopify.com/admin/api/2024-01/orders.json?name=5011" | jq '.orders[0]' > order-5011.json
   ```

## Key Fields to Update in test-order.json

### Top Level Order Fields:
- `"id"`: Order ID (numeric, e.g., `9171440369916`)
- `"name"`: Order number with # (e.g., `"#5011"`)
- `"number"`: Order number without # (e.g., `5011`)
- `"order_number"`: Same as number (e.g., `5011`)
- `"email"`: Customer email from order
- `"total_price"`: Order total (e.g., `"99.00"`)
- `"subtotal_price"`: Subtotal
- `"currency"`: Currency code (e.g., `"AUD"`)
- `"financial_status"`: Should be `"paid"`

### Customer Object (line 41-83):
- `"customer.id"`: Customer ID
- `"customer.email"`: Customer email
- `"customer.first_name"`: First name
- `"customer.last_name"`: Last name
- `"customer.phone"`: Phone number
- `"customer.default_address"`: Full address object

### Line Items (line 118-183):
**Most Important:** 
- `"line_items[0].product_id"`: Your Shopify Product ID (e.g., `9171440369916`)
- `"line_items[0].id"`: Line item ID
- `"line_items[0].title"`: Product title
- `"line_items[0].price"`: Product price
- `"line_items[0].properties"`: Booking metadata (if using Easy Appointment Booking)

### Addresses:
- `"billing_address"`: Billing address object
- `"shipping_address"`: Shipping address object

## Example Update

If your order #5011 has:
- Order ID: `9171440369916`
- Product ID: `9171440369916` (from line items)
- Customer email: `sheena@noda.com.au`

Update these fields:
```json
{
  "id": 9171440369916,
  "name": "#5011",
  "number": 5011,
  "order_number": 5011,
  "email": "sheena@noda.com.au",
  ...
  "line_items": [{
    "product_id": 9171440369916,
    ...
  }]
}
```

