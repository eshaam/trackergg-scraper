# Contributing to Tracker.gg Scraper

Thank you for your interest in contributing to Tracker.gg Scraper! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- Git
- Apify CLI (optional, for local testing)

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/trackergg-scraper.git
   cd trackergg-scraper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run locally**
   ```bash
   npm start
   ```

## 📝 Contribution Guidelines

### Code Style

- Use ESLint with the project's configuration
- Format code with Prettier
- Follow existing naming conventions
- Use ES modules (import/export)
- Write modern JavaScript (async/await, destructuring)

### Testing

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Check code formatting
npm run format:check

# Format code
npm run format
```

### Before Submitting

1. **Update documentation** - Update README if adding new features
2. **Test thoroughly** - Test with different platforms and games
3. **Validate input** - Ensure new inputs are properly validated
4. **Error handling** - Add appropriate error handling for new features
5. **Schema updates** - Update input/output schemas if needed

## 🎯 Types of Contributions

### 🐛 Bug Reports

When reporting bugs, please include:

- **Input data** that caused the issue
- **Expected vs actual output**
- **Error messages** (if any)
- **Environment details** (Node version, platform, etc.)

### ✨ Feature Requests

- Use clear, descriptive titles
- Describe the use case and benefit
- Consider if it fits the project's scope
- Include example input/output if applicable

### 📚 Documentation

- Fix typos and grammatical errors
- Improve code comments
- Add examples to README
- Update API documentation

### 🔧 Code Contributions

#### Supported Games

To add support for new games:

1. **Update BASE_URLS** in `src/main.js`
2. **Add game-specific selectors** if needed
3. **Update input schema** to include the new game
4. **Test extensively** with various profiles
5. **Update documentation** with game-specific details

#### Platform Support

To add support for new platforms:

1. **Update platform mapping** in `src/main.js`
2. **Test URL construction** for the new platform
3. **Update input schema** enum values
4. **Document platform-specific requirements**

#### AI Extraction

When modifying AI extraction logic:

1. **Test system prompts** thoroughly
2. **Handle extraction failures** gracefully
3. **Validate AI output** structure
4. **Consider token usage** and costs

## 🏗️ Project Structure

```
trackergg-scraper/
├── src/
│   └── main.js              # Main scraper logic
├── .actor/
│   ├── actor.json           # Actor configuration
│   ├── input_schema.json    # Input validation schema
│   ├── output_schema.json   # Output schema definition
│   └── dataset_schema.json  # Dataset schema
├── storage/                 # Local storage (development)
├── package.json            # Dependencies and scripts
├── Dockerfile              # Container configuration
├── README.md               # Project documentation
├── CONTRIBUTING.md          # This file
├── LICENSE                 # ISC License
└── .gitignore             # Git ignore rules
```

## 🔒 Security Considerations

- **Never commit API keys** or sensitive data
- **Validate all user inputs** before processing
- **Handle external service failures** gracefully
- **Consider rate limiting** and fair use policies
- **Sanitize AI outputs** before storage

## 📊 Testing Strategies

### Local Testing

```bash
# Test with sample input
echo '{"players":[{"username":"test","platform":"battlenet","games":["warzone"]}]}' > storage/key_value_stores/default/INPUT.json
npm start
```

### Testing Different Platforms

- Test with various gaming platforms (PSN, Xbox, Battle.net, etc.)
- Test with private vs public profiles
- Test with edge cases (special characters, long usernames)

### AI Extraction Testing

- Test with different profile layouts
- Test extraction accuracy
- Handle AI service failures gracefully
- Monitor token usage

## 🚫 What to Avoid

- **Don't commit secrets** (API keys, credentials)
- **Don't add dependencies** without justification
- **Don't break existing functionality**
- **Don't ignore input validation**
- **Don't increase concurrency** beyond reasonable limits
- **Don't remove error handling**

## 🔄 Release Process

1. **Update version** in package.json
2. **Update CHANGELOG.md** (if exists)
3. **Update README** if needed
4. **Test thoroughly** across platforms
5. **Create pull request**
6. **Review and merge**

## 📝 Pull Request Process

1. **Create feature branch** from main
2. **Make changes** following guidelines
3. **Test thoroughly**
4. **Update documentation**
5. **Create pull request** with:
   - Clear title and description
   - Related issues (if any)
   - Testing instructions
   - Screenshots (if applicable)

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How changes were tested

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Testing completed
```

## 🤝 Community Guidelines

- **Be respectful** and constructive
- **Welcome new contributors**
- **Focus on what is best** for the community
- **Show empathy** towards other community members
- **Provide helpful feedback** on contributions

## 📞 Getting Help

- **Create an issue** for bugs or questions
- **Check existing issues** before creating new ones
- **Join discussions** on existing pull requests
- **Refer to documentation** for common questions

## 📄 Legal Considerations

- **Respect tracker.gg Terms of Service**
- **Don't overload their servers** with requests
- **Handle user data responsibly**
- **Comply with applicable laws** and regulations

---

Thank you for contributing to Tracker.gg Scraper! Your contributions help make this tool better for everyone in the gaming community. 🎮