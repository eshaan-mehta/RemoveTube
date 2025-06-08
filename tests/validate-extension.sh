#!/bin/bash

# RemoveTube Extension Validation Script
echo "🎯 RemoveTube Extension Validation"
echo "=================================="

# Check if Chrome is available
if command -v google-chrome &> /dev/null || command -v google-chrome-stable &> /dev/null; then
    echo "✅ Chrome found"
else
    echo "❌ Chrome not found - install Google Chrome to test the extension"
    exit 1
fi

# Check if extension files exist
echo ""
echo "📁 Checking extension files..."

required_files=(
    "manifest.json"
    "content.js"
    "background.js"
    "popup.html"
    "popup.js"
    "options.html"
    "options.js"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "🔍 Checking API key functionality in content.js..."

# Check if API key functionality is implemented
if grep -q "toggle-api-key" content.js; then
    echo "✅ API key toggle button found"
else
    echo "❌ API key toggle button not found"
fi

if grep -q "api-key-input.*hidden" content.js; then
    echo "✅ API key collapsible functionality found"
else
    echo "❌ API key collapsible functionality not found"
fi

if grep -q "hasApiKey.*existingApiKey" content.js; then
    echo "✅ API key persistence logic found"
else
    echo "❌ API key persistence logic not found"
fi

if grep -q "hfApiKey.*chrome.storage" content.js; then
    echo "✅ API key storage functionality found"
else
    echo "❌ API key storage functionality not found"
fi

echo ""
echo "🧪 Testing features..."

# Check manifest permissions
echo "📋 Manifest validation:"
if grep -q '"storage"' manifest.json; then
    echo "✅ Storage permission found"
else
    echo "❌ Storage permission missing"
fi

if grep -q '"activeTab"' manifest.json; then
    echo "✅ ActiveTab permission found"
else
    echo "❌ ActiveTab permission missing"
fi

if grep -q 'youtube.com' manifest.json; then
    echo "✅ YouTube host permission found"
else
    echo "❌ YouTube host permission missing"
fi

echo ""
echo "🚀 Manual Testing Instructions:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select this directory"
echo "4. Visit youtube.com (home page only) - setup should appear"
echo "5. Test mandatory topic validation:"
echo "   - Try saving without topics: should show alert"
echo "   - Enter topics and save: should work"
echo "6. Test page restrictions:"
echo "   - Visit video pages: no setup wizard"
echo "   - Visit channel pages: no setup wizard"
echo "   - Only home page triggers setup"
echo "7. Test API key functionality:"
echo "   - First visit: API key input should be visible"
echo "   - Enter a test key and save"
echo "   - Refresh YouTube: key section should be collapsed"
echo "   - Click 'Show/Edit Key' to expand"
echo "   - Click 'Hide Key' to collapse"
echo ""
echo "✨ Extension validation complete!"
