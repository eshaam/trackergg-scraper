# Tracker.gg Scraper

A powerful Apify Actor that scrapes player statistics from [tracker.gg](https://tracker.gg) for popular games like Call of Duty: Warzone and Marvel Rivals. Uses AI-powered data extraction to accurately parse gaming statistics.

## ✨ Features

- **Multi-game Support**: Supports Warzone and Marvel Rivals
- **AI-Powered Extraction**: Uses OpenAI GPT-4o for intelligent data parsing
- **Anti-Detection**: Residential proxy support with browser fingerprint protection
- **Robust Navigation**: Dual-strategy approach (direct URL + search fallback)
- **Input Validation**: Comprehensive validation of user inputs
- **Error Handling**: Graceful error handling with detailed logging

## 🎮 Supported Games

- **Call of Duty: Warzone** - K/D ratio, win rate, matches played, rank
- **Marvel Rivals** - Player statistics and performance metrics

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key (for AI-powered data extraction)
- Apify account (for deployment and hosting)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/trackergg-scraper.git
cd trackergg-scraper

# Install dependencies
npm install

# Install Playwright browsers
npm run postinstall
```

### Environment Setup

Create a `.env` file or set environment variables:

```bash
export OPENAI_API_KEY=your_openai_api_key_here
```

### Local Development

```bash
# Run the Actor locally
apify run
```

## 📊 Usage

### Input Schema

The scraper accepts the following input parameters:

```json
{
  "players": [
    {
      "username": "your_gamertag",
      "platform": "psn",  // psn, xbox, battlenet, steam, origin
      "games": ["warzone"],  // warzone, marvel-rivals
      "marvelId": "marvel_id_here"  // Required only for Marvel Rivals
    }
  ],
  "maxConcurrency": 1,  // 1-5 concurrent requests
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "US"
  }
}
```

### Example Input

```json
{
  "players": [
    {
      "username": "ExamplePlayer123",
      "platform": "battlenet",
      "games": ["warzone"]
    },
    {
      "username": "MarvelFan456",
      "platform": "psn",
      "games": ["marvel-rivals"],
      "marvelId": "12345678"
    }
  ],
  "maxConcurrency": 2
}
```

### Output Schema

The scraper produces structured data with the following fields:

```json
{
  "status": "success",
  "game": "warzone",
  "user": "ExamplePlayer123",
  "url": "https://tracker.gg/warzone/profile/battlenet/ExamplePlayer123/overview",
  "stats": {
    "username": "ExamplePlayer123",
    "rank": "Prestige Master",
    "kills": "125,430",
    "matchesPlayed": "892",
    "winRate": "18.4%"
  }
}
```

### Error Output

```json
{
  "status": "failed",
  "game": "warzone",
  "user": "ExamplePlayer123",
  "url": "https://tracker.gg/warzone",
  "error": "Profile not found or private"
}
```

## 🛠️ Configuration

### Platform Mapping

| Input Platform | tracker.gg URL |
|----------------|----------------|
| `psn`, `playstation`, `ps5` | `psn` |
| `xbox`, `xbl` | `xbl` |
| `battlenet`, `pc` | `battlenet` |
| `steam` | `steam` |
| `origin` | `origin` |

### Proxy Configuration

The scraper uses residential proxies by default for anti-bot protection. You can customize proxy settings:

```json
{
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "US"
  }
}
```

## 🏗️ Architecture

### Core Components

1. **Input Validation**: Validates all input parameters before processing
2. **Dual Navigation Strategy**:
   - **Direct URL**: Constructs profile URLs when platform info available
   - **Search Fallback**: Uses search functionality when direct navigation fails
3. **Anti-Detection**: Implements browser fingerprinting and proxy rotation
4. **AI Extraction**: Uses GPT-4o to parse unstructured gaming statistics
5. **Error Handling**: Comprehensive error catching and reporting

### Tech Stack

- **Apify SDK v3** - Cloud platform integration
- **Crawlee** - Web scraping framework
- **Playwright** - Browser automation
- **OpenAI GPT-4o** - AI-powered data extraction
- **Node.js ES Modules** - Modern JavaScript

## 📝 Development

### Scripts

```bash
# Start the scraper
npm start

# Format code
npm run format

# Check code formatting
npm run format:check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests (currently placeholder)
npm test
```

### Code Style

- Uses ESLint with Apify configuration
- Prettier for code formatting
- ES Modules throughout
- Modern JavaScript (async/await, destructuring)

## 🚀 Deployment

### Using Apify CLI

```bash
# Login to Apify
apify login

# Deploy to Apify
apify push
```

### Manual Deployment

1. Connect your Git repository to Apify Console
2. Configure environment variables (`OPENAI_API_KEY`)
3. Build and deploy the Actor

## ⚠️ Limitations & Considerations

### Rate Limiting

- Concurrency limited to 1-5 requests to avoid overwhelming tracker.gg
- Built-in delays between requests
- Residential proxy usage recommended

### AI Extraction

- Requires OpenAI API key (costs apply)
- Limits text input to 50,000 characters per AI request
- May occasionally fail to parse complex layouts

### Platform Support

- Not all platforms may be available for all games
- Some profiles may be private or restricted
- tracker.gg may update their UI, requiring scraper updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and patterns
- Add input validation for new features
- Include error handling for all external requests
- Update documentation for new functionality
- Test with various gaming platforms

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Apify](https://apify.com/) for the excellent scraping platform
- [Crawlee](https://crawlee.dev/) for the powerful scraping framework
- [OpenAI](https://openai.com/) for AI-powered data extraction
- [Tracker.gg](https://tracker.gg/) for the gaming statistics platform

## ⚖️ Disclaimer

This scraper is for educational and legitimate data collection purposes only. Users are responsible for:

- Complying with tracker.gg's Terms of Service
- Respecting rate limits and fair use policies
- Ensuring compliance with applicable laws and regulations
- Any costs incurred from OpenAI API usage

The authors are not responsible for misuse of this tool or any consequences arising from its use.

## 🐛 Support & Issues

If you encounter issues:

1. Check the [Issues](https://github.com/your-username/trackergg-scraper/issues) page
2. Create a new issue with detailed information:
   - Input data used
   - Error messages
   - Expected vs actual output
   - Environment details

---

**Built with ❤️ for the gaming community**