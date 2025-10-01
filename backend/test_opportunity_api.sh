#!/bin/bash

# Base URL for the API
BASE_URL="http://127.0.0.1:5000"
USER_OPENID="test_user_123"

echo "--- Testing Opportunity API Endpoints ---"

echo "\n1. Re-creating test user (in-memory database resets on server restart)"
curl -X POST -H "Content-Type: application/json" -d '{"openid": "'$USER_OPENID'", "name": "Test User", "avatar_url": "http://example.com/avatar.jpg"}' $BASE_URL/users
echo "\n"
sleep 1

echo "\n2. Creating first opportunity for $USER_OPENID"
RESPONSE=$(curl -X POST -H "Content-Type: application/json" -d '{
    "user_openid": "'$USER_OPENID'",
    "position_name": "Frontend Developer",
    "company_name": "Google",
    "job_description": "Develop and maintain user-facing features.",
    "source": "LinkedIn",
    "status": "面试中",
    "latest_progress": "Scheduled for technical interview"
}' $BASE_URL/opportunities)
OPP_ID_1=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo $RESPONSE
echo "First Opportunity ID: $OPP_ID_1"
echo "\n"
sleep 1

echo "\n3. Creating second opportunity for $USER_OPENID"
RESPONSE=$(curl -X POST -H "Content-Type: application/json" -d '{
    "user_openid": "'$USER_OPENID'",
    "position_name": "Backend Engineer",
    "company_name": "Meta",
    "job_description": "Build scalable backend services.",
    "source": "Company Website",
    "status": "已投递",
    "latest_progress": "Application submitted"
}' $BASE_URL/opportunities)
OPP_ID_2=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo $RESPONSE
echo "Second Opportunity ID: $OPP_ID_2"
echo "\n"
sleep 1

echo "\n4. Getting all opportunities for $USER_OPENID"
curl $BASE_URL/opportunities/$USER_OPENID
echo "\n"
sleep 1

echo "\n5. Getting specific opportunity by ID ($OPP_ID_1)"
curl $BASE_URL/opportunity/$OPP_ID_1
echo "\n"
sleep 1

echo "\n6. Updating opportunity ID ($OPP_ID_1)"
curl -X PUT -H "Content-Type: application/json" -d '{
    "status": "已发Offer",
    "latest_progress": "Offer received, awaiting decision"
}' $BASE_URL/opportunity/$OPP_ID_1
echo "\n"
sleep 1

echo "\n7. Getting the updated opportunity ($OPP_ID_1)"
curl $BASE_URL/opportunity/$OPP_ID_1
echo "\n"
sleep 1

echo "\n8. Deleting opportunity ID ($OPP_ID_2)"
curl -X DELETE $BASE_URL/opportunity/$OPP_ID_2
echo "\n"
sleep 1

echo "\n9. Getting all opportunities again (to verify deletion)"
curl $BASE_URL/opportunities/$USER_OPENID
echo "\n"
sleep 1

echo "--- Testing Complete ---"
