# 🎯 RemoveTube - Your YouTube Content Filter

Tired of getting distracted on YouTube? RemoveTube helps you stay focused by only showing content that matters to you. Set your allowed topics, and we'll automatically block anything that doesn't match your goals.

## ✨ What Makes RemoveTube Special

- **Smart Filtering**: We use AI to understand video content and match it with your interests
- **Privacy-Focused**: Your data stays on your device - we only use our server for content analysis
- **Easy to Use**: Set up your topics once, and we'll handle the rest
- **Flexible Control**: Choose between strict or relaxed filtering modes
- **Stay on Track**: See how many distracting videos we've blocked for you
- **Session-Based**: Your settings reset when you leave YouTube, keeping you mindful of your choices

## 🚀 How It Works

1. **First Visit**: When you open YouTube, we'll ask you what topics you want to see
2. **Smart Analysis**: As you browse, we check each video against your topics
3. **Stay Focused**: Videos that don't match your goals are blocked with a friendly explanation
4. **Fresh Start**: Your topics reset when you leave YouTube, helping you stay intentional

## 📱 Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `client` folder
4. Look for the RemoveTube icon in your browser toolbar
5. Visit YouTube to start setting up your content filter

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

## 🛠️ How to Use

### Setting Up Your Topics

1. Click the RemoveTube icon in your browser toolbar
2. Enter the topics you want to see (e.g., "coding, math, science")
3. Choose between strict or relaxed mode:
   - **Strict**: Only shows videos that clearly match your topics
   - **Relaxed**: Allows videos that might be related to your topics

### Managing Your Experience

- **View Stats**: See how many videos we've blocked and allowed
- **Change Topics**: Update your allowed topics anytime
- **Toggle Mode**: Switch between strict and relaxed filtering
- **Disable**: Turn off the extension when you want to browse freely

## 🤝 Support

Having trouble? Here's how to get help:

1. **Check the FAQ**: Look for common questions and answers
2. **Report Issues**: Let us know if something's not working
3. **Feature Requests**: Suggest improvements you'd like to see

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
