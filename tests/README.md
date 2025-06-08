# RemoveTube Tests

This directory contains all test files, documentation, and validation scripts for the RemoveTube Chrome extension.

## 📁 Directory Structure

```
tests/
├── README.md                           # This file
├── run-tests.sh                        # Main test runner script
├── validate-extension.sh               # Extension validation script
├── test-api-key.html                   # API key testing interface
├── implementation-complete.html        # Implementation status page
├── setup-wizard-updates.html           # Setup wizard testing guide
├── early-video-check-improvements.md   # Early video check documentation
└── button-fix-documentation.md         # Button fix documentation
```

## 🚀 Quick Start

### Run All Tests
```bash
cd tests
./run-tests.sh
```

### Validate Extension
```bash
cd tests
./validate-extension.sh
```

### Test API Key
Open `test-api-key.html` in a browser to test Hugging Face API connectivity.

## 📋 Test Files Description

### Core Test Scripts

#### `run-tests.sh`
Comprehensive test suite that validates:
- ✅ Manifest.json structure and permissions
- ✅ JavaScript syntax for all scripts
- ✅ Required files presence
- ✅ Essential function implementations
- ✅ Feature-specific implementations (early video check, button fixes, etc.)

#### `validate-extension.sh`
Legacy validation script for basic extension checks.

### Testing Interfaces

#### `test-api-key.html`
Interactive testing page for:
- Hugging Face API key validation
- Content classification testing
- Response format verification
- Error handling testing

#### `setup-wizard-updates.html`
Comprehensive testing guide for setup wizard features:
- Home page restriction testing
- Mandatory topic validation
- Visual styling verification
- Navigation behavior testing

#### `implementation-complete.html`
Implementation status and feature completeness overview.

### Documentation

#### `early-video-check-improvements.md`
Technical documentation covering:
- Immediate video detection implementation
- Loading overlay system
- Metadata extraction methods
- Navigation interception techniques
- Performance optimizations

#### `button-fix-documentation.md`
Documentation for blocked video page button fixes:
- Chrome API access issues resolution
- Event listener implementation
- Error handling strategies
- Fallback mechanisms

## 🧪 Testing Procedures

### 1. Development Testing
```bash
# Run syntax and structure validation
./run-tests.sh

# Test specific functionality
open test-api-key.html
open setup-wizard-updates.html
```

### 2. Extension Installation Testing
1. Load extension in Chrome Developer Mode
2. Visit `chrome://extensions/`
3. Enable Developer Mode
4. Click "Load unpacked" and select the `client` directory
5. Test all functionality according to the guides

### 3. API Testing
1. Open `test-api-key.html`
2. Enter your Hugging Face API key
3. Test content classification
4. Verify response formats

### 4. Setup Wizard Testing
1. Follow the guide in `setup-wizard-updates.html`
2. Clear extension storage: `chrome.storage.sync.clear()`
3. Visit YouTube home page
4. Verify setup wizard behavior

### 5. Video Blocking Testing
1. Complete setup with restricted topics
2. Navigate to videos outside allowed topics
3. Verify blocking behavior
4. Test "Go Back" and "Settings" buttons

## 🔧 Test Configuration

### Environment Requirements
- Node.js (for syntax checking)
- Chrome browser (for extension testing)
- Hugging Face API key (for AI testing)

### Test Data
- **Sample Topics**: education, music, cooking, programming
- **Test Videos**: Various YouTube videos for classification testing
- **API Responses**: Mock and real API response testing

## 📊 Test Coverage

### Core Functionality
- ✅ Extension installation and activation
- ✅ Setup wizard flow
- ✅ Topic validation and storage
- ✅ Video content detection
- ✅ AI classification (with API)
- ✅ Keyword matching (fallback)
- ✅ Video blocking mechanism
- ✅ Settings management

### User Interface
- ✅ Setup wizard styling and behavior
- ✅ Popup interface functionality
- ✅ Options page features
- ✅ Blocked video page layout
- ✅ Loading overlays and feedback

### Error Handling
- ✅ API failure fallbacks
- ✅ Network error handling
- ✅ Invalid input validation
- ✅ Browser compatibility
- ✅ Extension context issues

### Performance
- ✅ Early video detection
- ✅ Navigation interception
- ✅ Memory usage optimization
- ✅ Timeout protection
- ✅ Processing efficiency

## 🐛 Debugging

### Common Issues
1. **Chrome API Access**: Check extension permissions and context
2. **Storage Issues**: Clear `chrome.storage.sync` for fresh testing
3. **Video Detection**: Check YouTube page structure changes
4. **API Failures**: Verify Hugging Face API key and rate limits

### Debug Tools
- Chrome DevTools Console
- Extension Developer Tools
- Network tab for API calls
- Storage inspector for extension data

## 🔄 Continuous Testing

### Before Releases
1. Run complete test suite: `./run-tests.sh`
2. Manual testing on various YouTube page types
3. API connectivity verification
4. Cross-browser compatibility checks
5. Performance testing with various content types

### After Updates
1. Regression testing for existing features
2. New feature specific testing
3. Integration testing
4. User experience validation

## 📝 Adding New Tests

### For New Features
1. Add test cases to `run-tests.sh`
2. Create specific test documentation
3. Update this README
4. Add manual testing procedures

### Test Case Format
```bash
run_test "Test Name" \
    "test_command_here" \
    "expected_pattern_if_needed"
```

## 🤝 Contributing

When adding new tests:
1. Follow existing naming conventions
2. Include both automated and manual testing procedures
3. Document test cases thoroughly
4. Update test coverage information
5. Ensure tests are reproducible and reliable
