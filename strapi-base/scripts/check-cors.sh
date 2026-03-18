#!/usr/bin/env bash
# Usage: ./scripts/check-cors.sh <ORIGIN> <API_URL>
# Example:
# ./scripts/check-cors.sh "https://www.amandatraduction.com" "https://traduction-amanda-production.up.railway.app/api/work-items?pagination[limit]=1"

ORIGIN=${1:-http://localhost:3000}
API_URL=${2:-http://localhost:1337/api/work-items?pagination[limit]=1}

echo "Checking CORS for origin: $ORIGIN against $API_URL"

curl -s -i -H "Origin: $ORIGIN" -G "$API_URL" | sed -n '1,120p' | grep -E "Access-Control-Allow-Origin|HTTP/|Content-Type" || echo "No CORS headers found"