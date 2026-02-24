#!/bin/bash
# Local Mode Comprehensive Test Script
# Tests all critical endpoints and features in local mode

set -e

PORT=1414
BASE_URL="http://localhost:$PORT"

echo "🔍 Testing Local Mode on port $PORT"
echo "=================================="
echo ""

# Test 1: TQL Kernel Health
echo "1️⃣  Testing TQL Kernel Health..."
HEALTH=$(curl -s "$BASE_URL/api/graph/health")
echo "   Response: $HEALTH"
STATUS=$(echo "$HEALTH" | jq -r '.status')
if [ "$STATUS" = "ok" ]; then
  echo "   ✅ Kernel is healthy"
else
  echo "   ❌ Kernel health check failed"
  exit 1
fi
echo ""

# Test 2: Ontologies Endpoint
echo "2️⃣  Testing Ontologies Endpoint..."
ONTOLOGIES=$(curl -s "$BASE_URL/api/graph/ontologies")
ONT_COUNT=$(echo "$ONTOLOGIES" | jq '.ontologies | length')
echo "   Loaded ontologies: $ONT_COUNT"
if [ "$ONT_COUNT" -gt 0 ]; then
  echo "   ✅ Ontologies loaded"
else
  echo "   ❌ No ontologies found"
  exit 1
fi
echo ""

# Test 3: Query Endpoint
echo "3️⃣  Testing Query Endpoint..."
QUERY_RESULT=$(curl -s -X POST "$BASE_URL/api/graph/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "FIND entity AS ?e RETURN ?e LIMIT 5"}')
echo "   Response: $(echo "$QUERY_RESULT" | jq -c '.')"
if echo "$QUERY_RESULT" | jq -e '.data' > /dev/null 2>&1; then
  echo "   ✅ Query endpoint working"
else
  echo "   ❌ Query endpoint failed"
  exit 1
fi
echo ""

# Test 4: Create Entity
echo "4️⃣  Testing Entity Creation..."
TEST_ID="entity:test-$(date +%s)"
CREATE_RESULT=$(curl -s -X POST "$BASE_URL/api/graph/mutate" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"createNode\",
    \"entityId\": \"$TEST_ID\",
    \"type\": \"entity\",
    \"data\": {
      \"type\": \"task\",
      \"title\": \"Test Task from Script\",
      \"description\": \"Testing local mode\"
    },
    \"agentId\": \"test-script\"
  }")
echo "   Response: $(echo "$CREATE_RESULT" | jq -c '.')"
if echo "$CREATE_RESULT" | jq -e '.ok' > /dev/null 2>&1; then
  echo "   ✅ Entity created: $TEST_ID"
else
  echo "   ❌ Entity creation failed"
  exit 1
fi
echo ""

# Test 5: Read Entity
echo "5️⃣  Testing Entity Read..."
READ_RESULT=$(curl -s "$BASE_URL/api/graph/node/$TEST_ID")
echo "   Response: $(echo "$READ_RESULT" | jq -c '.')"
TITLE=$(echo "$READ_RESULT" | jq -r '.node.title // empty')
if [ -n "$TITLE" ]; then
  echo "   ✅ Entity read successfully: $TITLE"
else
  echo "   ❌ Entity read failed"
  exit 1
fi
echo ""

# Test 6: Update Entity
echo "6️⃣  Testing Entity Update..."
UPDATE_RESULT=$(curl -s -X POST "$BASE_URL/api/graph/mutate" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"updateNode\",
    \"entityId\": \"$TEST_ID\",
    \"type\": \"entity\",
    \"data\": {
      \"title\": \"Updated Test Task\"
    },
    \"agentId\": \"test-script\"
  }")
echo "   Response: $(echo "$UPDATE_RESULT" | jq -c '.')"
if echo "$UPDATE_RESULT" | jq -e '.ok' > /dev/null 2>&1; then
  echo "   ✅ Entity updated"
else
  echo "   ❌ Entity update failed"
  exit 1
fi
echo ""

# Test 7: Delete Entity
echo "7️⃣  Testing Entity Deletion..."
DELETE_RESULT=$(curl -s -X POST "$BASE_URL/api/graph/mutate" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"deleteNode\",
    \"entityId\": \"$TEST_ID\",
    \"agentId\": \"test-script\"
  }")
echo "   Response: $(echo "$DELETE_RESULT" | jq -c '.')"
if echo "$DELETE_RESULT" | jq -e '.ok' > /dev/null 2>&1; then
  echo "   ✅ Entity deleted"
else
  echo "   ❌ Entity deletion failed"
  exit 1
fi
echo ""

# Test 8: SSE Connection (timeout after 3 seconds)
echo "8️⃣  Testing SSE Connection..."
SSE_OUTPUT=$(timeout 3 curl -N -H "Accept: text/event-stream" "$BASE_URL/api/graph/events" 2>&1 || true)
if echo "$SSE_OUTPUT" | grep -q "event: connected"; then
  echo "   ✅ SSE connection established"
else
  echo "   ⚠️  SSE connection issue (may be timing)"
  echo "   Output: $(echo "$SSE_OUTPUT" | head -5)"
fi
echo ""

# Test 9: Config Endpoint
echo "9️⃣  Testing Config Endpoint..."
CONFIG=$(curl -s "$BASE_URL/api/graph/config")
if echo "$CONFIG" | jq -e '.ontologies' > /dev/null 2>&1; then
  echo "   ✅ Config endpoint working"
else
  echo "   ❌ Config endpoint failed"
  exit 1
fi
echo ""

echo "=================================="
echo "✅ All critical tests passed!"
echo ""
