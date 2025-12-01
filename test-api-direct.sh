#!/bin/bash
# Test aXcelerate API directly
# Usage: ./test-api-direct.sh

echo "Testing aXcelerate API contact creation..."
echo ""
echo "Please check your .env file and run:"
echo ""
echo "curl -X POST 'https://blackmarket.app.axcelerate.com/api/contact/' \\"
echo "  -H 'APIToken: YOUR_API_TOKEN' \\"
echo "  -H 'WSToken: YOUR_WS_TOKEN' \\"
echo "  -H 'Content-Type: application/x-www-form-urlencoded' \\"
echo "  -d 'givenName=Test&surname=User&emailAddress=test@example.com'"
echo ""
echo "If this works, the issue is in our code. If it fails, the issue is with API credentials or endpoint."

