# 🎯 RemoveTube - Anti-Procrastination Chrome Extension

RemoveTube helps you stay focused and productive on YouTube by filtering content based on your allowed topics. Say goodbye to endless scrolling and unintended procrastination!

## ✨ Features

- **Smart Content Filtering**: Automatically blocks YouTube videos that don't match your allowed topics
- **AI-Powered Classification**: Uses Hugging Face's BART model for accurate content categorization
- **Fallback Keyword Matching**: Works even without an API key using simple keyword matching
- **Customizable Topics**: Set your own allowed content categories
- **Flexible Modes**: Choose between strict and relaxed filtering
- **Usage Statistics**: Track your productivity with daily stats
- **Easy Setup**: One-time configuration with an intuitive interface

## 🚀 How It Works

1. **Initial Setup**: When you first visit YouTube, you'll be prompted to set up your allowed content topics
2. **Content Analysis**: Each video you try to watch is analyzed against your allowed topics
3. **Smart Blocking**: Videos that don't match are blocked with a helpful explanation
4. **Productivity Boost**: Stay focused on content that aligns with your goals

## 📋 Installation

### Option 1: Load as Unpacked Extension (Developer Mode)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `client` folder
5. The extension will appear in your browser toolbar

### Option 2: Build for Production

```bash
# Navigate to the project directory
cd RemoveTube/client

# The extension is ready to use as-is, no build step required
```

## ⚙️ Configuration

### Setting Up Your Allowed Topics

1. Click the RemoveTube extension icon in your toolbar
2. Click "Settings" or complete the initial setup
3. Add your allowed topics (comma-separated):
   - Examples: `education, programming, music, cooking, fitness`
   - Use preset buttons for quick setup
4. Optionally add your Hugging Face API key for enhanced filtering

### Hugging Face API Key (Optional but Recommended)

For more accurate content classification:

1. Visit [Hugging Face](https://huggingface.co/settings/tokens)
2. Create a free account and generate an API token
3. Add the token to your RemoveTube settings
4. Enjoy more precise content filtering!

## 🛠️ How to Use

### Basic Usage

1. **Setup**: Configure your allowed topics when prompted
2. **Browse**: Use YouTube normally
3. **Filtering**: Videos not matching your topics will be automatically blocked
4. **Override**: Use the extension popup to temporarily disable filtering if needed

### Managing Settings

- **Extension Popup**: Quick access to enable/disable and view stats
- **Options Page**: Full configuration including topics, API key, and advanced settings
- **Statistics**: Track your daily blocked/allowed video counts

### Preset Topic Categories

Choose from predefined topic sets:

- 📚 **Study & Learning**: education, programming, science, tutorials
- 🎵 **Music Only**: music, instrumental, classical, ambient
- 💪 **Health & Fitness**: exercise, workout, nutrition, yoga
- 🍳 **Cooking**: recipes, baking, food preparation
- 🧘 **Mindfulness**: meditation, relaxation, sleep sounds
- 📰 **News**: current events, politics, economics

## 🔧 Technical Details

### Content Analysis Methods

1. **AI Classification** (with API key):
   - Uses Facebook's BART-large-mnli model via Hugging Face
   - Analyzes video title and description
   - Provides confidence scores for filtering decisions

2. **Keyword Matching** (fallback):
   - Simple but effective keyword-based filtering
   - Works offline without external API calls
   - Matches topics against video titles and descriptions

### Privacy & Security

- **Local Storage**: All settings stored locally in Chrome's storage
- **No Data Collection**: Extension doesn't collect or transmit personal data
- **API Usage**: Hugging Face API only receives video titles/descriptions for classification
- **Open Source**: Full source code available for transparency

## 📊 Statistics & Insights

Track your productivity with built-in statistics:

- **Daily Counts**: Videos blocked and allowed today
- **Total Counts**: Lifetime statistics
- **Streak Counter**: Days of consistent usage
- **Topic Insights**: See which topics are most commonly matched

## 🎛️ Advanced Configuration

### Strict vs. Relaxed Mode

- **Strict Mode**: Blocks videos when classification confidence is low
- **Relaxed Mode**: Allows videos with uncertain classification
- **Recommendation**: Start with strict mode, adjust based on your needs

### Custom Topic Strategies

- **Broad Topics**: Use general terms like "education" for wider coverage
- **Specific Topics**: Use precise terms like "JavaScript programming" for focused filtering
- **Multiple Approaches**: Combine both broad and specific topics for balanced filtering

## 🐛 Troubleshooting

### Common Issues

**Extension not working on YouTube:**
- Refresh the YouTube page after installation
- Check that the extension is enabled in `chrome://extensions/`
- Ensure you've completed the initial setup

**Videos not being blocked:**
- Verify your allowed topics are set correctly
- Check if strict mode is enabled for more aggressive filtering
- Try adding more specific keywords for your allowed content

**API key not working:**
- Ensure your Hugging Face API key is valid and active
- Check your API usage limits on Hugging Face dashboard
- The extension will fall back to keyword matching if API fails

### Performance Tips

- **Topic Optimization**: Use 3-7 well-chosen topics for best results
- **API Limits**: Monitor your Hugging Face API usage to avoid rate limits
- **Browser Performance**: The extension is lightweight but processes each video page load

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Bugs**: Use GitHub issues to report problems
2. **Suggest Features**: Share ideas for new functionality
3. **Submit PRs**: Contribute code improvements
4. **Documentation**: Help improve this README and inline docs

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/RemoveTube.git
cd RemoveTube/client

# Load in Chrome as unpacked extension
# Make changes and reload extension for testing
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hugging Face**: For providing the excellent BART-large-mnli model
- **Chrome Extension APIs**: For enabling seamless browser integration
- **Open Source Community**: For inspiration and best practices

## 📞 Support

Need help? Have questions?

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/RemoveTube/issues)
- **Documentation**: Check this README for common solutions
- **Community**: Join discussions in GitHub Discussions

---

**Stay focused, stay productive!** 🎯

Made with ❤️ for anyone trying to use YouTube more intentionally.
