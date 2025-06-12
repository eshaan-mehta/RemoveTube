# RemoveTube - YouTube Content Filter

A Chrome extension that filters YouTube content based on user-defined topics using AI-powered classification.

## Core Functionality

- **Content Classification**: AI-based analysis of video metadata against user-defined topics
- **Local Storage**: Browser-based storage for user preferences and session data
- **Real-time Filtering**: Immediate content analysis and blocking on YouTube pages
- **Session Management**: Topic preferences reset on domain exit
- **Usage Analytics**: Local tracking of blocked and allowed content

## Technical Implementation

1. **Content Analysis**:
   - Extracts video title and description metadata
   - Performs semantic analysis against user topics
   - Implements both strict and relaxed classification modes

2. **User Interface**:
   - Setup overlay on YouTube homepage
   - Content blocking interface for filtered videos
   - Extension popup for settings and statistics
   - Options page for advanced configuration

3. **Data Flow**:
   - Client-side content extraction
   - Server-side AI classification
   - Local storage for user preferences
   - Session-based topic management

## Installation

1. Navigate to `chrome://extensions/`
2. Enable Developer mode
3. Select "Load unpacked"
4. Choose the `client` directory
5. The extension will be available in the Chrome toolbar

## 🔒 Privacy Policy

### Data Collection and Usage

RemoveTube is designed with privacy as a core principle. Here's how we handle your data:

#### What We Collect
- **Video Metadata**: We only access the title and description of videos you attempt to watch
- **Allowed Topics**: Your chosen topics for content filtering
- **Usage Statistics**: Basic metrics like number of videos blocked/allowed (stored locally)

#### How We Use Your Data
1. **Content Filtering**: 
   - Video titles and descriptions are analyzed against your allowed topics
   - This data is processed locally and not stored
   - No video content or viewing history is collected

2. **Topic Management**:
   - Your allowed topics are stored locally in your browser
   - Topics are cleared when you leave YouTube
   - No personal preferences are sent to external servers

3. **Usage Statistics**:
   - Basic stats are stored locally in your browser
   - No usage data is sent to external servers
   - Stats are used only to show your productivity metrics

#### Data Storage
- All data is stored locally in your browser using Chrome's storage API
- No data is sent to external servers except for the AI classification requests
- Session data is automatically cleared when you leave YouTube

#### Permissions Justification
- `"*://*.youtube.com/*"`: Required to access video metadata and modify page content
- `"https://removetube-server.onrender.com/*"`: Required for AI-powered content classification
- `"storage"`: Required to store your preferences and usage statistics locally

#### Your Control
- You can clear all stored data at any time through the extension settings
- The extension can be disabled at any time
- No data is collected when the extension is disabled

## Configuration

### Topic Management

1. Access settings via extension popup
2. Define allowed topics (comma-separated)
3. Select classification mode:
   - **Strict**: Higher confidence threshold for matches
   - **Relaxed**: Lower confidence threshold for matches

### Extension Features

- **Content Filtering**: Automatic blocking of non-matching content
- **Topic Configuration**: User-defined topic management
- **Mode Selection**: Strict/relaxed classification options
- **Statistics**: Local tracking of filtered content
- **Session Control**: Automatic topic reset on domain exit

## Technical Support

For technical issues:
1. Check browser console for error messages
2. Verify extension permissions
3. Review server connection status
4. Submit detailed issue reports

## License

This project is licensed under the MIT License - see the LICENSE file for details.
