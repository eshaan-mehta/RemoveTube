# 🎯 RemoveTube - Anti-Procrastination Chrome Extension

RemoveTube helps you stay focused and productive on YouTube by filtering content based on your allowed topics. Say goodbye to endless scrolling and unintended procrastination!

## ✨ Features

- **Smart Content Filtering**: Automatically blocks YouTube videos that don't match your allowed topics
- **Browser-Based AI**: Uses cutting-edge AI models that run directly in your browser - no API keys needed!
- **Advanced Classification**: Multiple AI methods including zero-shot classification and semantic similarity
- **Privacy First**: All AI processing happens locally - your data never leaves your browser
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
4. Enjoy advanced AI-powered filtering that works completely offline!

### Browser-Based AI Processing

RemoveTube now uses state-of-the-art AI models that run directly in your browser:

- **Zero-Shot Classification**: Uses DistilBERT for understanding content context
- **Semantic Similarity**: Uses all-MiniLM-L6-v2 for finding topic relationships  
- **Hierarchical Analysis**: Smart two-stage classification for better accuracy
- **Complete Privacy**: All AI processing happens locally - no data sent to external servers
- **No Setup Required**: No API keys, accounts, or configuration needed!

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

1. **Browser-Based AI Classification**:
   - Uses DistilBERT and all-MiniLM-L6-v2 models via Transformers.js
   - Hierarchical classification: title first, then full content
   - Semantic similarity matching for better topic understanding
   - Runs completely offline in your browser

2. **Keyword Matching** (fallback):
   - Simple but effective keyword-based filtering
   - Automatic fallback if AI models fail to load
   - Matches topics against video titles and descriptions

### Privacy & Security

- **Complete Privacy**: All AI processing happens in your browser - no external API calls
- **Local Storage**: All settings stored locally in Chrome's storage
- **No Data Collection**: Extension doesn't collect, store, or transmit any personal data
- **Offline Operation**: Works completely offline once models are loaded
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
- Wait for AI models to load on first use (may take a moment)

**AI models not loading:**
- Ensure you have a stable internet connection for initial model download
- Check browser console for any error messages
- Try refreshing the page if models fail to load
- Extension will automatically fall back to keyword matching if AI fails

### Performance Tips

- **Topic Optimization**: Use 3-7 well-chosen topics for best results
- **First Load**: AI models download on first use - subsequent loads are instant
- **Browser Performance**: Extension is optimized for minimal resource usage
- **Model Caching**: AI models are cached locally for fast repeated use

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

- **Transformers.js**: For enabling browser-based AI with excellent models
- **Hugging Face**: For providing the DistilBERT and all-MiniLM-L6-v2 models
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
