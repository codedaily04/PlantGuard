#!/bin/bash

echo "=========================================="
echo "PlantGuard AI - Plant Health Analysis Test"
echo "=========================================="
echo ""

# Check if GEMINI_API_KEY is configured
if ! grep -q "GEMINI_API_KEY=AIza" server/.env 2>/dev/null; then
    echo "⚠️  WARNING: Please add your Gemini API key to server/.env"
    echo ""
    echo "To get a free Gemini API key:"
    echo "1. Visit: https://aistudio.google.com/app/apikey"
    echo "2. Click 'Get API Key' or 'Create API Key'"
    echo "3. Copy the API key"
    echo "4. Add to server/.env file:"
    echo "   GEMINI_API_KEY=your_actual_api_key_here"
    echo ""
    echo "Then run this script again."
    echo ""
    exit 1
fi

echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aitest@example.com","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Login failed. Please ensure the server is running."
    exit 1
fi

echo "✅ Login successful"
echo ""

echo "Step 2: Fetching test plants..."
PLANTS=$(curl -s -X GET http://localhost:5001/api/plants \
  -H "Authorization: Bearer $TOKEN")

PLANT1_ID=$(echo $PLANTS | jq -r '.plants[0]._id')
PLANT1_NAME=$(echo $PLANTS | jq -r '.plants[0].name')
PLANT2_ID=$(echo $PLANTS | jq -r '.plants[1]._id')
PLANT2_NAME=$(echo $PLANTS | jq -r '.plants[1].name')

echo "✅ Found plants:"
echo "   - $PLANT1_NAME (ID: $PLANT1_ID)"
echo "   - $PLANT2_NAME (ID: $PLANT2_ID)"
echo ""

echo "=========================================="
echo "TEST 1: Analyzing $PLANT1_NAME"
echo "=========================================="
echo ""

ANALYSIS1=$(curl -s -X GET "http://localhost:5001/api/ai/analyze/$PLANT1_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $ANALYSIS1 | jq .

echo ""
echo "Health Summary:"
echo $ANALYSIS1 | jq -r '.analysis | "  Health Score: \(.healthScore)/100\n  Status: \(.healthStatus)\n  Risk Level: \(.riskLevel)\n  Confidence: \(.confidence)\n  Summary: \(.summary)"'

echo ""
echo "=========================================="
echo "TEST 2: Analyzing $PLANT2_NAME"
echo "=========================================="
echo ""

ANALYSIS2=$(curl -s -X GET "http://localhost:5001/api/ai/analyze/$PLANT2_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $ANALYSIS2 | jq .

echo ""
echo "Health Summary:"
echo $ANALYSIS2 | jq -r '.analysis | "  Health Score: \(.healthScore)/100\n  Status: \(.healthStatus)\n  Risk Level: \(.riskLevel)\n  Confidence: \(.confidence)\n  Summary: \(.summary)"'

echo ""
echo "=========================================="
echo "✅ AI Analysis Testing Complete"
echo "=========================================="
echo ""
echo "Note: The AI should provide different analyses based on"
echo "the actual sensor data for each plant."
echo ""
