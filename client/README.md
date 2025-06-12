# RemoveTube: Anti-Procrastination Chrome Extension

RemoveTube helps you stay focused and productive on YouTube by filtering content based on topics that you preselect. Say goodbye to endless scrolling and unintended procrastination!

## Features

- **Smart Content Filtering**: Automatically blocks YouTube videos that don't match your allowed topics
- **Advanced Classification**: Semantic similarity matching using sentence-transformers
- **Privacy First**: All AI processing happens on your local machine - no external API calls
- **Customizable Topics**: Set your own allowed content categories
- **Flexible Modes**: Choose between strict and relaxed filtering
- **Usage Statistics**: Track your productivity with daily stats
- **Easy Setup**: Session-based configuration that appears every time you visit YouTube

## How It Works

1. **Initial Setup**: When you visit YouTube, you'll be prompted to set up your allowed content topics
2. **Content Analysis**: Each video you try to watch is analyzed by the AI server against your allowed topics
3. **Smart Blocking**: Videos that don't match are blocked with a helpful explanation
4. **Session-Based**: Your topics are saved only for the current session and cleared when you leave YouTube

## Installation

### Prerequisites

1. **Start the AI Server**: 
   ```bash
   cd RemoveTube/server
   pip install -r requirements.txt
   python -m uvicorn main:app --host 0.0.0.0 --port 8001
   ```

### Install the Extension

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `client` folder
5. The extension will appear in your browser toolbar
6. Navigate to YouTube.com to start the setup process

## Configuration

### Setting Up Your Allowed Topics

1. Navigate to YouTube.com - the setup wizard will appear automatically
2. Add your allowed topics (comma-separated):
   - Examples: `education, programming, music, cooking, fitness`
3. Choose your filtering strictness
4. Enjoy advanced AI-powered filtering with server-based accuracy!

### Server-Based AI Processing

RemoveTube uses advanced AI models running on a local server:

- **Sentence Transformers**: Uses all-MiniLM-L6-v2 for semantic understanding
- **Vector Embeddings**: Creates high-quality embeddings for content and topics
- **Cosine Similarity**: Accurate similarity matching between content and allowed topics
- **Local Processing**: Runs on your machine - no external API calls
- **Fast Response**: ~50ms classification time for quick filtering

## How to Use

### Basic Usage

1. **Setup**: Configure your allowed topics when you visit YouTube (session-based)
2. **Browse**: Use YouTube normally
3. **Filtering**: Videos not matching your topics will be automatically blocked
4. **Session**: Topics are saved only for your current YouTube session
5. **Override**: Use debug functions in console if needed for testing

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

## Technical Details

### Content Analysis Methods

1. **Server-Based AI Classification**:
   - Uses sentence-transformers/all-MiniLM-L6-v2 for semantic understanding
   - Vector embedding similarity matching
   - Fast and accurate classification (~50ms response time)
   - Runs on local server for privacy

2. **Keyword Matching** (fallback):
   - Simple but effective keyword-based filtering
   - Automatic fallback if AI server is unavailable
   - Matches topics against video titles and descriptions

### Privacy & Security

- **Local Processing**: All AI processing happens on your local server - no external API calls
- **Session Storage**: Topics stored only in browser session storage (cleared when leaving YouTube)
- **No Data Collection**: Extension doesn't collect, store, or transmit any personal data
- **Local Server**: AI models run on your machine for complete privacy
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
- Verify your allowed topics are set correctly in the session
- Check if strict mode is enabled for more aggressive filtering
- Try adding more specific keywords for your allowed content
- Ensure the AI server is running on localhost:8001

**AI server not working:**
- Check that the server is running: `curl http://localhost:8001/health`
- Restart the server: `python -m uvicorn main:app --host 0.0.0.0 --port 8001`
- Check browser console for connection error messages
- Extension will automatically fall back to keyword matching if server fails

**Setup wizard not appearing:**
- Clear session storage using: `clearRemoveTubeStorage()` in browser console
- Refresh the YouTube page
- Check that you're on the YouTube homepage

### Performance Tips

- **Topic Optimization**: Use 3-7 well-chosen topics for best results
- **Server Performance**: FastAPI server provides ~50ms response times
- **Browser Performance**: Extension is optimized for minimal resource usage
- **Session Storage**: Topics cleared automatically when leaving YouTube


### Enjoy!
