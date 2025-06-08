#!/bin/bash

# RemoveTube Extension Test Suite
# This script runs various tests and validations for the RemoveTube Chrome extension

echo "🎯 RemoveTube Extension Test Suite"
echo "================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    echo -e "${BLUE}Testing: ${test_name}${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASS: ${test_name}${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL: ${test_name}${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

# Navigate to the client directory
cd "$(dirname "$0")/../client" || exit 1

echo "📁 Current directory: $(pwd)"
echo ""

# Test 1: Validate manifest.json
run_test "Manifest JSON Validation" \
    "node -e \"const fs = require('fs'); const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8')); console.log('Manifest valid'); console.log('Name:', manifest.name); console.log('Version:', manifest.version);\""

# Test 2: Check for required files
run_test "Required Files Check" \
    "ls manifest.json content.js background.js popup.html popup.js options.html options.js >/dev/null 2>&1"

# Test 3: Validate content script syntax
run_test "Content Script Syntax Check" \
    "node -c content.js"

# Test 4: Validate background script syntax
run_test "Background Script Syntax Check" \
    "node -c background.js"

# Test 5: Validate popup script syntax
run_test "Popup Script Syntax Check" \
    "node -c popup.js"

# Test 6: Validate options script syntax
run_test "Options Script Syntax Check" \
    "node -c options.js"

# Test 7: Check for essential functions in content script
run_test "Content Script Functions Check" \
    "grep -q 'function showSetupOverlay\\|function checkVideoBeforeLoad\\|function blockVideo' content.js"

# Test 8: Check for message handling in background script
run_test "Background Script Message Handling" \
    "grep -q 'chrome.runtime.onMessage.addListener\\|openOptions' background.js"

# Test 9: Check for proper permissions in manifest
run_test "Manifest Permissions Check" \
    "grep -q '\"storage\"\\|\"activeTab\"\\|\"scripting\"' manifest.json"

# Test 10: Check for host permissions
run_test "Host Permissions Check" \
    "grep -q 'youtube.com' manifest.json"

# Test 11: Validate HTML files
run_test "Popup HTML Validation" \
    "grep -q '<html\\|<head\\|<body' popup.html"

run_test "Options HTML Validation" \
    "grep -q '<html\\|<head\\|<body' options.html"

# Test 12: Check for early video check implementation
run_test "Early Video Check Implementation" \
    "grep -q 'checkVideoBeforeLoad\\|showLoadingOverlay' content.js"

# Test 13: Check for button fix implementation
run_test "Button Fix Implementation" \
    "grep -q 'go-back-btn\\|settings-btn\\|fallbackToDirectOptionsOpen' content.js"

# Test 14: Check for setup wizard restrictions
run_test "Setup Wizard Home Page Restriction" \
    "grep -q \"window.location.pathname === '/'\" content.js"

# Test 15: Check for mandatory topic validation
run_test "Mandatory Topic Validation" \
    "grep -q 'topics.length === 0\\|Please enter at least one' content.js"

echo "================================="
echo "📊 Test Results Summary"
echo "================================="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
fi
