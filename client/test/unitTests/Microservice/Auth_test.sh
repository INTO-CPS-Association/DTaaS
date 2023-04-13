#!/bin/sh

access_token="glpat-tv8vG7pnnmLC3aKN_NdC"
response=$(curl -s -X GET -H "Authorization: Bearer $access_token" http://localhost:8090/auth)
user_info=$(echo "$response" | jq '.username')

if [ "$user_info" != "" ]; then
    echo "User info: $user_info"
    echo "Test auth: PASSED"
else
    echo "Test auth: FAILED"
    echo "Received: $response"
fi