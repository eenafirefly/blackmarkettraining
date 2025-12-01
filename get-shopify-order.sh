#!/bin/bash
# Script to fetch Shopify order data
# Usage: ./get-shopify-order.sh YOUR_STORE_DOMAIN YOUR_API_KEY YOUR_API_SECRET ORDER_NUMBER

STORE_DOMAIN=$1
API_KEY=$2
API_SECRET=$3
ORDER_NUMBER=$4

if [ -z "$STORE_DOMAIN" ] || [ -z "$API_KEY" ] || [ -z "$API_SECRET" ] || [ -z "$ORDER_NUMBER" ]; then
  echo "Usage: ./get-shopify-order.sh STORE_DOMAIN API_KEY API_SECRET ORDER_NUMBER"
  echo "Example: ./get-shopify-order.sh yourstore.myshopify.com abc123 def456 5011"
  exit 1
fi

# Remove # from order number if present
ORDER_NUMBER=$(echo $ORDER_NUMBER | sed 's/#//')

echo "Fetching order #$ORDER_NUMBER from $STORE_DOMAIN..."
curl -s "https://$API_KEY:$API_SECRET@$STORE_DOMAIN/admin/api/2024-01/orders.json?name=$ORDER_NUMBER" | jq '.orders[0]' > order-$ORDER_NUMBER.json

if [ $? -eq 0 ]; then
  echo "✅ Order data saved to order-$ORDER_NUMBER.json"
  echo "You can now copy the contents to test-order.json"
else
  echo "❌ Failed to fetch order. Check your credentials."
fi

